import type { AnyBulkWriteOperation, BulkWriteOptions, BulkWriteResult, Collection as MongoCollection } from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import { Query } from "./base";

export class BulkWriteQuery<TSchema extends AnySchema> extends Query<TSchema, BulkWriteResult> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _data: AnyBulkWriteOperation<InferSchemaData<TSchema>>[],
    private _options: BulkWriteOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  public options(options: BulkWriteOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  protected async exec(): Promise<BulkWriteResult> {
    const res = await this.collection.bulkWrite(this._data, this._options);
    return res;
  }
}
