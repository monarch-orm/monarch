import { MongoClient, type Db, type MongoClientOptions } from "mongodb";
import { version } from "../package.json";
import { Collection } from "./collection/collection";
import type { BoolProjection, WithProjection } from "./collection/types/query-options";
import { MonarchError } from "./errors";
import { Relations, type AnyRelations } from "./relations/relations";
import type { InferRelationObjectPopulation, Population, PopulationBaseOptions } from "./relations/type-helpers";
import type { AnySchema } from "./schema/schema";
import type { InferSchemaInput, InferSchemaOmit, InferSchemaOutput } from "./schema/type-helpers";
import type { ExtractObject, IdFirst, Merge, Pretty } from "./utils/type-helpers";

/**
 * Creates a MongoDB client configured with Monarch ORM driver information.
 *
 * @param uri - MongoDB connection URI
 * @param options - MongoDB client options
 * @returns Configured MongoClient instance
 */
export function createClient(uri: string, options: MongoClientOptions = {}) {
  if (!options.driverInfo) {
    options.driverInfo = { name: "Monarch ORM", version };
  }
  return new MongoClient(uri, options);
}

/**
 * Manages database collections and relations for MongoDB operations.
 *
 */
export class Database<
  TSchemas extends Record<string, AnySchema> = {},
  TRelations extends Record<string, Relations<any, any>> = {},
> {
  /** Relation definitions for each schema */
  public relations: DbRelations<TRelations>;
  /** Collection instances for each schema */
  public collections: DbCollections<TSchemas, DbRelations<TRelations>>;

  /**
   * Creates a Database instance with collections and relations.
   *
   * @param db - MongoDB database instance
   * @param schemas - Schema definitions for collections
   * @param relations - Relation definitions between schemas
   * @throws {MonarchError} If duplicate schema or relation names are found
   */
  constructor(
    public db: Db,
    schemas: TSchemas,
    relations: TRelations,
  ) {
    const _relations = {} as DbRelations<TRelations>;
    const _seenRelations = new Set<string>();
    for (const relation of Object.values(relations)) {
      if (_seenRelations.has(relation.name)) {
        throw new MonarchError(`Relations for schema '${relation.name}' already exists.`);
      }
      _seenRelations.add(relation.name);
      _relations[relation.name as keyof typeof _relations] = {
        ..._relations[relation.name as keyof typeof _relations],
        ...relation.relations,
      };
    }
    this.relations = _relations;

    const _collections = {} as DbCollections<TSchemas, DbRelations<TRelations>>;
    const _seenCollection = new Set<string>();
    for (const [key, schema] of Object.entries(schemas)) {
      if (_seenCollection.has(schema.name)) {
        throw new MonarchError(`Schema with name '${schema.name}' already exists.`);
      }
      _seenCollection.add(schema.name);
      _collections[key as keyof typeof _collections] = new Collection(
        db,
        schema,
        this.relations,
      ) as unknown as (typeof _collections)[keyof typeof _collections];
    }
    this.collections = _collections;

    this.use = this.use.bind(this);
    this.listCollections = this.listCollections.bind(this);
  }

  /**
   * Creates a collection instance from a schema.
   *
   * @param schema - Schema definition
   * @returns Collection instance for the schema
   */
  public use<S extends AnySchema>(schema: S): Collection<S, DbRelations<TRelations>> {
    return new Collection(this.db, schema, this.relations[schema.name as keyof DbRelations<TRelations>]);
  }

  /**
   * Lists all collection keys defined in the database.
   *
   * @returns Array of collection keys
   */
  public listCollections() {
    return Object.keys(this.collections) as (keyof this["collections"])[];
  }
}

/**
 * Creates a database instance with collections and relations.
 *
 * @param db - MongoDB database instance
 * @param schemas - Object containing schema and relation definitions
 * @returns Database instance with initialized collections and relations
 */
export function createDatabase<T extends Record<string, AnySchema | Relations<any, any>>>(
  db: Db,
  schemas: T,
): Database<ExtractObject<T, AnySchema>, ExtractObject<T, Relations<any, any>>> {
  const collections = {} as ExtractObject<T, AnySchema>;
  const relations = {} as ExtractObject<T, Relations<any, any>>;

  for (const [key, schema] of Object.entries(schemas)) {
    if (schema instanceof Relations) {
      relations[key as keyof typeof relations] = schema as (typeof relations)[keyof typeof relations];
    } else {
      collections[key as keyof typeof collections] = schema as (typeof collections)[keyof typeof collections];
    }
  }

  return new Database(db, collections, relations);
}

type DbCollections<TSchemas extends Record<string, AnySchema>, TRelations extends Record<string, AnyRelations>> = {
  [K in keyof TSchemas]: Collection<TSchemas[K], TRelations>;
} & {};
type DbRelations<TRelations extends Record<string, Relations<any, any>>> = {
  [K in keyof TRelations as TRelations[K]["name"]]: TRelations[K]["relations"];
} & {};

/**
 * Infers the input type for a collection in a database.
 *
 */
export type InferInput<
  TDatabase extends Database<any, any>,
  TCollection extends keyof TDatabase["collections"],
> = InferSchemaInput<TDatabase["collections"][TCollection]["schema"]>;

/**
 * Infers the output type for a collection query with projection and population options.
 *
 */
export type InferOutput<
  TDatabase extends Database<any, any>,
  TCollection extends keyof TDatabase["collections"],
  TOptions extends PopulationBaseOptions<
    InferSchemaOutput<TDatabase["collections"][TCollection]["schema"]>,
    TDatabase["relations"],
    TCollection
  > = {},
> = Pretty<
  IdFirst<
    Merge<
      WithProjection<
        TOptions["select"] extends BoolProjection<any> ? "select" : "omit",
        TOptions["select"] extends BoolProjection<any>
          ? keyof TOptions["select"]
          : unknown extends TOptions["omit"]
            ? InferSchemaOmit<TDatabase["collections"][TCollection]["schema"]>
            : keyof TOptions["omit"],
        InferSchemaOutput<TDatabase["collections"][TCollection]["schema"]>
      >,
      TOptions["populate"] extends Population<any, any>
        ? InferRelationObjectPopulation<TDatabase["relations"], TCollection, TOptions["populate"]>
        : {}
    >
  >
>;
