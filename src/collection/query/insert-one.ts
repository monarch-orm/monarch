import type { InsertOneOptions, Collection as MongoCollection, OptionalUnlessRequiredId } from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type { InferSchemaData, InferSchemaInput, InferSchemaOmit, InferSchemaOutput } from "../../schema/type-helpers";
import { makeProjection } from "../projection";
import type { Projection } from "../types/query-options";
import { Query, type QueryOutput } from "./base";

/**
 * Collection.insertOne().
 */
export class InsertOneQuery<
  TSchema extends AnySchema,
  TOutput = InferSchemaOutput<TSchema>,
  TOmit extends ["omit" | "select", keyof any] = ["omit", InferSchemaOmit<TSchema>],
> extends Query<TSchema, QueryOutput<TOutput, TOmit>> {
  private _projection: Projection<InferSchemaOutput<TSchema>>;

  constructor(
    schema: TSchema,
    collection: MongoCollection<InferSchemaData<TSchema>>,
    readyPromise: Promise<void>,
    private _data: InferSchemaInput<TSchema>,
    private _options: InsertOneOptions = {},
  ) {
    super(schema, collection, readyPromise);
    this._projection = makeProjection("omit", Schema.options(schema).omit ?? {});
  }

  /**
   * Adds insert options. Options are merged into existing options.
   *
   * @param options - InsertOneOptions
   * @returns InsertOneQuery instance
   */
  public options(options: InsertOneOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  protected async exec(): Promise<QueryOutput<TOutput, TOmit>> {
    const data = Schema.input(this.schema, this._data);
    const res = await this.collection.insertOne(
      data as OptionalUnlessRequiredId<InferSchemaData<TSchema>>,
      this._options,
    );
    return Schema.output(
      this.schema,
      {
        ...data,
        _id: res.insertedId,
      },
      this._projection,
      Object.keys(this._projection),
    ) as unknown as QueryOutput<TOutput, TOmit>;
  }
}
