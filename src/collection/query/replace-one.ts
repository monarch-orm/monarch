import type {
  Collection as MongoCollection,
  Filter as MongoFilter,
  ReplaceOptions,
  UpdateResult,
  WithoutId,
} from "mongodb";
import { Schema, type AnySchema } from "../../schema/schema";
import type { Filter, InferSchemaData, InferSchemaInput } from "../../schema/type-helpers";
import { Query } from "./base";

export type ReplaceOneQueryOptions = ReplaceOptions;

/**
 * Collection.replaceOne().
 */
export class ReplaceOneQuery<TSchema extends AnySchema> extends Query<TSchema, UpdateResult<InferSchemaData<TSchema>>> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _filter: Filter<TSchema>,
    private _replacement: WithoutId<InferSchemaInput<TSchema>>,
    private _options: ReplaceOneQueryOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  /**
   * Adds replace options. Options are merged into existing options.
   *
   * @param options - ReplaceOneQueryOptions
   * @returns ReplaceOneQuery instance
   */
  public options(options: ReplaceOneQueryOptions): this {
    return new ReplaceOneQuery(this.schema, this.collection, this.readyPromise, this._filter, this._replacement, {
      ...this._options,
      ...options,
    }) as this;
  }

  protected async exec(): Promise<UpdateResult<InferSchemaData<TSchema>>> {
    const replacement = Schema.input(this.schema, this._replacement as InferSchemaInput<TSchema>);
    const res = await this.collection.replaceOne(
      this._filter as MongoFilter<InferSchemaData<TSchema>>,
      replacement,
      this._options,
    );
    return res as UpdateResult<InferSchemaData<TSchema>>;
  }
}
