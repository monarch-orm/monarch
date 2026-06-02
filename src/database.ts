import { MongoClient, Collection as MongoCollection, type Db, type MongoClientOptions } from "mongodb";
import { version } from "../package.json";
import { Collection } from "./collection/collection";
import { applyIndexes } from "./schema/indexes";
import type { AnySchema, Schemas } from "./schema/schema";
import { Schema } from "./schema/schema";
import { applySearchIndexes } from "./schema/search-indexes";
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
  protected schemas: TSchemas["schemas"];
  /** Relation definitions*/
  protected relations: TSchemas["relations"];
  /** Collection instances */
  public readonly collections: DbCollections<TSchemas["schemas"], TSchemas["relations"]>;
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
    public readonly db: Db,
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
   * @param options - Init options. Pass `true` to run all steps, or an object to selectively enable steps.
   * @param collections - Select collections. Omit to initialize all collections, or an object to selectively enable collections.
   */
  public async initialize(
    options?: InitOptions | true,
    collections?: InitCollections<keyof TSchemas["schemas"] & string>,
  ): Promise<void> {
    const promises: Promise<void>[] = [];
    const collectionInits = (Object.values(this.collections) as Collection<any, any>[])
      .filter((c) => !collections || collections[c.schema.name] === true)
      .map((c): CollectionInit => {
        const resolver = createAsyncResolver();
        promises.push(resolver.promise);
        return { schema: c.schema, defaultValidation: this.options?.validation, resolver };
      });
    initializeCollections(this.db, collectionInits, options);
    return Promise.all(promises).then<void>(() => undefined);
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
    return Object.keys(this.collections) as Extract<keyof this["collections"], string>[];
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

/**
 * Initialization options. When provided, only fields explicitly set to `true` will run.
 * When omitted, all initialization steps run.
 */
export type InitOptions = {
  /** Create or update schema indexes. */
  indexes?: true;
  /** Create or update search indexes. */
  searchIndexes?: true;
  /** Apply document validation rules. */
  validation?: true;
};

/**
 * Limit initialization to specific collections.
 * When provided, only collections with a `true` value will be initialized.
 */
type InitCollections<T extends string> = { [K in T]?: true };

type CollectionInit = {
  schema: AnySchema;
  defaultValidation?: SchemaValidation;
  resolver: AsyncResolver;
};

function initializeCollections(db: Db, collections: CollectionInit[], options?: InitOptions | true) {
  const opts = options === true ? undefined : options;
  const run = createAsyncLimiter(10);
  const existingPromise = db
    .listCollections({}, { nameOnly: true })
    .toArray()
    .then((colls) => new Set(colls.map((c) => c.name)));

  for (const c of collections) {
    run(async () => {
      const existing = await existingPromise;
      const exists = existing.has(c.schema.name);
      const schemaOptions = Schema.options(c.schema);

      // Get schema validation
      let validation: (SchemaValidation & { validator: Validator }) | undefined;
      const validationOptions = schemaOptions.validation ?? c.defaultValidation;
      if ((opts === undefined || opts.validation) && validationOptions) {
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
      if ((opts === undefined || opts.indexes) && schemaOptions.indexes) {
        await applyIndexes(coll, schemaOptions.indexes);
      }

      // Create schema search indexes
      if ((opts === undefined || opts.searchIndexes) && schemaOptions.searchIndexes) {
        await applySearchIndexes(coll, schemaOptions.searchIndexes);
      }
    })
      .then(c.resolver.resolve)
      .catch(c.resolver.reject);
  }
}
