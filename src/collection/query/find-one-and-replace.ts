import type {
  FindOneAndReplaceOptions,
  Collection as MongoCollection,
  Filter as MongoFilter,
  WithoutId,
} from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type {
  Filter,
  InferSchemaData,
  InferSchemaInput,
  InferSchemaOmit,
  InferSchemaOutput,
} from "../../schema/type-helpers";
import type { TrueKeys } from "../../utils/type-helpers";
import { addExtraInputsToProjection, makeProjection } from "../projection";
import type { BoolProjection, Projection } from "../types/query-options";
import { Query, type QueryOutput } from "./base";

export type FindOneAndReplaceQueryOptions = Omit<FindOneAndReplaceOptions, "projection">;

/**
 * Collection.findOneAndReplace().
 */
export class FindOneAndReplaceQuery<
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
    private _replacement: WithoutId<InferSchemaInput<TSchema>>,
    private _options: FindOneAndReplaceOptions = {},
  ) {
    super(schema, collection, readyPromise);
    this._projection = makeProjection("omit", Schema.options(schema).omit ?? {});
  }

  /**
   * Adds replace options. Options are merged into existing options.
   *
   * @param options - FindOneAndReplaceQueryOptions
   * @returns FindOneAndReplaceQuery instance
   */
  public options(options: FindOneAndReplaceQueryOptions): this {
    const query = new FindOneAndReplaceQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._filter,
      this._replacement,
      { ...this._options, ...options },
    );
    query._projection = this._projection;
    return query as this;
  }

  /**
   * Excludes fields from results.
   *
   * @param projection - Fields to exclude
   * @returns FindOneAndReplaceQuery instance
   */
  public omit<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    const query = new FindOneAndReplaceQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._filter,
      this._replacement,
      this._options,
    );
    query._projection = makeProjection("omit", projection);
    return query as FindOneAndReplaceQuery<TSchema, TOutput, ["omit", TrueKeys<TProjection>]>;
  }

  /**
   * Includes only specified fields in results.
   *
   * @param projection - Fields to include
   * @returns FindOneAndReplaceQuery instance
   */
  public select<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    const query = new FindOneAndReplaceQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this._filter,
      this._replacement,
      this._options,
    );
    query._projection = makeProjection("select", projection);
    return query as FindOneAndReplaceQuery<TSchema, TOutput, ["select", TrueKeys<TProjection>]>;
  }

  protected async exec(): Promise<QueryOutput<TOutput, TOmit> | null> {
    const extras = addExtraInputsToProjection(this._projection, Schema.options(this.schema).virtuals);
    const replacement = Schema.input(this.schema, this._replacement as InferSchemaInput<TSchema>);
    const res = await this.collection.findOneAndReplace(
      this._filter as MongoFilter<InferSchemaData<TSchema>>,
      replacement,
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
