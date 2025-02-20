import type {
  Filter,
  FindOneAndDeleteOptions,
  Collection as MongoCollection,
} from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type {
  InferSchemaData,
  InferSchemaOmit,
  InferSchemaOutput,
} from "../../schema/type-helpers";
import type { TrueKeys } from "../../type-helpers";
import type { BoolProjection, Projection } from "../types/query-options";
import {
  addExtraInputsToProjection,
  makeProjection,
} from "../utils/projection";
import { Query, type QueryOutput } from "./base";

export class FindOneAndDeleteQuery<
  TSchema extends AnySchema,
  TOutput = InferSchemaOutput<TSchema>,
  TOmit extends ["omit" | "select", keyof any] = [
    "omit",
    InferSchemaOmit<TSchema>,
  ],
> extends Query<TSchema, QueryOutput<TOutput, TOmit> | null> {
  private _projection: Projection<InferSchemaOutput<TSchema>>;

  constructor(
    protected _schema: TSchema,
    protected _collection: MongoCollection<InferSchemaData<TSchema>>,
    protected _readyPromise: Promise<void>,
    private _filter: Filter<InferSchemaData<TSchema>>,
    private _options: FindOneAndDeleteOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
    this._projection = makeProjection("omit", _schema.options.omit ?? {});
  }

  public options(options: FindOneAndDeleteOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  public omit<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(
    projection: TProjection,
  ) {
    this._projection = makeProjection("omit", projection);
    return this as FindOneAndDeleteQuery<
      TSchema,
      TOutput,
      ["omit", TrueKeys<TProjection>]
    >;
  }

  public select<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(
    projection: TProjection,
  ) {
    this._projection = makeProjection("select", projection);
    return this as FindOneAndDeleteQuery<
      TSchema,
      TOutput,
      ["select", TrueKeys<TProjection>]
    >;
  }

  public async exec(): Promise<QueryOutput<TOutput, TOmit> | null> {
    await this._readyPromise;
    const extras = addExtraInputsToProjection(
      this._projection,
      this._schema.options.virtuals,
    );
    const res = await this._collection.findOneAndDelete(this._filter, {
      ...this._options,
      projection: this._projection,
    });
    return res
      ? (Schema.fromData(
          this._schema,
          res as InferSchemaData<TSchema>,
          this._projection,
          extras,
        ) as QueryOutput<TOutput, TOmit>)
      : res;
  }
}
