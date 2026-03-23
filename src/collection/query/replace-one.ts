import type {
  Collection as MongoCollection,
  Filter as MongoFilter,
  ReplaceOptions,
  UpdateResult,
  WithoutId,
} from "mongodb";
import type { Filter } from "../../schema/filter-types";
import { Schema, type AnySchema } from "../../schema/schema";
import type { InferSchemaData, InferSchemaInput } from "../../schema/type-helpers";
import { Query } from "./base";

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
    private _options: ReplaceOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  /**
   * Adds replace options. Options are merged into existing options.
   *
   * @param options - ReplaceOptions
   * @returns ReplaceOneQuery instance
   */
  public options(options: ReplaceOptions): this {
    Object.assign(this._options, options);
    return this;
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
