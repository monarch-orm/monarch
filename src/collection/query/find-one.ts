import type { Abortable, FindOptions, Collection as MongoCollection, Filter as MongoFilter } from "mongodb";
import type { AnyRelation } from "../../relations/relations";
import type { InferRelationObjectPopulation, Population } from "../../relations/type-helpers";
import { type AnySchema, Schema } from "../../schema/schema";
import type { Filter, InferSchemaData, InferSchemaOmit, InferSchemaOutput } from "../../schema/type-helpers";
import type { TrueKeys } from "../../utils/type-helpers";
import { addPipelineMetas, addPopulations, expandPopulations, getSortDirection } from "../population";
import { addExtraInputsToProjection, makeProjection } from "../projection";
import type { PipelineStage } from "../types/pipeline-stage";
import type { BoolProjection, Projection } from "../types/query-options";
import { Query, type QueryOutput } from "./base";

export type FindOneQueryOptions = Omit<FindOptions, "projection" | "timeoutMode"> & Abortable;

/**
 * Collection.findOne().
 */
export class FindOneQuery<
  TSchema extends AnySchema,
  TRelations extends Record<string, Record<string, AnyRelation>>,
  TPopulate extends Record<string, any> = {},
  TOutput = InferSchemaOutput<TSchema>,
  TOmit extends ["omit" | "select", keyof any] = ["omit", InferSchemaOmit<TSchema>],
> extends Query<TSchema, QueryOutput<TOutput, TOmit, TPopulate> | null> {
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
   * @param options - FindOneQueryOptions
   * @returns FindOneQuery instance
   */
  public options(options: FindOneQueryOptions): this {
    const query = new FindOneQuery(this.schema, this.collection, this.readyPromise, this._relations, this._filter, {
      ...this._options,
      ...options,
    });
    query._projection = this._projection;
    query._population = this._population;
    return query as this;
  }

  /**
   * Excludes fields from results.
   *
   * @param projection - Fields to exclude
   * @returns FindOneQuery instance
   */
  public omit<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    const query = new FindOneQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._relations,
      this._filter,
      this._options,
    );
    query._projection = makeProjection("omit", projection);
    query._population = this._population;
    return query as FindOneQuery<TSchema, TRelations, TPopulate, TOutput, ["omit", TrueKeys<TProjection>]>;
  }

  /**
   * Includes only specified fields in results.
   *
   * @param projection - Fields to include
   * @returns FindOneQuery instance
   */
  public select<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    const query = new FindOneQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._relations,
      this._filter,
      this._options,
    );
    query._projection = makeProjection("select", projection);
    query._population = this._population;
    return query as FindOneQuery<TSchema, TRelations, TPopulate, TOutput, ["select", TrueKeys<TProjection>]>;
  }

  /**
   * Populates relations.
   *
   * @param population - Relation population config
   * @returns FindOneQuery instance
   */
  public populate<TPopulation extends Population<TRelations, TSchema["name"]>>(population: TPopulation) {
    const query = new FindOneQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._relations,
      this._filter,
      this._options,
    );
    query._projection = this._projection;
    query._population = population;
    return query as FindOneQuery<
      TSchema,
      TRelations,
      InferRelationObjectPopulation<TRelations, TSchema["name"], TPopulation>,
      TOutput,
      TOmit
    >;
  }

  protected async exec(): Promise<QueryOutput<TOutput, TOmit, TPopulate> | null> {
    if (Object.keys(this._population).length) {
      return this.execWithPopulate();
    }
    return this.execWithoutPopulate();
  }

  private async execWithoutPopulate(): Promise<QueryOutput<TOutput, TOmit, TPopulate> | null> {
    const extras = addExtraInputsToProjection(this._projection, Schema.options(this.schema).virtuals);
    const res = await this.collection.findOne(this._filter as MongoFilter<InferSchemaData<TSchema>>, {
      ...this._options,
      projection: this._projection,
    });
    return res
      ? (Schema.output(
          this.schema,
          res as InferSchemaData<TSchema>,
          this._projection,
          extras,
        ) as unknown as QueryOutput<TOutput, TOmit, TPopulate>)
      : res;
  }

  private async execWithPopulate(): Promise<QueryOutput<TOutput, TOmit, TPopulate> | null> {
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
      skip: this._options.skip,
      sort: getSortDirection(this._options.sort),
    });

    const res = await this.collection
      .aggregate(pipeline)
      .map(
        (doc) =>
          expandPopulations({
            populations,
            projection: this._projection,
            extras,
            schema: this.schema,
            doc,
          }) as QueryOutput<TOutput, TOmit, TPopulate>,
      )
      .next();
    return res;
  }
}
