import type { DeleteOptions, DeleteResult, Collection as MongoCollection, Filter as MongoFilter } from "mongodb";
import type { Filter } from "../../schema/filter-types";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import { Query } from "./base";

/**
 * Collection.deleteOne().
 */
export class DeleteOneQuery<TSchema extends AnySchema> extends Query<TSchema, DeleteResult> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _filter: Filter<TSchema>,
    private _options: DeleteOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  /**
   * Adds delete options. Options are merged into existing options.
   *
   * @param options - DeleteOptions
   * @returns DeleteOneQuery instance
   */
  public options(options: DeleteOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  protected async exec(): Promise<DeleteResult> {
    const res = await this.collection.deleteOne(this._filter as MongoFilter<InferSchemaData<TSchema>>, this._options);
    return res;
  }
}
