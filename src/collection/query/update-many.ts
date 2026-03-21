import type {
  Document,
  Filter,
  Collection as MongoCollection,
  StrictUpdateFilter,
  UpdateFilter,
  UpdateOptions,
  UpdateResult,
} from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type { InferSchemaData, InferSchemaInput } from "../../schema/type-helpers";
import { Query } from "./base";

/**
 * Collection.updateMany().
 */
export class UpdateManyQuery<TSchema extends AnySchema> extends Query<TSchema, UpdateResult<InferSchemaData<TSchema>>> {
  constructor(
    protected _schema: TSchema,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    private _filter: Filter<InferSchemaData<TSchema>>,
    private _update: StrictUpdateFilter<InferSchemaInput<TSchema>> | Document[],
    private _options: UpdateOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
  }

  /**
   * Adds update options. Options are merged into existing options.
   *
   * @param options - UpdateOptions
   * @returns UpdateManyQuery instance
   */
  public options(options: UpdateOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  protected async exec(): Promise<UpdateResult<InferSchemaData<TSchema>>> {
    await this._readyPromise;
    const update = Array.isArray(this._update)
      ? this._update
      : (Schema.updateInput(this._schema, this._update) as UpdateFilter<InferSchemaData<TSchema>>);

    const res = await this._collection.updateMany(this._filter, update, this._options);
    return res;
  }
}
