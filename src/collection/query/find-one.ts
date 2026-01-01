import type { Filter, FindOptions, Collection as MongoCollection } from "mongodb";
import type { AnyRelations } from "../../relations/relations";
import type { InferRelationObjectPopulation, Population } from "../../relations/type-helpers";
import { type AnySchema, Schema } from "../../schema/schema";
import type { InferSchemaData, InferSchemaOmit, InferSchemaOutput } from "../../schema/type-helpers";
import type { TrueKeys } from "../../utils/type-helpers";
import type { PipelineStage } from "../types/pipeline-stage";
import type { BoolProjection, Projection } from "../types/query-options";
import { addPipelineMetas, addPopulations, expandPopulations, getSortDirection } from "../utils/population";
import { addExtraInputsToProjection, makeProjection } from "../utils/projection";
import { Query, type QueryOutput } from "./base";

export class FindOneQuery<
  TSchema extends AnySchema,
  TDbRelations extends Record<string, AnyRelations>,
  TPopulate extends Record<string, any> = {},
  TOutput = InferSchemaOutput<TSchema>,
  TOmit extends ["omit" | "select", keyof any] = ["omit", InferSchemaOmit<TSchema>],
> extends Query<TSchema, QueryOutput<TOutput, TOmit, TPopulate> | null> {
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

  public options(options: FindOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  public omit<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    this._projection = makeProjection("omit", projection);
    return this as FindOneQuery<TSchema, TDbRelations, TPopulate, TOutput, ["omit", TrueKeys<TProjection>]>;
  }

  public select<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    this._projection = makeProjection("select", projection);
    return this as FindOneQuery<TSchema, TDbRelations, TPopulate, TOutput, ["select", TrueKeys<TProjection>]>;
  }

  public populate<TPopulation extends Population<TDbRelations, TSchema["name"]>>(population: TPopulation) {
    this._population = population;
    return this as FindOneQuery<
      TSchema,
      TDbRelations,
      InferRelationObjectPopulation<TDbRelations, TSchema["name"], TPopulation>,
      TOutput,
      TOmit
    >;
  }

  protected async exec(): Promise<QueryOutput<TOutput, TOmit, TPopulate> | null> {
    await this._readyPromise;
    if (Object.keys(this._population).length) {
      return this._execWithPopulate();
    }
    return this._execWithoutPopulate();
  }

  private async _execWithoutPopulate(): Promise<QueryOutput<TOutput, TOmit, TPopulate> | null> {
    const extras = addExtraInputsToProjection(this._projection, this._schema.options.virtuals);
    const res = await this._collection.findOne(this._filter, {
      ...this._options,
      projection: this._projection,
    });
    return res
      ? (Schema.decode(this._schema, res as InferSchemaData<TSchema>, this._projection, extras) as QueryOutput<
          TOutput,
          TOmit,
          TPopulate
        >)
      : res;
  }

  private async _execWithPopulate(): Promise<QueryOutput<TOutput, TOmit, TPopulate> | null> {
    const pipeline: PipelineStage<InferSchemaOutput<TSchema>>[] = [
      // @ts-ignore
      { $match: this._filter },
    ];
    const extras = addExtraInputsToProjection(this._projection, this._schema.options.virtuals, this._population);
    if (Object.keys(this._projection).length) {
      // @ts-ignore
      pipeline.push({ $project: this._projection });
    }

    const populations = addPopulations(pipeline, {
      relations: this._relations,
      population: this._population,
      schema: this._schema,
    });

    addPipelineMetas(pipeline, {
      limit: this._options.limit,
      skip: this._options.skip,
      sort: getSortDirection(this._options.sort),
    });

    const res = await this._collection
      .aggregate(pipeline)
      .map(
        (doc) =>
          expandPopulations({
            populations,
            projection: this._projection,
            extras,
            schema: this._schema,
            doc,
          }) as QueryOutput<TOutput, TOmit, TPopulate>,
      )
      .next();
    return res;
  }
}
