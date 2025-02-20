import type {
  InsertOneOptions,
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

export class InsertOneQuery<
  TSchema extends AnySchema,
  TOutput = InferSchemaOutput<TSchema>,
  TOmit extends ["omit" | "select", keyof any] = [
    "omit",
    InferSchemaOmit<TSchema>,
  ],
> extends Query<TSchema, QueryOutput<TOutput, TOmit>> {
  private _projection: Projection<InferSchemaOutput<TSchema>>;

  constructor(
    protected _schema: TSchema,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    private _data: InferSchemaInput<TSchema>,
    private _options: InsertOneOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
    this._projection = makeProjection("omit", _schema.options.omit ?? {});
  }

  public options(options: InsertOneOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  public async exec(): Promise<QueryOutput<TOutput, TOmit>> {
    await this._readyPromise;
    const data = Schema.toData(this._schema, this._data);
    const res = await this._collection.insertOne(
      data as OptionalUnlessRequiredId<InferSchemaData<TSchema>>,
      this._options,
    );
    return Schema.fromData(
      this._schema,
      {
        ...data,
        _id: res.insertedId,
      },
      this._projection,
      Object.keys(this._projection),
    ) as TOutput;
  }
}
