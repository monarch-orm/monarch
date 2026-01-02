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

/**
 * Defines the structure and behavior of a MongoDB collection with type safety.
 *
 * @typeParam TName - Collection name
 * @typeParam TTypes - Field type definitions
 * @typeParam TOmit - Fields to omit from output
 * @typeParam TVirtuals - Virtual field definitions
 */
export class Schema<
  TName extends string,
  TTypes extends Record<string, AnyMonarchType>,
  TOmit extends SchemaOmit<TTypes> = {},
  TVirtuals extends Record<string, Virtual<any, any, any>> = {},
> {
  /**
   * Creates a Schema instance.
   *
   * @param name - Collection name
   * @param _types - Field type definitions
   * @param options - Schema options including omit, virtuals, and indexes
   */
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

  /**
   * Specifies fields to omit from query output.
   *
   * @typeParam TOmit - Fields to omit
   * @param omit - Object specifying which fields to omit
   * @returns Schema instance with omit configuration
   */
  omit<TOmit extends SchemaOmit<TTypes>>(omit: TOmit) {
    const schema = this as unknown as Schema<TName, TTypes, TOmit, TVirtuals>;
    schema.options.omit = omit;
    return schema;
  }

  /**
   * Adds virtual computed fields to the schema.
   *
   * @typeParam TVirtuals - Virtual field definitions
   * @param virtuals - Object defining virtual fields
   * @returns Schema instance with virtual fields configured
   */
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

  /**
   * Retrieves the field type definitions from a schema.
   *
   * @typeParam T - Schema type
   * @param schema - Schema instance
   * @returns Field type definitions
   */
  public static types<T extends AnySchema>(schema: T): InferSchemaTypes<T> {
    return schema._types;
  }

  /**
   * Parses and validates input data according to schema type definitions.
   *
   * @typeParam T - Schema type
   * @param schema - Schema instance
   * @param input - Input data to encode
   * @returns Encoded data ready for database storage
   */
  public static encode<T extends AnySchema>(schema: T, input: InferSchemaInput<T>) {
    const data = {} as InferSchemaData<T>;
    // parse fields
    const types = Schema.types(schema);
    for (const [key, type] of Object.entries(types)) {
      const parser = MonarchType.parser(type as AnyMonarchType);
      const parsed = parser(input[key as keyof InferSchemaInput<T>]);
      if (parsed === undefined) continue;
      data[key as keyof typeof data] = parsed;
    }
    return data;
  }

  /**
   * Transforms database data to output format with virtual fields and projections.
   *
   * @typeParam T - Schema type
   * @param schema - Schema instance
   * @param data - Database data to decode
   * @param projection - Field projection configuration
   * @param forceOmit - Fields to force omit from output
   * @returns Decoded output data
   */
  public static decode<T extends AnySchema>(
    schema: T,
    data: InferSchemaData<T>,
    projection: Projection<InferSchemaOutput<T>>,
    forceOmit: string[] | null,
  ) {
    const output = data as unknown as InferSchemaOutput<T>;
    if (schema.options.virtuals) {
      const { isProjected } = detectProjection(projection);
      for (const [key, virtual] of Object.entries(schema.options.virtuals)) {
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
        delete output[key as keyof InferSchemaOutput<T>];
      }
    }
    return output;
  }

  /**
   * Get field updates for all top-level schema fields that have onUpdate configured.
   *
   * NOTE: Only top-level schema fields are processed. Nested fields within objects or arrays are not included.
   */
  public static getFieldUpdates<T extends AnySchema>(schema: T) {
    const updates = {} as Partial<InferSchemaOutput<T>>;
    // omit fields
    for (const [key, type] of Object.entries(Schema.types(schema))) {
      const updater = MonarchType.updater(type as AnyMonarchType);
      if (updater) {
        updates[key as keyof InferSchemaOutput<T>] = updater();
      }
    }
    return updates;
  }
}

/**
 * Creates a type-safe schema definition for a MongoDB collection.
 *
 * @typeParam TName - Collection name
 * @typeParam TTypes - Field type definitions
 * @param name - Collection name
 * @param types - Object defining field types
 * @returns Schema instance for the collection
 */
export function createSchema<TName extends string, TTypes extends Record<string, AnyMonarchType>>(
  name: TName,
  types: TTypes,
): Schema<TName, TTypes, {}, {}> {
  return new Schema(name, types, {});
}
