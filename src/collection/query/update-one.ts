import type {
  Collection as MongoCollection,
  Filter as MongoFilter,
  Sort as MongoSort,
  UpdateFilter as MongoUpdateFilter,
  UpdateOptions,
  UpdateResult,
} from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type { Filter, InferSchemaData, UpdateFilter } from "../../schema/type-helpers";
import type { Sort } from "../types/query-options";
import { Query } from "./base";

export type UpdateOneQueryOptions = UpdateOptions & { sort?: MongoSort };

/**
 * Collection.updateOne().
 */
export class UpdateOneQuery<TSchema extends AnySchema> extends Query<TSchema, UpdateResult<InferSchemaData<TSchema>>> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _filter: Filter<TSchema>,
    private _update: UpdateFilter<TSchema>,
    private _options: UpdateOneQueryOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  /**
   * Adds update options. Options are merged into existing options.
   *
   * @param options - UpdateOneQueryOptions
   * @returns UpdateOneQuery instance
   */
  public options(options: UpdateOneQueryOptions): this {
    return new UpdateOneQuery(this.schema, this.collection, this.readyPromise, this._filter, this._update, {
      ...this._options,
      ...options,
    }) as this;
  }

  /**
   * Sets sort order to determine which document is updated when multiple match.
   *
   * @param sort - Sort specification
   * @returns UpdateOneQuery instance
   */
  public sort(sort: Sort<InferSchemaData<TSchema>>): this {
    return new UpdateOneQuery(this.schema, this.collection, this.readyPromise, this._filter, this._update, {
      ...this._options,
      sort: sort as MongoSort,
    }) as this;
  }

  protected async exec(): Promise<UpdateResult<InferSchemaData<TSchema>>> {
    const update = Schema.updateInput(this.schema, this._update, this._options.upsert ?? false);

    const res = await this.collection.updateOne(
      this._filter as MongoFilter<InferSchemaData<TSchema>>,
      update as MongoUpdateFilter<InferSchemaData<TSchema>>,
      this._options,
    );
    return res;
  }
}
