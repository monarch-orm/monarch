import type {
  BulkWriteOptions,
  InsertManyResult,
  Collection as MongoCollection,
  OptionalUnlessRequiredId,
} from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type { InferSchemaData, InferSchemaInput } from "../../schema/type-helpers";
import { Query } from "./base";

/**
 * Collection.insertMany().
 */
export class InsertManyQuery<TSchema extends AnySchema> extends Query<
  TSchema,
  InsertManyResult<InferSchemaData<TSchema>>
> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _data: InferSchemaInput<TSchema>[],
    private _options: BulkWriteOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  /**
   * Adds insert options. Options are merged into existing options.
   *
   * @param options - BulkWriteOptions
   * @returns InsertManyQuery instance
   */
  public options(options: BulkWriteOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  protected async exec(): Promise<InsertManyResult<InferSchemaData<TSchema>>> {
    const data = this._data.map((data) => Schema.input(this.schema, data));
    const res = await this.collection.insertMany(
      data as OptionalUnlessRequiredId<InferSchemaData<TSchema>>[],
      this._options,
    );
    return res;
  }
}
