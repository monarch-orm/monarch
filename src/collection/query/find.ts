import type {
  AbstractCursor,
  Filter,
  FindOptions,
  Collection as MongoCollection,
  Sort as MongoSort,
} from "mongodb";
import type { AnyRelations } from "../../relations/relations";
import type {
  InferRelationObjectPopulation,
  Population,
} from "../../relations/type-helpers";
import { type AnySchema, Schema } from "../../schema/schema";
import type {
  InferSchemaData,
  InferSchemaOmit,
  InferSchemaOutput,
} from "../../schema/type-helpers";
import type { TrueKeys } from "../../type-helpers";
import type { PipelineStage } from "../types/pipeline-stage";
import type { BoolProjection, Projection, Sort } from "../types/query-options";
import {
  addPipelineMetas,
  definePopulations,
  expandPopulations,
  getSortDirection,
} from "../utils/population";
import {
  addExtraInputsToProjection,
  makeProjection,
} from "../utils/projection";
import { Query, type QueryOutput } from "./base";

export class FindQuery<
  TSchema extends AnySchema,
  TDbRelations extends Record<string, AnyRelations>,
  TPopulate extends Record<string, any> = {},
  TOutput = InferSchemaOutput<TSchema>,
  TOmit extends ["omit" | "select", keyof any] = [
    "omit",
    InferSchemaOmit<TSchema>,
  ],
> extends Query<TSchema, QueryOutput<TOutput, TOmit, TPopulate>[]> {
  private _projection: Projection<InferSchemaOutput<TSchema>>;
  private _population: Population<TDbRelations, TSchema["name"]> = {};

  constructor(
    protected _schema: TSchema,
    protected _relations: TDbRelations,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    private _filter: Filter<InferSchemaData<TSchema>>,
    private _options: FindOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
    this._projection = makeProjection("omit", _schema.options.omit ?? {});
  }

  protected get relations() {
    return this._relations[this._schema.name] as TDbRelations[TSchema["name"]];
  }

  public options(options: FindOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  public sort(sort: Sort<InferSchemaOutput<TSchema>>): this {
    this._options.sort = sort as MongoSort;
    return this;
  }

  public limit(limit: number): this {
    this._options.limit = limit;
    return this;
  }

  public skip(skip: number): this {
    this._options.skip = skip;
    return this;
  }

  public omit<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(
    projection: TProjection,
  ) {
    this._projection = makeProjection("omit", projection);
    return this as FindQuery<
      TSchema,
      TDbRelations,
      TPopulate,
      TOutput,
      ["omit", TrueKeys<TProjection>]
    >;
  }

  public select<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(
    projection: TProjection,
  ) {
    this._projection = makeProjection("select", projection);
    return this as FindQuery<
      TSchema,
      TDbRelations,
      TPopulate,
      TOutput,
      ["select", TrueKeys<TProjection>]
    >;
  }

  public populate<
    TPopulation extends Population<TDbRelations, TSchema["name"]>,
  >(population: TPopulation) {
    this._population = population;
    return this as FindQuery<
      TSchema,
      TDbRelations,
      InferRelationObjectPopulation<TDbRelations, TSchema["name"], TPopulation>,
      TOutput,
      TOmit
    >;
  }

  public async cursor(): Promise<
    AbstractCursor<QueryOutput<TOutput, TOmit, TPopulate>>
  > {
    await this._readyPromise;
    if (Object.keys(this._population).length) {
      return this._execWithPopulate();
    }
    return this._execWithoutPopulate();
  }

  public async exec(): Promise<QueryOutput<TOutput, TOmit, TPopulate>[]> {
    return (await this.cursor()).toArray();
  }

  private _execWithoutPopulate(): AbstractCursor<
    QueryOutput<TOutput, TOmit, TPopulate>
  > {
    const extra = addExtraInputsToProjection(
      this._projection,
      this._schema.options.virtuals,
    );
    const res = this._collection
      .find(this._filter, { ...this._options, projection: this._projection })
      .map(
        (doc) =>
          Schema.fromData(
            this._schema,
            doc as InferSchemaData<TSchema>,
            this._projection,
            extra,
          ) as QueryOutput<TOutput, TOmit, TPopulate>,
      );
    return res;
  }

  private _execWithPopulate(): AbstractCursor<
    QueryOutput<TOutput, TOmit, TPopulate>
  > {
    const pipeline: PipelineStage<InferSchemaOutput<TSchema>>[] = [
      // @ts-ignore
      { $match: this._filter },
    ];
    const extras = addExtraInputsToProjection(
      this._projection,
      this._schema.options.virtuals,
      this._population,
    );
    if (Object.keys(this._projection).length) {
      // @ts-ignore
      pipeline.push({ $project: this._projection });
    }

    const populations = definePopulations(
      this._population,
      this.relations,
      this._relations,
      pipeline,
    );

    addPipelineMetas(pipeline, {
      limit: this._options.limit,
      skip: this._options.skip,
      sort: getSortDirection(this._options.sort),
    });

    const res = this._collection
      .aggregate(pipeline)
      .map(
        (doc) =>
          expandPopulations(
            populations,
            this._projection,
            extras,
            this._schema,
            doc,
          ) as QueryOutput<TOutput, TOmit, TPopulate>,
      );
    return res;
  }
}
