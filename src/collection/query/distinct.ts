import type { DistinctOptions, Filter, Collection as MongoCollection } from "mongodb";
import type { AnyRelations } from "../../relations/relations";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import { Query } from "./base";

export class DistinctQuery<
  TSchema extends AnySchema,
  TDbRelations extends Record<string, AnyRelations>,
  TOutput extends InferSchemaData<TSchema>,
> extends Query<TSchema, TOutput> {
  constructor(
    protected _schema: TSchema,
    protected _relations: TDbRelations,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    private _filter: Filter<InferSchemaData<TSchema>>,
    private _key: keyof TOutput,
    private _options: DistinctOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
  }

  public options(options: DistinctOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  protected async exec(): Promise<TOutput> {
    await this._readyPromise;

    const res = await this._collection.distinct(this._key as string, this._filter, {
      ...this._options,
    });
    return res as any;
  }
}
