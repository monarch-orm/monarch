import type { Projection } from "../collection/types/query-options";
import { detectProjection } from "../collection/utils/projection";
import { objectId } from "../types/objectId";
import { type AnyMonarchType, MonarchType } from "../types/type";
import type { Pretty, WithOptionalId } from "../utils/type-helpers";
import type { SchemaIndexes } from "./indexes";
import type { InferSchemaData, InferSchemaInput, InferSchemaOutput, InferSchemaTypes } from "./type-helpers";
import type { SchemaVirtuals, Virtual } from "./virtuals";

type SchemaOmit<TTypes extends Record<string, AnyMonarchType>> = {
  [K in keyof WithOptionalId<TTypes>]?: true;
};

export type AnySchema = Schema<any, any, any, any>;

export class Schema<
  TName extends string,
  TTypes extends Record<string, AnyMonarchType>,
  TOmit extends SchemaOmit<TTypes> = {},
  TVirtuals extends Record<string, Virtual<any, any, any>> = {},
> {
  constructor(
    public name: TName,
    private _types: TTypes,
    public options: {
      omit?: SchemaOmit<TTypes>;
      virtuals?: SchemaVirtuals<TTypes, TVirtuals>;
      indexes?: SchemaIndexes<TTypes>;
    },
  ) {
    // @ts-ignore
    if (!_types._id) this._types._id = objectId().optional();
  }

  public static types<T extends AnySchema>(schema: T): InferSchemaTypes<T> {
    return schema._types;
  }

  public static toData<T extends AnySchema>(schema: T, data: InferSchemaInput<T>) {
    return schema.toData(data);
  }
  private toData(input: InferSchemaInput<this>): InferSchemaData<this> {
    const data = {} as InferSchemaData<this>;
    // parse fields
    const types = Schema.types(this);
    for (const [key, type] of Object.entries(types)) {
      const parser = MonarchType.parser(type);
      const parsed = parser(input[key as keyof InferSchemaInput<this>]);
      if (parsed === undefined) continue;
      data[key as keyof typeof data] = parsed;
    }
    return data;
  }

  public static fromData<T extends AnySchema>(
    schema: T,
    data: InferSchemaData<T>,
    projection: Projection<InferSchemaOutput<T>>,
    forceOmit: string[] | null,
  ) {
    return schema.fromData(data, projection, forceOmit);
  }
  private fromData(
    data: InferSchemaData<this>,
    projection: Projection<InferSchemaOutput<this>>,
    forceOmit: string[] | null,
  ): InferSchemaOutput<this> {
    const output = data as unknown as InferSchemaOutput<this>;
    if (this.options.virtuals) {
      const { isProjected } = detectProjection(projection);
      for (const [key, virtual] of Object.entries(this.options.virtuals)) {
        // skip omitted virtual field
        if (isProjected(key)) {
          // @ts-ignore
          output[key] = virtual.output(data);
        }
      }
    }
    // delete other fields that might have been added as input to a virtual or returned during insert
    if (forceOmit) {
      for (const key of forceOmit) {
        delete output[key as keyof InferSchemaOutput<this>];
      }
    }
    return output;
  }

  public static getFieldUpdates<T extends AnySchema>(schema: T) {
    return schema.getFieldUpdates();
  }
  private getFieldUpdates(): Partial<InferSchemaOutput<this>> {
    const updates = {} as Partial<InferSchemaOutput<this>>;
    // omit fields
    for (const [key, type] of Object.entries(Schema.types(this))) {
      const updater = MonarchType.updater(type);
      if (updater) {
        updates[key as keyof InferSchemaOutput<this>] = updater();
      }
    }
    return updates;
  }

  omit<TOmit extends SchemaOmit<TTypes>>(omit: TOmit) {
    const schema = this as unknown as Schema<TName, TTypes, TOmit, TVirtuals>;
    schema.options.omit = omit;
    return schema;
  }

  virtuals<TVirtuals extends Record<string, Virtual<Pretty<TTypes>, any, any>>>(
    virtuals: SchemaVirtuals<TTypes, TVirtuals>,
  ) {
    const schema = this as unknown as Schema<TName, TTypes, TOmit, TVirtuals>;
    schema.options.virtuals = virtuals;
    return schema;
  }

  /**
   * Defines the indexes for the schema.
   *
   * This method allows you to specify indexes that should be created for the schema.
   *
   * @param indexes - A function that defines the indexes to be created.
   *
   * @returns The current schema instance for method chaining.
   *
   * @example
   * const userSchema = createSchema("users", {
   *   name: string(),
   *   age: number(),
   * }).indexes(({ createIndex, unique }) => ({
   *   username: unique("username"),
   *   fullname: createIndex({ firstname: 1, surname: 1 }, { unique: true }),
   * }));
   */
  indexes(indexes: SchemaIndexes<TTypes>) {
    this.options.indexes = indexes;
    return this;
  }
}

export function createSchema<TName extends string, TTypes extends Record<string, AnyMonarchType>>(
  name: TName,
  types: TTypes,
): Schema<TName, TTypes, {}, {}> {
  return new Schema(name, types, {});
}
