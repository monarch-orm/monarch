import type { Collection as MongoCollection } from "mongodb";
import type { AnySchema } from "../../schema/schema";
import type { InferSchemaData } from "../../schema/type-helpers";
import type { IdFirst, Merge, Pretty } from "../../utils/type-helpers";
import type { WithProjection } from "../types/query-options";

export abstract class Query<TSchema extends AnySchema, TOutput> {
  constructor(
    protected _schema: TSchema,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
  ) {}

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

export type QueryOutput<
  TOutput,
  TOmit extends ["omit" | "select", keyof any] = ["omit", never],
  TPopulate = {},
> = Pretty<IdFirst<Merge<WithProjection<TOmit[0], TOmit[1], TOutput>, TPopulate>>>;
