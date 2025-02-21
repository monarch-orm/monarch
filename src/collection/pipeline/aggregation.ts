import type { AggregateOptions, Collection as MongoCollection } from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import { Pipeline } from "./base";

export class AggregationPipeline<
  TSchema extends AnySchema,
  TOutput extends any[],
> extends Pipeline<TSchema, TOutput> {
  constructor(
    protected _schema: TSchema,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    protected _options: AggregateOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
  }

  public options(options: AggregateOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  public castStage<O extends any[]>() {
    return this as unknown as AggregationPipeline<TSchema, O>;
  }

  public cast<O extends any[]>() {
    return this as unknown as AggregationPipeline<TSchema, O>;
  }

  public async exec(): Promise<TOutput> {
    const res = await this._collection
      .aggregate(this._pipeline, this._options)
      .toArray();
    return res as TOutput;
  }
}
