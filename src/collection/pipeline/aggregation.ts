import type { AggregateOptions, AggregationCursor, Collection as MongoCollection } from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import { Pipeline } from "./base";

/**
 * Collection.aggregate().
 */
export class AggregationPipeline<TSchema extends AnySchema, TOutput extends any[]> extends Pipeline<TSchema, TOutput> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _options: AggregateOptions = {},
  ) {
    super(schema, collection, readyPromise);
  }

  /**
   * Adds aggregation options. Options are merged into existing options.
   *
   * @param options - AggregateOptions
   * @returns AggregationPipeline instance
   */
  public options(options: AggregateOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  /**
   * Returns MongoDB cursor for result iteration.
   *
   * @returns AggregationCursor
   */
  public async cursor(): Promise<AggregationCursor<TOutput>> {
    await this.readyPromise;
    return this.collection.aggregate<TOutput>(this.pipeline, this._options);
  }

  protected async exec(): Promise<TOutput[]> {
    return (await this.cursor()).toArray();
  }
}
