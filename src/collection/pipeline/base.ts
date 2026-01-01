import type { Collection as MongoCollection } from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import type { PipelineStage } from "../types/pipeline-stage";

export abstract class Pipeline<TSchema extends AnySchema, TOutput> {
  constructor(
    protected _schema: TSchema,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    protected _pipeline: PipelineStage<InferSchemaData<TSchema>>[] = [],
  ) {}

  public addStage(stage: PipelineStage<InferSchemaData<TSchema>>): this {
    this._pipeline.push(stage);
    return this;
  }

  protected abstract exec(): Promise<TOutput>;

  public then<TResult1 = TOutput, TResult2 = never>(
    onfulfilled?: ((value: TOutput) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }

  public catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
  ): Promise<TOutput | TResult> {
    return this.exec().catch(onrejected);
  }

  public finally(onfinally?: (() => void) | undefined | null): Promise<TOutput> {
    return this.exec().finally(onfinally);
  }
}
