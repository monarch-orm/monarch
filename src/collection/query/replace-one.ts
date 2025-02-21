import type {
  Filter,
  Collection as MongoCollection,
  ReplaceOptions,
  UpdateResult,
  WithoutId,
} from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import { Query } from "./base";

export class ReplaceOneQuery<TSchema extends AnySchema> extends Query<
  TSchema,
  UpdateResult<InferSchemaData<TSchema>>
> {
  constructor(
    protected _schema: TSchema,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    private _filter: Filter<InferSchemaData<TSchema>>,
    private _replacement: WithoutId<InferSchemaData<TSchema>>,
    private _options: ReplaceOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
  }

  public options(options: ReplaceOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  public async exec(): Promise<UpdateResult<InferSchemaData<TSchema>>> {
    await this._readyPromise;
    const res = await this._collection.replaceOne(
      this._filter,
      this._replacement,
      this._options,
    );
    return res as UpdateResult<InferSchemaData<TSchema>>;
  }
}
