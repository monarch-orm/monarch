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

export class UpdateManyQuery<TSchema extends AnySchema> extends Query<TSchema, UpdateResult<InferSchemaData<TSchema>>> {
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

  protected async exec(): Promise<UpdateResult<InferSchemaData<TSchema>>> {
    await this._readyPromise;
    const fieldUpdates = Schema.getFieldUpdates(this._schema) as MatchKeysAndValues<InferSchemaData<TSchema>>;

    // Create a new update object to avoid mutating the user's input
    // User-provided $set values take precedence over schema field updates
    const update = {
      ...this._update,
      $set: { ...fieldUpdates, ...this._update.$set },
    };

    const res = await this._collection.updateMany(this._filter, update, this._options);
    return res;
  }
}
