import type { DeleteOptions, DeleteResult, Collection as MongoCollection, Filter as MongoFilter } from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { Filter, InferSchemaData } from "../../schema/type-helpers";
import { Query } from "./base";

export type DeleteManyQueryOptions = DeleteOptions;

/**
 * Collection.deleteMany().
 */
export class DeleteManyQuery<TSchema extends AnySchema> extends Query<TSchema, DeleteResult> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _filter: Filter<TSchema>,
    private _options: DeleteManyQueryOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  /**
   * Adds delete options. Options are merged into existing options.
   *
   * @param options - DeleteManyQueryOptions
   * @returns DeleteManyQuery instance
   */
  public options(options: DeleteManyQueryOptions): this {
    return new DeleteManyQuery(this.schema, this.collection, this.readyPromise, this._filter, {
      ...this._options,
      ...options,
    }) as this;
  }

  protected async exec(): Promise<DeleteResult> {
    const res = await this.collection.deleteMany(this._filter as MongoFilter<InferSchemaData<TSchema>>, this._options);
    return res;
  }
}
