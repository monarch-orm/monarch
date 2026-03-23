import type {
  Document,
  Collection as MongoCollection,
  Filter as MongoFilter,
  UpdateFilter as MongoUpdateFilter,
  UpdateOptions,
  UpdateResult,
} from "mongodb";
import type { Filter, UpdateFilter } from "../../schema/filter-types";
import { type AnySchema, Schema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import { Query } from "./base";

/**
 * Collection.updateOne().
 */
export class UpdateOneQuery<TSchema extends AnySchema> extends Query<TSchema, UpdateResult<InferSchemaData<TSchema>>> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _filter: Filter<TSchema>,
    private _update: UpdateFilter<TSchema> | Document[],
    private _options: UpdateOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  /**
   * Adds update options. Options are merged into existing options.
   *
   * @param options - UpdateOptions
   * @returns UpdateOneQuery instance
   */
  public options(options: UpdateOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  protected async exec(): Promise<UpdateResult<InferSchemaData<TSchema>>> {
    const update = Array.isArray(this._update) ? this._update : Schema.updateInput(this.schema, this._update);

    const res = await this.collection.updateOne(
      this._filter as MongoFilter<InferSchemaData<TSchema>>,
      update as MongoUpdateFilter<InferSchemaData<TSchema>>,
      this._options,
    );
    return res;
  }
}
