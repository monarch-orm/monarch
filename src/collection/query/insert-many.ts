import type {
  BulkWriteOptions,
  Collection as MongoCollection,
  OptionalUnlessRequiredId,
} from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type {
  InferSchemaData,
  InferSchemaInput,
  InferSchemaOmit,
  InferSchemaOutput,
} from "../../schema/type-helpers";
import type { Projection } from "../types/query-options";
import { makeProjection } from "../utils/projection";
import { Query, type QueryOutput } from "./base";

export class InsertManyQuery<
  TSchema extends AnySchema,
  TOutput = InferSchemaOutput<TSchema>[],
  TOmit extends ["omit" | "select", keyof any] = [
    "omit",
    InferSchemaOmit<TSchema>,
  ],
> extends Query<TSchema, QueryOutput<TOutput, TOmit>[]> {
  private _projection: Projection<InferSchemaOutput<TSchema>>;

  constructor(
    protected _schema: TSchema,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    private _data: InferSchemaInput<TSchema>[],
    private _options: BulkWriteOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
    this._projection = makeProjection("omit", _schema.options.omit ?? {});
  }

  public options(options: BulkWriteOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  public async exec(): Promise<QueryOutput<TOutput, TOmit>[]> {
    await this._readyPromise;
    const data = this._data.map((data) => Schema.toData(this._schema, data));
    await this._collection.insertMany(
      data as OptionalUnlessRequiredId<InferSchemaData<TSchema>>[],
      this._options,
    );
    const result = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = Schema.fromData(
        this._schema,
        data[i],
        this._projection,
        Object.keys(this._projection),
      );
    }
    return result as QueryOutput<TOutput, TOmit>[];
  }
}
