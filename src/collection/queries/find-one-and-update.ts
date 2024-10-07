import type { Filter, FindOneAndUpdateOptions } from "mongodb";
import { type AnySchema, Schema } from "../../schema/schema";
import type {
  InferSchemaData,
  InferSchemaOutput,
} from "../../schema/type-helpers";
import { BaseMutationQuery } from "./base";

export class FindOneAndUpdateQuery<
  T extends AnySchema,
> extends BaseMutationQuery<T> {
  protected _options: FindOneAndUpdateOptions = {};

  options(options: FindOneAndUpdateOptions): this {
    Object.assign(this._options, options);
    return this;
  }

  async exec(): Promise<InferSchemaOutput<T> | null> {
    const fieldUpdates = Schema.getFieldUpdates(this._schema);
    const data = this.data;
    // @ts-ignore
    data.$set = { ...fieldUpdates, ...data.$set };
    return await this._collection
      .findOneAndUpdate(
        this.filters as unknown as Filter<InferSchemaData<T>>,
        data,
        this._options,
      )
      .then((res) => (res ? Schema.fromData(this._schema, res) : res));
  }
}
