import type { AnyBulkWriteOperation, BulkWriteOptions, BulkWriteResult, Collection as MongoCollection } from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import { Query } from "./base";

export type BulkWriteQueryOptions = BulkWriteOptions;

export class BulkWriteQuery<TSchema extends AnySchema> extends Query<TSchema, BulkWriteResult> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _data: AnyBulkWriteOperation<InferSchemaData<TSchema>>[],
    private _options: BulkWriteQueryOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  public options(options: BulkWriteQueryOptions): this {
    return new BulkWriteQuery(this.schema, this.collection, this.readyPromise, this._data, {
      ...this._options,
      ...options,
    }) as this;
  }

  protected async exec(): Promise<BulkWriteResult> {
    const res = await this.collection.bulkWrite(this._data, this._options);
    return res;
  }
}
