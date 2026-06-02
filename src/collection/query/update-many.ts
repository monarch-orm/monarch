import type {
  Collection as MongoCollection,
  Filter as MongoFilter,
  UpdateFilter as MongoUpdateFilter,
  UpdateOptions,
  UpdateResult,
} from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type { Filter, InferSchemaData, UpdateFilter } from "../../schema/type-helpers";
import { Query } from "./base";

export type UpdateManyQueryOptions = UpdateOptions;

/**
 * Collection.updateMany().
 */
export class UpdateManyQuery<TSchema extends AnySchema> extends Query<TSchema, UpdateResult<InferSchemaData<TSchema>>> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _filter: Filter<TSchema>,
    private _update: UpdateFilter<TSchema>,
    private _options: UpdateManyQueryOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  /**
   * Adds update options. Options are merged into existing options.
   *
   * @param options - UpdateManyQueryOptions
   * @returns UpdateManyQuery instance
   */
  public options(options: UpdateManyQueryOptions): this {
    return new UpdateManyQuery(this.schema, this.collection, this.readyPromise, this._filter, this._update, {
      ...this._options,
      ...options,
    }) as this;
  }

  protected async exec(): Promise<UpdateResult<InferSchemaData<TSchema>>> {
    const update = Schema.updateInput(this.schema, this._update, this._options.upsert ?? false);

    const res = await this.collection.updateMany(
      this._filter as MongoFilter<InferSchemaData<TSchema>>,
      update as MongoUpdateFilter<InferSchemaData<TSchema>>,
      this._options,
    );
    return res;
  }
}
