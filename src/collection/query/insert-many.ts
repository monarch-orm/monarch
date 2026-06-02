import type {
  BulkWriteOptions,
  InsertManyResult,
  Collection as MongoCollection,
  OptionalUnlessRequiredId,
} from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type { InferSchemaData, InferSchemaInput } from "../../schema/type-helpers";
import { Query } from "./base";

export type InsertManyQueryOptions = BulkWriteOptions;

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
    private _options: InsertManyQueryOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  /**
   * Adds insert options. Options are merged into existing options.
   *
   * @param options - InsertManyQueryOptions
   * @returns InsertManyQuery instance
   */
  public options(options: InsertManyQueryOptions): this {
    return new InsertManyQuery(this.schema, this.collection, this.readyPromise, this._data, {
      ...this._options,
      ...options,
    }) as this;
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
