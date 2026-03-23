import type { Filter as MongoFilter, FindOneAndReplaceOptions, Collection as MongoCollection, WithoutId } from "mongodb";
import type { Filter } from "../../schema/filter-types";
import { type AnySchema, Schema } from "../../schema/schema";
import type { InferSchemaData, InferSchemaInput, InferSchemaOmit, InferSchemaOutput } from "../../schema/type-helpers";
import type { TrueKeys } from "../../utils/type-helpers";
import type { BoolProjection, Projection } from "../types/query-options";
import { addExtraInputsToProjection, makeProjection } from "../utils/projection";
import { Query, type QueryOutput } from "./base";

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
   * @param options - FindOneAndReplaceOptions
   * @returns FindOneAndReplaceQuery instance
   */
  public options(options: FindOneAndReplaceOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  /**
   * Excludes fields from results.
   *
   * @param projection - Fields to exclude
   * @returns FindOneAndReplaceQuery instance
   */
  public omit<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    this._projection = makeProjection("omit", projection);
    return this as FindOneAndReplaceQuery<TSchema, TOutput, ["omit", TrueKeys<TProjection>]>;
  }

  /**
   * Includes only specified fields in results.
   *
   * @param projection - Fields to include
   * @returns FindOneAndReplaceQuery instance
   */
  public select<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(projection: TProjection) {
    this._projection = makeProjection("select", projection);
    return this as FindOneAndReplaceQuery<TSchema, TOutput, ["select", TrueKeys<TProjection>]>;
  }

  protected async exec(): Promise<QueryOutput<TOutput, TOmit> | null> {
    const extras = addExtraInputsToProjection(this._projection, Schema.options(this.schema).virtuals);
    const replacement = Schema.input(this.schema, this._replacement as InferSchemaInput<TSchema>);
    const res = await this.collection.findOneAndReplace(this._filter as MongoFilter<InferSchemaData<TSchema>>, replacement, {
      ...this._options,
      projection: this._projection,
    });
    return res
      ? (Schema.output(this.schema, res as InferSchemaData<TSchema>, this._projection, extras) as QueryOutput<
          TOutput,
          TOmit
        >)
      : res;
  }
}
