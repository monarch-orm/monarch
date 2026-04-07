import type {
  CreateIndexesOptions,
  IndexDescriptionInfo,
  IndexSpecification,
  Collection as MongoCollection,
} from "mongodb";
import { MonarchError } from "../errors";
import type { AnyMonarchType } from "../types/type";
import type { CreateIndexKey } from "./type-helpers";

export type CreateIndex<T extends Record<string, AnyMonarchType>> = (
  key: CreateIndexKey<T>,
  options?: CreateIndexesOptions,
) => SchemaIndex<T>;
export type UniqueIndex<T extends Record<string, AnyMonarchType>> = (
  key: Exclude<keyof CreateIndexKey<T>, "_id">,
) => SchemaIndex<T>;

export type SchemaIndex<T extends Record<string, AnyMonarchType>> = {
  key: CreateIndexKey<T>;
  options?: CreateIndexesOptions;
};

export type SchemaIndexes<T extends Record<string, AnyMonarchType>> = (options: {
  createIndex: CreateIndex<T>;
  unique: UniqueIndex<T>;
}) => {
  [k: string]: SchemaIndex<T>;
};

export function makeIndexes<T extends Record<string, AnyMonarchType>>(indexesFn: SchemaIndexes<T>) {
  return indexesFn({
    createIndex: (key, options) => ({ key, options }),
    unique: (key) => ({ key: { [key]: 1 } as CreateIndexKey<T>, options: { unique: true } }),
  });
}

export async function applyIndexes(coll: MongoCollection, indexesFn: SchemaIndexes<any>) {
  const indexes = Object.entries(makeIndexes(indexesFn));
  const desiredIndexes = new Map(indexes.map(([_, idx]) => [JSON.stringify(idx.key), idx.options ?? {}]));
  const existingIndexes = await coll.indexes();
  const indexesToDrop: string[] = [];

  for (const idx of existingIndexes) {
    if (idx.name === "_id_") continue;
    const match = desiredIndexes.get(JSON.stringify(idx.key));
    if (!match || isStaleIndex(idx, match)) {
      indexesToDrop.push(idx.name!);
    }
  }

  // Drop stale indexes
  if (indexesToDrop.length) {
    const dropIndexesPromises = indexesToDrop.map(
      async (name) =>
        await coll.dropIndex(name).catch((error) => {
          throw new MonarchError(`failed to drop index '${name}': ${error}`, error);
        }),
    );
    await Promise.all(dropIndexesPromises);
  }

  // Create desired indexes
  const indexesPromises = indexes.map(async ([idx, { key, options }]) => {
    await coll.createIndex(key as IndexSpecification, options).catch((error) => {
      throw new MonarchError(`failed to create index '${idx}': ${error}`, error);
    });
  });
  await Promise.all(indexesPromises);
}

const MONGODB_INDEX_DEFAULTS: CreateIndexesOptions = {
  // Standard Properties
  unique: false,
  sparse: false,
  background: true,
  hidden: false,
  expireAfterSeconds: undefined,

  // Advanced Queries
  partialFilterExpression: undefined,
  collation: undefined,
  wildcardProjection: undefined,

  // Text Index Metadata
  weights: undefined,
  default_language: "english",
  language_override: "language",

  // Geospatial Metadata
  bits: 26,
  min: -180,
  max: 180,
};

export function isStaleIndex(existingIndex: IndexDescriptionInfo, desiredIndex: CreateIndexesOptions) {
  // Detect change in index name
  if (desiredIndex.name && existingIndex.name !== desiredIndex.name) {
    return true;
  }

  const allKeys = new Set([
    ...Object.keys(existingIndex),
    ...Object.keys(desiredIndex || {}),
    ...Object.keys(MONGODB_INDEX_DEFAULTS),
  ]);
  // Skip internal options
  ["ns", "key", "name", "v", "textIndexVersion", "2dsphereIndexVersion"].forEach(allKeys.delete);

  for (const key of allKeys) {
    const k = key as keyof CreateIndexesOptions;
    const desired = desiredIndex[k] ?? MONGODB_INDEX_DEFAULTS[k];
    const existing = existingIndex[k] ?? MONGODB_INDEX_DEFAULTS[k];

    if (typeof desired === "object" && desired !== null) {
      if (JSON.stringify(existing) !== JSON.stringify(desired)) {
        return true;
      }
    } else if (existing !== desired) {
      return true;
    }
  }
  return false;
}
