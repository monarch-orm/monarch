import type { DistinctOptions, Collection as MongoCollection, Filter as MongoFilter } from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { DistinctFilter, Filter, InferSchemaData } from "../../schema/type-helpers";
import { Query } from "./base";

export type DistinctQueryOptions = DistinctOptions;

export class DistinctQuery<
  TSchema extends AnySchema,
  Key extends keyof DistinctFilter<TSchema>,
  TOutput = DistinctFilter<TSchema>[Key],
> extends Query<TSchema, TOutput> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _filter: Filter<TSchema>,
    private _key: Key,
    private _options: DistinctQueryOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  public options(options: DistinctQueryOptions): this {
    return new DistinctQuery(this.schema, this.collection, this.readyPromise, this._filter, this._key, {
      ...this._options,
      ...options,
    }) as this;
  }

  protected async exec(): Promise<TOutput> {
    const res = await this.collection.distinct(
      this._key as string,
      this._filter as MongoFilter<InferSchemaData<TSchema>>,
      this._options,
    );
    return res as TOutput;
  }
}
