import type {
  FindOneAndUpdateOptions,
  Collection as MongoCollection,
  Filter as MongoFilter,
  Sort as MongoSort,
  UpdateFilter as MongoUpdateFilter,
} from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type {
  Filter,
  InferSchemaData,
  InferSchemaOmit,
  InferSchemaOutput,
  UpdateFilter,
} from "../../schema/type-helpers";
import type { TrueKeys } from "../../utils/type-helpers";
import { addExtraInputsToProjection, makeProjection } from "../projection";
import type { BoolProjection, Projection, Sort } from "../types/query-options";
import { Query, type QueryOutput } from "./base";

export type FindOneAndUpdateQueryOptions = Omit<FindOneAndUpdateOptions, "projection">;

/**
 * Collection.findOneAndUpdate().
 */
export class FindOneAndUpdateQuery<
  TSchema extends AnySchema,
  TOutput = InferSchemaOutput<TSchema>,
  TOmit extends ["omit" | "select", keyof any] = ["omit", InferSchemaOmit<TSchema>],
> extends Query<TSchema, QueryOutput<TOutput, TOmit> | null> {
  private _projection: Projection<InferSchemaOutput<TSchema>>;

  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _filter: Filter<TSchema>,
    private _update: UpdateFilter<TSchema>,
    private _options: FindOneAndUpdateOptions = {},
  ) {
    super(schema, collection, readyPromise);
    this._projection = makeProjection("omit", Schema.options(schema).omit ?? {});
  }

  /**
   * Adds update options. Options are merged into existing options.
   *
   * @param options - FindOneAndUpdateQueryOptions
   * @returns FindOneAndUpdateQuery instance
   */
  public options(options: FindOneAndUpdateQueryOptions): this {
    const query = new FindOneAndUpdateQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._filter,
      this._update,
      {
        ...this._options,
        ...options,
      },
    );
    query._projection = this._projection;
    return query as this;
  }

  /**
   * Sets sort order to determine which document is updated when multiple match.
   *
   * @param sort - Sort specification
   * @returns FindOneAndUpdateQuery instance
   */
  public sort(sort: Sort<InferSchemaData<TSchema>>): this {
    const query = new FindOneAndUpdateQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._filter,
      this._update,
      { ...this._options, sort: sort as MongoSort },
    );
    query._projection = this._projection;
    return query as this;
  }

  /**
   * Excludes fields from results.
   *
   * @param projection - Fields to exclude
   * @returns FindOneAndUpdateQuery instance
   */
  public omit<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    const query = new FindOneAndUpdateQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._filter,
      this._update,
      this._options,
    );
    query._projection = makeProjection("omit", projection);
    return query as FindOneAndUpdateQuery<TSchema, TOutput, ["omit", TrueKeys<TProjection>]>;
  }

  /**
   * Includes only specified fields in results.
   *
   * @param projection - Fields to include
   * @returns FindOneAndUpdateQuery instance
   */
  public select<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    const query = new FindOneAndUpdateQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._filter,
      this._update,
      this._options,
    );
    query._projection = makeProjection("select", projection);
    return query as FindOneAndUpdateQuery<TSchema, TOutput, ["select", TrueKeys<TProjection>]>;
  }

  protected async exec(): Promise<QueryOutput<TOutput, TOmit> | null> {
    const update = Schema.updateInput(this.schema, this._update, this._options.upsert ?? false);

    const extras = addExtraInputsToProjection(this._projection, Schema.options(this.schema).virtuals);
    const res = await this.collection.findOneAndUpdate(
      this._filter as MongoFilter<InferSchemaData<TSchema>>,
      update as MongoUpdateFilter<InferSchemaData<TSchema>>,
      {
        ...this._options,
        projection: this._projection,
      },
    );
    return res
      ? (Schema.output(
          this.schema,
          res as InferSchemaData<TSchema>,
          this._projection,
          extras,
        ) as unknown as QueryOutput<TOutput, TOmit>)
      : res;
  }
}
