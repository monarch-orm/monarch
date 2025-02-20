import type {
  Filter,
  FindOptions,
  MatchKeysAndValues,
  Collection as MongoCollection,
  UpdateFilter,
  UpdateResult,
} from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import { Query } from "./base";

export class UpdateOneQuery<TSchema extends AnySchema> extends Query<
  TSchema,
  UpdateResult<InferSchemaData<TSchema>>
> {
  constructor(
    protected _schema: TSchema,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    private _filter: Filter<InferSchemaData<TSchema>>,
    private _update: UpdateFilter<InferSchemaData<TSchema>>,
    private _options: FindOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
  }

  public options(options: FindOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  public async exec(): Promise<UpdateResult<InferSchemaData<TSchema>>> {
    await this._readyPromise;
    const fieldUpdates = Schema.getFieldUpdates(
      this._schema,
    ) as MatchKeysAndValues<InferSchemaData<TSchema>>;
    this._update.$set = { ...fieldUpdates, ...this._update.$set };

    const res = await this._collection.updateOne(
      this._filter,
      this._update,
      this._options,
    );
    return res;
  }
}
