import { MongoClient, type Db, type MongoClientOptions } from "mongodb";
import { Collection } from "./collection";
import { MonarchError } from "./errors";
import { type AnyRelations, Relations } from "./relations/relations";
import type { AnySchema } from "./schema/schema";
import type { ExtractObject } from "./type-helpers";

export type DbCollections<
  TSchemas extends Record<string, AnySchema>,
  TRelations extends Record<string, AnyRelations>,
> = {
  [K in keyof TSchemas]: Collection<TSchemas[K], TRelations>;
} & {};
export type DbRelations<
  TRelations extends Record<string, Relations<any, any>>,
> = {
  [K in keyof TRelations as TRelations[K]["name"]]: TRelations[K]["relations"];
} & {};

export class Database<
  TSchemas extends Record<string, AnySchema> = {},
  TRelations extends Record<string, Relations<any, any>> = {},
> {
  public relations: DbRelations<TRelations>;
  public collections: DbCollections<TSchemas, DbRelations<TRelations>>;

  constructor(
    public db: Db,
    schemas: TSchemas,
    relations: TRelations,
  ) {
    const _relations = {} as DbRelations<TRelations>;
    for (const relation of Object.values(relations)) {
      _relations[relation.name as keyof typeof _relations] = {
        ..._relations[relation.name as keyof typeof _relations],
        ...relation.relations,
      };
    }
    this.relations = _relations;

    const _collections = {} as DbCollections<TSchemas, DbRelations<TRelations>>;
    const _collectionNames = new Set<string>();
    for (const [key, schema] of Object.entries(schemas)) {
      if (_collectionNames.has(schema.name)) {
        throw new MonarchError(
          `Schema with name '${schema.name}' already exists.`,
        );
      }
      _collectionNames.add(schema.name);
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

  public use<S extends AnySchema>(
    schema: S,
  ): Collection<S, DbRelations<TRelations>[S["name"]]> {
    return new Collection(
      this.db,
      schema,
      this.relations[schema.name as keyof DbRelations<TRelations>],
    );
  }

  public listCollections() {
    return Object.keys(this.collections) as (keyof this["collections"])[];
  }
}

export function createDatabase<
  T extends Record<string, AnySchema | Relations<any, any>>,
>(
  db: Db,
  schemas: T,
): Database<
  ExtractObject<T, AnySchema>,
  ExtractObject<T, Relations<any, any>>
> {
  const collections = {} as ExtractObject<T, AnySchema>;
  const relations = {} as ExtractObject<T, Relations<any, any>>;

  for (const [key, schema] of Object.entries(schemas)) {
    if (schema instanceof Relations) {
      relations[key as keyof typeof relations] =
        schema as (typeof relations)[keyof typeof relations];
    } else {
      collections[key as keyof typeof collections] =
        schema as (typeof collections)[keyof typeof collections];
    }
  }

  return new Database(db, collections, relations);
}

export function createClient(uri: string, options?: MongoClientOptions) {
  return new MongoClient(uri, options);
}
