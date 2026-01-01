import type { DeleteOptions, DeleteResult, Filter, Collection as MongoCollection } from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import { Query } from "./base";

export class DeleteOneQuery<TSchema extends AnySchema> extends Query<TSchema, DeleteResult> {
  constructor(
    protected _schema: TSchema,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    private _filter: Filter<InferSchemaData<TSchema>>,
    private _options: DeleteOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
  }

  public options(options: DeleteOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  protected async exec(): Promise<DeleteResult> {
    await this._readyPromise;
    const res = await this._collection.deleteOne(this._filter, this._options);
    return res;
  }
}
