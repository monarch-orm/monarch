import { MongoClient, type Db, type MongoClientOptions } from "mongodb";
import { version } from "../package.json";
import { Collection } from "./collection/collection";
import type { BoolProjection, WithProjection } from "./collection/types/query-options";
import { Schemas, type AnyRelations } from "./relations/relations";
import type { InferRelationObjectPopulation, Population, PopulationBaseOptions } from "./relations/type-helpers";
import type { AnySchema } from "./schema/schema";
import type { InferSchemaInput, InferSchemaOmit, InferSchemaOutput } from "./schema/type-helpers";
import type { IdFirst, Merge, Pretty } from "./utils/type-helpers";

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
 * Database collections and relations for MongoDB operations.
 */
export class Database<TSchemas extends Schemas<any, any>> {
  /** Schema definitions*/
  public schemas: TSchemas["schemas"];
  /** Relation definitions*/
  public relations: TSchemas["relations"];
  /** Collection instances */
  public collections: DbCollections<TSchemas["schemas"], TSchemas["relations"]>;

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
  ) {
    this.schemas = schemas.schemas;
    this.relations = schemas.relations;
    this.collections = {} as typeof this.collections;

    for (const [key, schema] of Object.entries(this.schemas as Record<string, AnySchema>)) {
      this.collections[key as keyof typeof this.collections] = new Collection(db, schema, this.relations);
    }

    this.use = this.use.bind(this);
    this.listCollections = this.listCollections.bind(this);
  }

  /**
   * Creates a collection instance from a schema.
   *
   * @param schema - Schema definition
   * @returns Collection instance for the schema
   */
  public use<S extends AnySchema>(schema: S): Collection<S, TSchemas["relations"]> {
    return new Collection(this.db, schema, this.relations[schema.name]);
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
export function createDatabase<T extends Schemas<any, any>>(db: Db, schemas: T): Database<T> {
  return new Database(db, schemas);
}

type DbCollections<TSchemas extends Record<string, AnySchema>, TRelations extends Record<string, AnyRelations>> = {
  [K in keyof TSchemas]: Collection<TSchemas[K], TRelations>;
} & {};

/**
 * Infers the input type for a collection in a database.
 */
export type InferInput<
  TDatabase extends Database<any>,
  TCollection extends keyof TDatabase["collections"],
> = InferSchemaInput<TDatabase["collections"][TCollection]["schema"]>;

/**
 * Infers the output type for a collection query with projection and population options.
 */
export type InferOutput<
  TDatabase extends Database<any>,
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
