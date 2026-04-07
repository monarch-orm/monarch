import { MongoClient, Collection as MongoCollection, type Db, type MongoClientOptions } from "mongodb";
import { version } from "../package.json";
import { Collection } from "./collection/collection";
import { applyIndexes } from "./schema/indexes";
import type { AnySchema, Schemas } from "./schema/schema";
import { Schema } from "./schema/schema";
import { getValidator, type SchemaValidation, type Validator } from "./schema/validation";
import type { DbCollections } from "./type-helpers";
import { createAsyncLimiter, createAsyncResolver, type AsyncResolver } from "./utils/misc";

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

export type DatabaseOptions = {
  validation?: SchemaValidation;
  initialize?: boolean;
};

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
  /** Collection read promises */
  private readyPromises: Record<string, AsyncResolver>;

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
    private options?: DatabaseOptions,
  ) {
    this.schemas = schemas.schemas;
    this.relations = schemas.relations;
    this.collections = {} as typeof this.collections;
    this.readyPromises = {};

    const collectionsInit: CollectionInit[] = [];
    for (const [key, schema] of Object.entries(this.schemas as Record<string, AnySchema>)) {
      // Create resolver which resolves immediately if initialize is false
      const resolver = createAsyncResolver();
      this.readyPromises[schema.name] = resolver;
      if (options?.initialize ?? true) {
        collectionsInit.push({ schema, defaultValidation: options?.validation, resolver });
      } else resolver.resolve();

      this.collections[key as keyof typeof this.collections] = new Collection(
        db,
        resolver.promise,
        this.relations,
        schema,
      );
    }
    if (collectionsInit.length) initializeCollections(db, collectionsInit);

    this.initialize = this.initialize.bind(this);
    this.use = this.use.bind(this);
    this.listCollections = this.listCollections.bind(this);
  }

  /**
   * Promise that resolves when all collection initialization tasks complete.
   * This includes collection creation, index creation and document validation setup.
   */
  public get isReady() {
    return Promise.all(Object.values(this.readyPromises).map((r) => r.promise)).then<void>(() => undefined);
  }

  /**
   * Creates collections with indexes and document validation if provided.
   *
   * @param options - Init options
   */
  public async initialize(options?: InitOptions<keyof TSchemas["schemas"] & string>) {
    const promises: Promise<void>[] = [];
    const collections = Object.values(this.collections).map((c: Collection<any, any>): CollectionInit => {
      const resolver = createAsyncResolver();
      promises.push(resolver.promise);
      return { schema: c.schema, defaultValidation: this.options?.validation, resolver };
    });
    initializeCollections(this.db, collections, options);
    return Promise.all(promises);
  }

  /**
   * Creates a collection instance from a schema.
   *
   * @param schema - Schema definition
   * @returns Collection instance for the schema
   */
  public use<S extends AnySchema>(schema: S): Collection<S, TSchemas["relations"]> {
    return new Collection(
      this.db,
      this.readyPromises[schema.name]?.promise ?? Promise.resolve(),
      this.relations[schema.name],
      schema,
    );
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
export function createDatabase<T extends Schemas<any, any>>(
  db: Db,
  schemas: T,
  options?: DatabaseOptions,
): Database<T> {
  return new Database(db, schemas, options);
}

type InitOptions<T extends string> = {
  indexes?: boolean;
  validation?: boolean;
  collections?: Partial<Record<T, true>>;
};

type CollectionInit = {
  schema: AnySchema;
  defaultValidation?: SchemaValidation;
  resolver: AsyncResolver;
};

function initializeCollections(db: Db, collections: CollectionInit[], options?: InitOptions<any>) {
  const run = createAsyncLimiter(10);
  const existingPromise = db
    .listCollections({}, { nameOnly: true })
    .toArray()
    .then((colls) => new Set(colls.map((c) => c.name)));

  for (const c of collections) {
    // Skip disabled collections
    const enabled = options?.collections ? options.collections[c.schema.name] === true : true;
    if (!enabled) {
      c.resolver.resolve();
      continue;
    }

    run(async () => {
      const existing = await existingPromise;
      const exists = existing.has(c.schema.name);
      const schemaOptions = Schema.options(c.schema);

      // Get schema validation
      let validation: (SchemaValidation & { validator: Validator }) | undefined;
      const validationOptions = schemaOptions.validation ?? c.defaultValidation;
      if ((options?.validation ?? true) && validationOptions) {
        validation = { ...validationOptions, validator: getValidator(c.schema) };
      }

      // Create or modify collection with document validation
      let coll: MongoCollection;
      if (!exists) {
        coll = await db.createCollection(c.schema.name, validation);
      } else {
        coll = db.collection(c.schema.name);
        if (validation) await db.command({ collMod: c.schema.name, ...validation });
      }

      // Create schema indexes
      if ((options?.indexes ?? true) && schemaOptions.indexes) {
        await applyIndexes(coll, schemaOptions.indexes);
      }
    })
      .then(c.resolver.resolve)
      .catch(c.resolver.reject);
  }
}
