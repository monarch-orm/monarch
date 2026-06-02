import type {
  Abortable,
  AbstractCursor,
  FindOptions,
  Collection as MongoCollection,
  Filter as MongoFilter,
  Sort as MongoSort,
} from "mongodb";
import type { AnyRelation } from "../../relations/relations";
import type { InferRelationObjectPopulation, Population } from "../../relations/type-helpers";
import { type AnySchema, Schema } from "../../schema/schema";
import type { Filter, InferSchemaData, InferSchemaOmit, InferSchemaOutput } from "../../schema/type-helpers";
import type { TrueKeys } from "../../utils/type-helpers";
import { addPipelineMetas, addPopulations, expandPopulations, getSortDirection } from "../population";
import { addExtraInputsToProjection, makeProjection } from "../projection";
import type { PipelineStage } from "../types/pipeline-stage";
import type { BoolProjection, Projection, Sort } from "../types/query-options";
import { Query, type QueryOutput } from "./base";

export type FindQueryOptions = Omit<FindOptions, "projection"> & Abortable;

/**
 * Collection.find().
 */
export class FindQuery<
  TSchema extends AnySchema,
  TRelations extends Record<string, Record<string, AnyRelation>>,
  TPopulate extends Record<string, any> = {},
  TOutput = InferSchemaOutput<TSchema>,
  TOmit extends ["omit" | "select", keyof any] = ["omit", InferSchemaOmit<TSchema>],
> extends Query<TSchema, QueryOutput<TOutput, TOmit, TPopulate>[]> {
  private _projection: Projection<InferSchemaOutput<TSchema>>;
  private _population: Population<TRelations, TSchema["name"]> = {};

  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _relations: TRelations,
    private _filter: Filter<TSchema>,
    private _options: FindOptions = {},
  ) {
    super(schema, collection, readyPromise);
    this._projection = makeProjection("omit", Schema.options(schema).omit ?? {});
  }

  /**
   * Adds find options. Options are merged into existing options.
   *
   * @param options - FindQueryOptions
   * @returns FindQuery instance
   */
  public options(options: FindQueryOptions): this {
    const query = new FindQuery(this.schema, this.collection, this.readyPromise, this._relations, this._filter, {
      ...this._options,
      ...options,
    });
    query._projection = this._projection;
    query._population = this._population;
    return query as unknown as this;
  }

  /**
   * Sets sort order for results.
   *
   * @param sort - Sort specification
   * @returns FindQuery instance
   */
  public sort(sort: Sort<InferSchemaData<TSchema>>): this {
    const query = new FindQuery(this.schema, this.collection, this.readyPromise, this._relations, this._filter, {
      ...this._options,
      sort: sort as MongoSort,
    });
    query._projection = this._projection;
    query._population = this._population;
    return query as unknown as this;
  }

  /**
   * Sets maximum number of documents to return.
   *
   * @param limit - Maximum documents
   * @returns FindQuery instance
   */
  public limit(limit: number): this {
    const query = new FindQuery(this.schema, this.collection, this.readyPromise, this._relations, this._filter, {
      ...this._options,
      limit,
    });
    query._projection = this._projection;
    query._population = this._population;
    return query as unknown as this;
  }

  /**
   * Sets number of documents to skip.
   *
   * @param skip - Number to skip
   * @returns FindQuery instance
   */
  public skip(skip: number): this {
    const query = new FindQuery(this.schema, this.collection, this.readyPromise, this._relations, this._filter, {
      ...this._options,
      skip,
    });
    query._projection = this._projection;
    query._population = this._population;
    return query as unknown as this;
  }

  /**
   * Sets fields to exclude from results.
   *
   * @param projection - Fields to exclude
   * @returns FindQuery instance
   */
  public omit<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    const query = new FindQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._relations,
      this._filter,
      this._options,
    );
    query._projection = makeProjection("omit", projection);
    query._population = this._population;
    return query as unknown as FindQuery<TSchema, TRelations, TPopulate, TOutput, ["omit", TrueKeys<TProjection>]>;
  }

  /**
   * Sets fields to include in results.
   *
   * @param projection - Fields to include
   * @returns FindQuery instance
   */
  public select<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    const query = new FindQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._relations,
      this._filter,
      this._options,
    );
    query._projection = makeProjection("select", projection);
    query._population = this._population;
    return query as unknown as FindQuery<TSchema, TRelations, TPopulate, TOutput, ["select", TrueKeys<TProjection>]>;
  }

  /**
   * Sets relations to populate in results.
   *
   * @param population - Relation population config
   * @returns FindQuery instance
   */
  public populate<TPopulation extends Population<TRelations, TSchema["name"]>>(population: TPopulation) {
    const query = new FindQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._relations,
      this._filter,
      this._options,
    );
    query._projection = this._projection;
    query._population = population;
    return query as unknown as FindQuery<
      TSchema,
      TRelations,
      InferRelationObjectPopulation<TRelations, TSchema["name"], TPopulation>,
      TOutput,
      TOmit
    >;
  }

  /**
   * Returns MongoDB cursor for result iteration.
   *
   * @returns AbstractCursor
   */
  public async cursor(): Promise<AbstractCursor<QueryOutput<TOutput, TOmit, TPopulate>>> {
    await this.readyPromise;
    if (Object.keys(this._population).length) {
      return this.execWithPopulate();
    }
    return this.execWithoutPopulate();
  }

  protected async exec(): Promise<QueryOutput<TOutput, TOmit, TPopulate>[]> {
    return (await this.cursor()).toArray();
  }

  private execWithoutPopulate(): AbstractCursor<QueryOutput<TOutput, TOmit, TPopulate>> {
    const extras = addExtraInputsToProjection(this._projection, Schema.options(this.schema).virtuals);
    const res = this.collection
      .find(this._filter as MongoFilter<InferSchemaData<TSchema>>, { ...this._options, projection: this._projection })
      .map(
        (doc) =>
          Schema.output(
            this.schema,
            doc as InferSchemaData<TSchema>,
            this._projection,
            extras,
          ) as unknown as QueryOutput<TOutput, TOmit, TPopulate>,
      );
    return res;
  }

  private execWithPopulate(): AbstractCursor<QueryOutput<TOutput, TOmit, TPopulate>> {
    const pipeline: PipelineStage<InferSchemaOutput<TSchema>>[] = [
      // @ts-ignore
      { $match: this._filter },
    ];
    const extras = addExtraInputsToProjection(this._projection, Schema.options(this.schema).virtuals, this._population);
    if (Object.keys(this._projection).length) {
      // @ts-ignore
      pipeline.push({ $project: this._projection });
    }

    const populations = addPopulations(pipeline, {
      relations: this._relations,
      population: this._population,
      schema: this.schema,
    });

    addPipelineMetas(pipeline, {
      limit: this._options.limit,
      skip: this._options.skip,
      sort: getSortDirection(this._options.sort),
    });

    const res = this.collection.aggregate(pipeline).map(
      (doc) =>
        expandPopulations({
          populations,
          projection: this._projection,
          extras,
          schema: this.schema,
          doc,
        }) as QueryOutput<TOutput, TOmit, TPopulate>,
    );
    return res;
  }
}
