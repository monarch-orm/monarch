import type { Collection as MongoCollection } from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import type { IdFirst, Merge, Pretty } from "../../utils/type-helpers";
import type { WithProjection } from "../types/query-options";

/**
 * Base query class implementing thenable interface.
 */
export abstract class Query<TSchema extends AnySchema, TOutput> {
  constructor(
    protected schema: TSchema,
    protected collection: MongoCollection<InferSchemaData<TSchema>>,
    protected readyPromise: Promise<void>,
  ) {}

  protected abstract exec(): Promise<TOutput>;

  public async then<TResult1 = TOutput, TResult2 = never>(
    onfulfilled?: ((value: TOutput) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    await this.readyPromise;
    return this.exec().then(onfulfilled, onrejected);
  }

  public async catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
  ): Promise<TOutput | TResult> {
    await this.readyPromise;
    return this.exec().catch(onrejected);
  }

  public async finally(onfinally?: (() => void) | undefined | null): Promise<TOutput> {
    await this.readyPromise;
    return this.exec().finally(onfinally);
  }
}

export type QueryOutput<
  TOutput,
  TOmit extends ["omit" | "select", keyof any] = ["omit", never],
  TPopulate = {},
> = Pretty<IdFirst<Merge<WithProjection<TOmit[0], TOmit[1], TOutput>, TPopulate>>>;
