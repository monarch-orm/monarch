import { detectProjection } from "../collection/projection";
import type { Projection } from "../collection/types/query-options";
import { MonarchError } from "../errors";
import { mergeRelations, type AnyRelation, type RelationsFn, type SchemasRelations } from "../relations/relations";
import { MonarchObject, object } from "../types";
import { MonarchObjectId, objectId } from "../types/objectId";
import { MonarchNullable, MonarchOptional, MonarchType, type AnyMonarchType } from "../types/type";
import type { MergeAll, MergeN1All, Pretty, RequiredObject } from "../utils/type-helpers";
import type { SchemaIndexes } from "./indexes";
import type { SchemaSearchIndexes } from "./search-indexes";
import type {
  InferSchemaData,
  InferSchemaInput,
  InferSchemaOutput,
  InferSchemaTypes,
  UpdateFilter,
  WithObjectId,
} from "./type-helpers";
import { updateParser } from "./update";
import type { SchemaValidation } from "./validation";
import type { AnyVirtual, SchemaVirtuals, Virtual } from "./virtuals";

type SchemaOmit<TTypes extends Record<string, AnyMonarchType>> = {
  [K in keyof TTypes]?: true;
};

export type AnySchema = Schema<any, any, any, any, any>;

/**
 * Defines the structure and behavior of a MongoDB collection.
 *
 */
export class Schema<
  TName extends string,
  TTypes extends Record<string, AnyMonarchType>,
  TOmit extends SchemaOmit<TTypes>,
  TVirtuals extends Record<string, AnyVirtual>,
  TRenames extends Record<string, string>,
> {
  private type: MonarchObject<TTypes>;
  private update?: () => UpdateFilter<any>;

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
      indexes?: SchemaIndexes<TTypes>;
      searchIndexes?: SchemaSearchIndexes<TTypes>;
      validation?: SchemaValidation;
      virtuals?: SchemaVirtuals<TTypes, TVirtuals>;
      renames?: TRenames;
    },
  ) {
    this.type = object(types);
  }

  /**
   * Specifies fields to omit from query output.
   *
   * @param omit - Object specifying which fields to omit
   * @returns Schema instance with omit configuration
   */
  public omit<TOmit extends SchemaOmit<TTypes>>(omit: TOmit) {
    const schema = this as unknown as Schema<TName, TTypes, TOmit, TVirtuals, TRenames>;
    schema.options.omit = omit;
    return schema;
  }

  /**
   * Adds virtual computed fields to the schema.
   *
   * @param virtuals - Object defining virtual fields
   * @returns Schema instance with virtual fields configured
   */
  public virtuals<TVirtuals extends Record<string, Virtual<Pretty<TTypes>, any, any>>>(
    virtuals: SchemaVirtuals<TTypes, TVirtuals>,
  ) {
    const schema = this as unknown as Schema<TName, TTypes, TOmit, TVirtuals, TRenames>;
    schema.options.virtuals = virtuals;
    return schema;
  }

  /**
   * Adds renamed fields to the schema.
   *
   * @param renames - Object defining renamed fields
   * @returns Schema instance with renamed fields configured
   */
  public rename<const TRenames extends { [K in "_id" | keyof TTypes]?: string }>(renames: TRenames) {
    const schema = this as unknown as Schema<TName, TTypes, TOmit, TVirtuals, RequiredObject<TRenames>>;
    schema.options.renames = renames as unknown as RequiredObject<TRenames>;
    return schema;
  }

  /**
   * Defines the indexes for the schema.
   *
   * This method allows you to specify indexes that should be created for the schema.
   *
   * @param indexes - A function that defines the indexes to be created.
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
  public indexes(indexes: SchemaIndexes<TTypes>) {
    this.options.indexes = indexes;
    return this;
  }

  /**
   * Defines the search indexes for the schema.
   *
   * Search indexes are only supported on MongoDB Atlas clusters and are applied during initialization.
   *
   * @param searchIndexes - A function that defines the search indexes to be created.
   * @returns The current schema instance for method chaining.
   *
   * @example
   * const articleSchema = createSchema("articles", {
   *   title: string(),
   *   body: string(),
   *   embedding: array(number()),
   * }).searchIndexes(({ searchIndex, vectorSearchIndex }) => ({
   *   fullText: searchIndex("articles_search", {
   *     mappings: { dynamic: false, fields: { title: { type: "string" }, body: { type: "string" } } },
   *   }),
   *   semantic: vectorSearchIndex("articles_vector", {
   *     fields: [{ type: "vector", path: "embedding", numDimensions: 1536, similarity: "cosine" }],
   *   }),
   * }));
   */
  public searchIndexes(searchIndexes: SchemaSearchIndexes<TTypes>) {
    this.options.searchIndexes = searchIndexes;
    return this;
  }

  /**
   * Sets MongoDB document validation for this schema.
   *
   * This is applied when the collection is initialized.
   */
  public validation(validation: SchemaValidation) {
    this.options.validation = validation;
    return this;
  }

  /**
   * Sets values to include in every update operation.
   *
   * Useful for fields like `updatedAt`. If a function is provided, it is called for each update.
   */
  public onUpdate(update: () => UpdateFilter<this>) {
    this.update = update;
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
   * Runs schema parsing, transforms, defaults, and validations.
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
   * Validates update input and merges schema-level `onUpdate()` values.
   *
   * @param schema - Schema instance
   * @param update - Update data with dot-path keys and their new values
   * @param upsert - Upsert parses $setOnInsert if true
   * @returns Parsed update data
   */
  public static updateInput<T extends AnySchema>(schema: T, update: UpdateFilter<T>, upsert: boolean) {
    return updateParser(schema.type, schema.update, update, upsert);
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
    // rename projected fields
    if (schema.options.renames) {
      for (const field in schema.options.renames) {
        const newField = schema.options.renames[field];
        if (field in output) {
          // add the new field only if it does not conflict with an existing output field
          if (!(newField in output)) {
            // @ts-ignore
            output[newField] = output[field];
          }
          // @ts-ignore
          delete output[field]; // always delete the renamed field
        }
      }
    }
    return output;
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
): Schema<TName, Pretty<WithObjectId<TTypes>>, {}, {}, {}> {
  let schemaTypes = { ...types } as Pretty<WithObjectId<TTypes>>;
  if (!schemaTypes._id || schemaTypes._id instanceof MonarchObjectId) {
    schemaTypes._id = objectId().optional();
  } else if (MonarchType.isInstanceOf(schemaTypes._id, MonarchNullable)) {
    throw new MonarchError("schema _id cannot be nullable");
  } else if (
    MonarchType.isInstanceOf(schemaTypes._id, MonarchOptional) &&
    !MonarchType.isInstanceOf(schemaTypes._id, MonarchObjectId)
  ) {
    throw new MonarchError("schema _id may only be optional when it is objectId()");
  }
  return new Schema(name, schemaTypes, {});
}

export class Schemas<
  TSchemas extends Record<string, AnySchema>,
  TRelations extends Record<string, Record<string, AnyRelation>> = {},
> {
  constructor(
    public schemas: TSchemas,
    public relations: TRelations,
  ) {
    this.withRelations = this.withRelations.bind(this);
  }

  /**
   * Defines relationships between schemas.
   *
   * Relations use field lookups to join documents across collections. To ensure fast
   * population queries, **you must create indexes on the fields used in each relation**.
   *
   * For every relation, MongoDB queries the target collection by the `to` field using
   * the values collected from the `from` field. Without an index on the `to` field,
   * MongoDB performs a full collection scan for each population.
   *
   * **Index recommendation:**
   * - If `to` is `_id`, it is already indexed — no action needed.
   * - For any other `to` field, create an **ascending index** (`{ field: 1 }`) on the
   *   target schema using `.indexes()`.
   * - A `from` field does not need an index for the join, but you can index it on
   *   the source schema if you filter or sort by it in your own queries.
   *
   * @example
   * // Relation: posts.authorId → users._id
   * // `to` is _id which is already indexed.
   * // You may index `authorId` on posts  (the `from` field) for filtering posts by author.
   * const userSchema = createSchema("users", {
   *   name: string(),
   * });
   * const postSchema = createSchema("posts", {
   *   title: string(),
   *   authorId: objectId(),
   * }).indexes(({ createIndex }) => ({
   *   byAuthor: createIndex({ authorId: 1 }),
   * }));
   *
   * const schemas = defineSchemas({ userSchema, postSchema });
   * const relations = schemas.withRelations((r) => ({
   *   posts: {
   *     author: r.one.users({ from: r.posts.authorId, to: r.users._id }),
   *   },
   * }));
   *
   * @example
   * // Relation: comments.postSlug → posts.slug
   * // `to` is not _id, so index `slug` on the target schema (posts).
   * // You may also index `postSlug` on comments (the `from` field) for filtering.
   * const postSchema = createSchema("posts", {
   *   slug: string(),
   *   title: string(),
   * }).indexes(({ createIndex }) => ({
   *   slug: createIndex({ slug: 1 }),
   * }));
   * const commentSchema = createSchema("comments", {
   *   body: string(),
   *   postSlug: string(),
   * }).indexes(({ createIndex }) => ({
   *   byPostSlug: createIndex({ postSlug: 1 }),
   * }));
   *
   * const schemas = defineSchemas({ postSchema, commentSchema });
   * const relations = schemas.withRelations((r) => ({
   *   comments: {
   *     post: r.one.posts({ from: r.comments.postSlug, to: r.posts.slug }),
   *   },
   * }));
   *
   * @example
   * // Many relation (foreign key): users._id → posts.authorId
   * // `to` is posts.authorId which is not _id, so index it on posts.
   * const userSchema = createSchema("users", {
   *   name: string(),
   * });
   * const postSchema = createSchema("posts", {
   *   title: string(),
   *   authorId: objectId(),
   * }).indexes(({ createIndex }) => ({
   *   authorId: createIndex({ authorId: 1 }),
   * }));
   *
   * const schemas = defineSchemas({ userSchema, postSchema });
   * const relations = schemas.withRelations((r) => ({
   *   users: {
   *     posts: r.many.posts({ from: r.users._id, to: r.posts.authorId }),
   *   },
   * }));
   *
   * @example
   * // Many relation (array `to` field): posts._id → tags.postIds
   * // `to` is tags.postIds which is an array field and not _id.
   * // MongoDB queries the target by the `to` field, so index it.
   * // MongoDB automatically uses a multikey index to cover each element in the array.
   * // An array `from` field does not need an index for the join itself.
   * // You can index it if you filter the source collection by that field directly.
   * const tagSchema = createSchema("tags", {
   *   name: string(),
   *   postIds: array(objectId()),
   * }).indexes(({ createIndex }) => ({
   *   postIds: createIndex({ postIds: 1 }),
   * }));
   * const postSchema = createSchema("posts", {
   *   title: string(),
   * });
   *
   * const schemas = defineSchemas({ tagSchema, postSchema });
   * const relations = schemas.withRelations((r) => ({
   *   posts: {
   *     tags: r.many.tags({ from: r.posts._id, to: r.tags.postIds }),
   *   },
   * }));
   */
  public withRelations<T extends SchemasRelations<TSchemas>>(fn: RelationsFn<TSchemas, TRelations, T>) {
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
