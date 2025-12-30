import type {
  BulkWriteOptions,
  InsertManyResult,
  Collection as MongoCollection,
  OptionalUnlessRequiredId,
} from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type { InferSchemaData, InferSchemaInput } from "../../schema/type-helpers";
import { Query } from "./base";

export class InsertManyQuery<TSchema extends AnySchema> extends Query<
  TSchema,
  InsertManyResult<InferSchemaData<TSchema>>
> {
  constructor(
    protected _schema: TSchema,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    private _data: InferSchemaInput<TSchema>[],
    private _options: BulkWriteOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
  }

  public options(options: BulkWriteOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  public async exec(): Promise<InsertManyResult<InferSchemaData<TSchema>>> {
    await this._readyPromise;
    const data = this._data.map((data) => Schema.toData(this._schema, data));
    const res = await this._collection.insertMany(
      data as OptionalUnlessRequiredId<InferSchemaData<TSchema>>[],
      this._options,
    );
    return res;
  }
}
