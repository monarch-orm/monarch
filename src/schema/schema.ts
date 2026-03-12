import type { Projection } from "../collection/types/query-options";
import { detectProjection } from "../collection/utils/projection";
import { mergeRelations, type AnyRelation, type RelationsFn, type SchemasRelations } from "../relations/relations";
import { MonarchObject, object } from "../types";
import { objectId } from "../types/objectId";
import { MonarchType, type AnyMonarchType } from "../types/type";
import type { MergeAll, MergeN1All, Pretty, WithOptionalId } from "../utils/type-helpers";
import type { SchemaIndexes } from "./indexes";
import type { InferSchemaData, InferSchemaInput, InferSchemaOutput, InferSchemaTypes } from "./type-helpers";
import type { AnyVirtual, SchemaVirtuals, Virtual } from "./virtuals";

type SchemaOmit<TTypes extends Record<string, AnyMonarchType>> = {
  [K in keyof WithOptionalId<TTypes>]?: true;
};

export type AnySchema = Schema<any, any, any, any>;

/**
 * Defines the structure and behavior of a MongoDB collection.
 *
 */
export class Schema<
  TName extends string,
  TTypes extends Record<string, AnyMonarchType>,
  TOmit extends SchemaOmit<TTypes> = {},
  TVirtuals extends Record<string, AnyVirtual> = {},
> {
  private type: MonarchObject<TTypes>;

  /**
   * Creates a Schema instance.
   *
   * @param name - Collection name
   * @param types - Field type definitions
   * @param options - Schema options including omit, virtuals, and indexes
   */
  constructor(
    public name: TName,
    private types: TTypes,
    private options: {
      omit?: SchemaOmit<TTypes>;
      virtuals?: SchemaVirtuals<TTypes, TVirtuals>;
      indexes?: SchemaIndexes<TTypes>;
    },
  ) {
    // @ts-ignore
    if (!types._id) types._id = objectId().optional();
    this.type = object(types);
  }

  /**
   * Specifies fields to omit from query output.
   *
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
   * @param schema - Schema instance
   * @returns Field type definitions
   */
  public static types<T extends AnySchema>(schema: T): InferSchemaTypes<T> {
    return schema.types;
  }

  /**
   * Retrieves the schema options from a schema.
   *
   * @param schema - Schema instance
   * @returns Schema options including omit, virtuals, and indexes
   */
  public static options<T extends AnySchema>(schema: T) {
    return schema.options;
  }

  /**
   * Parses and validates input data according to schema type definitions.
   *
   * @param schema - Schema instance
   * @param input - Input data to parse
   * @returns Parsed data ready for database storage
   */
  public static input<T extends AnySchema>(schema: T, input: InferSchemaInput<T>) {
    const parser = MonarchType.parser(schema.type);
    return parser(input) as InferSchemaData<T>;
  }

  /**
   * Parses and validates update data for dot-path update operations.
   *
   * @param schema - Schema instance
   * @param update - Update data with dot-path keys and their new values
   * @returns Parsed update data
   */
  public static updateInput<T extends AnySchema>(schema: T, update: Record<string, unknown>) {
    const parsed = {} as Record<string, unknown>;
    for (const [path, value] of Object.entries(update)) {
      const segments = path.split(".");
      const parser = MonarchType.parserAt(schema.type, segments, 0);
      parsed[path] = parser(value);
    }
    return parsed;
  }

  /**
   * Transforms database data to output format with virtual fields and projections.
   *
   * @param schema - Schema instance
   * @param data - Database data
   * @param projection - Field projection configuration
   * @param forceOmit - Fields to force omit from output
   * @returns Output data
   */
  public static output<T extends AnySchema>(
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
 * Creates a schema definition for a MongoDB collection.
 *
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

export class Schemas<
  TSchemas extends Record<string, AnySchema>,
  TRelations extends Record<string, Record<string, AnyRelation> | undefined> = {},
> {
  constructor(
    public schemas: TSchemas,
    public relations: TRelations,
  ) {
    this.withRelations = this.withRelations.bind(this);
  }

  public withRelations<T extends SchemasRelations<TSchemas>>(fn: RelationsFn<TSchemas, T>) {
    const mergedRelations = mergeRelations(this.schemas, this.relations, fn);
    return new Schemas(this.schemas, mergedRelations);
  }
}

/**
 * Define schemas.
 */
export function defineSchemas<TSchemas extends Record<string, AnySchema> = {}>(schemas: TSchemas) {
  const mappedSchemas: Record<string, AnySchema> = {};

  for (const schema of Object.values(schemas)) {
    if (mappedSchemas[schema.name]) {
      throw new Error(`Schema with name '${schema.name}' already exists.`);
    }
    mappedSchemas[schema.name] = schema;
  }

  return new Schemas<MappedSchemas<TSchemas>, {}>(mappedSchemas as MappedSchemas<TSchemas>, {});
}

/**
 * Merge multiple schema definitions into a single instance,
 * merging their schemas and relations.
 */
export function mergeSchemas<T extends Schemas<any, any>[]>(...schemas: T) {
  let mergedSchemas: Record<string, AnySchema> = {};
  const mergedRelations: Record<string, any> = {};
  for (const s of schemas) {
    mergedSchemas = { ...mergedSchemas, ...s.schemas };
    for (const [key, relations] of Object.entries(s.relations as Record<string, Record<string, AnyRelation>>)) {
      if (key in mergedRelations) {
        mergedRelations[key] = { ...mergedRelations[key], ...relations };
      } else {
        mergedRelations[key] = relations;
      }
    }
  }
  return new Schemas(
    mergedSchemas as MergeAll<{ [K in keyof T]: T[K]["schemas"] }>,
    mergedRelations as MergeN1All<{ [K in keyof T]: T[K]["relations"] }>,
  );
}

type MappedSchemas<TSchemas extends Record<string, AnySchema>> = {
  [K in keyof TSchemas as TSchemas[K]["name"]]: TSchemas[K];
} & {};
