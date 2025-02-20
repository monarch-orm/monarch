import type {
  Filter,
  FindOneAndUpdateOptions,
  MatchKeysAndValues,
  Collection as MongoCollection,
  UpdateFilter,
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

export class FindOneAndUpdateQuery<
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
    private _update: UpdateFilter<InferSchemaData<TSchema>>,
    private _options: FindOneAndUpdateOptions = {},
  ) {
    super(_schema, _collection, _readyPromise);
    this._projection = makeProjection("omit", _schema.options.omit ?? {});
  }

  public options(options: FindOneAndUpdateOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  public omit<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(
    projection: TProjection,
  ) {
    this._projection = makeProjection("omit", projection);
    return this as FindOneAndUpdateQuery<
      TSchema,
      TOutput,
      ["omit", TrueKeys<TProjection>]
    >;
  }

  public select<TProjection extends BoolProjection<InferSchemaOutput<TSchema>>>(
    projection: TProjection,
  ) {
    this._projection = makeProjection("select", projection);
    return this as FindOneAndUpdateQuery<
      TSchema,
      TOutput,
      ["select", TrueKeys<TProjection>]
    >;
  }

  public async exec(): Promise<QueryOutput<TOutput, TOmit> | null> {
    await this._readyPromise;
    const fieldUpdates = Schema.getFieldUpdates(
      this._schema,
    ) as MatchKeysAndValues<InferSchemaData<TSchema>>;
    this._update.$set = { ...fieldUpdates, ...this._update.$set };

    const extra = addExtraInputsToProjection(
      this._projection,
      this._schema.options.virtuals,
    );
    const res = await this._collection.findOneAndUpdate(
      this._filter,
      this._update,
      { ...this._options, projection: this._projection },
    );
    return res
      ? (Schema.fromData(
          this._schema,
          res as InferSchemaData<TSchema>,
          this._projection,
          extra,
        ) as TOutput)
      : res;
  }
}
