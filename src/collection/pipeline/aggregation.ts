import type { Abortable, AggregateOptions, AggregationCursor, Document, Collection as MongoCollection } from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import type { PipelineStage } from "../types/pipeline-stage";
import { Pipeline } from "./base";

export type AggregationPipelineOptions = AggregateOptions & Abortable;

/**
 * Collection.aggregate().
 */
export class AggregationPipeline<TSchema extends AnySchema, TOutput extends Document> extends Pipeline<
  TSchema,
  TOutput
> {
  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _options: AggregateOptions = {},
    pipeline: PipelineStage<InferSchemaData<TSchema>>[] = [],
  ) {
    super(schema, collection, readyPromise, pipeline);
  }

  /**
   * Appends aggregation pipeline stage.
   *
   * @param stage - Pipeline stage
   * @returns AggregationPipeline instance
   */
  public addStage(stage: PipelineStage<InferSchemaData<TSchema>>): this {
    return new AggregationPipeline(this.schema, this.collection, this.readyPromise, this._options, [
      ...this.pipeline,
      stage,
    ]) as this;
  }

  /**
   * Adds aggregation options. Options are merged into existing options.
   *
   * @param options - AggregationPipelineOptions
   * @returns AggregationPipeline instance
   */
  public options(options: AggregationPipelineOptions): this {
    return new AggregationPipeline(
      this.schema,
      this.collection,
      this.readyPromise,
      { ...this._options, ...options },
      this.pipeline,
    ) as this;
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
