import type { Document, Collection as MongoCollection } from "mongodb";
import { MonarchError } from "../errors";
import type { AnyMonarchType } from "../types/type";
import type { CreateIndexKey } from "./type-helpers";

export type SearchIndexDefinition<T extends Record<string, AnyMonarchType>> = {
  mappings?: {
    dynamic?: boolean;
    fields?: { [K in keyof CreateIndexKey<T>]?: Document };
  };
};
export type VectorSearchIndexDefinition<T extends Record<string, AnyMonarchType>> = {
  fields?: Array<{
    type: "vector" | "filter";
    path: keyof CreateIndexKey<T>;
    numDimensions?: number;
    similarity?: "euclidean" | "cosine" | "dotProduct";
    [key: string]: unknown;
  }>;
};
export type SchemaSearchIndexDefinition<T extends Record<string, AnyMonarchType>> =
  | SearchIndexDefinition<T>
  | VectorSearchIndexDefinition<T>;

export type SchemaSearchIndex<T extends Record<string, AnyMonarchType>> = {
  name: string;
  type?: "search" | "vectorSearch";
  definition: SchemaSearchIndexDefinition<T>;
};

export type SchemaSearchIndexes<T extends Record<string, AnyMonarchType>> = (options: {
  searchIndex: (name: string, definition: SearchIndexDefinition<T>) => SchemaSearchIndex<T>;
  vectorSearchIndex: (name: string, definition: VectorSearchIndexDefinition<T>) => SchemaSearchIndex<T>;
}) => Record<string, SchemaSearchIndex<T>>;

export function makeSearchIndexes<T extends Record<string, AnyMonarchType>>(fn: SchemaSearchIndexes<T>) {
  return fn({
    searchIndex: (name, definition) => ({ name, type: "search", definition }),
    vectorSearchIndex: (name, definition) => ({ name, type: "vectorSearch", definition }),
  });
}

type ExistingSearchIndex = {
  id: string;
  name: string;
  status: string;
  queryable: boolean;
  latestDefinition: Document;
};

export async function applySearchIndexes(coll: MongoCollection, fn: SchemaSearchIndexes<any>) {
  const desired = Object.values(makeSearchIndexes(fn));
  const desiredByName = new Map(desired.map((idx) => [idx.name, idx]));

  let existing: ExistingSearchIndex[];
  try {
    existing = (await coll.listSearchIndexes().toArray()) as ExistingSearchIndex[];
  } catch {
    return;
  }

  const existingByName = new Map(existing.map((idx) => [idx.name, idx]));

  // Drop stale indexes
  await Promise.all(
    Array.from(existingByName.keys())
      .filter((name) => !desiredByName.has(name))
      .map((name) =>
        coll.dropSearchIndex(name).catch((error) => {
          throw new MonarchError(`failed to drop search index '${name}': ${error}`, error);
        }),
      ),
  );

  // Create or update indexes
  await Promise.all(
    desired.map(async (idx) => {
      const existing = existingByName.get(idx.name);
      if (!existing) {
        await coll.createSearchIndex({ name: idx.name, type: idx.type, definition: idx.definition }).catch((error) => {
          throw new MonarchError(`failed to create search index '${idx.name}': ${error}`, error);
        });
        return;
      }

      const defChanged = JSON.stringify(existing.latestDefinition) !== JSON.stringify(idx.definition);
      if (defChanged) {
        await coll.updateSearchIndex(idx.name, idx.definition).catch((error) => {
          throw new MonarchError(`failed to update search index '${idx.name}': ${error}`, error);
        });
      }
    }),
  );
}
