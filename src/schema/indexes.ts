import type { CreateIndexesOptions, IndexDirection, ObjectId } from "mongodb";
import type { AnyMonarchType } from "../types/type";
import type { _InferTypeObjectOutput } from "../types/type-helpers";

export type SchemaIndexes<TTypes extends Record<string, AnyMonarchType>> =
  (options: {
    createIndex: CreateIndex<TTypes>;
    unique: UniqueIndex<TTypes>;
  }) => {
    [k: string]: SchemaIndex<TTypes>;
  };

export function makeIndexes<T extends Record<string, AnyMonarchType>>(
  indexesFn: SchemaIndexes<T>,
) {
  return indexesFn({
    createIndex: (fields, options) => [fields, options],
    unique: (field) => [{ [field as any]: 1 as const }, { unique: true }],
  });
}

export type CreateIndexesFields<T extends Record<string, AnyMonarchType>> = {
  [K in IndexKeys<_InferTypeObjectOutput<T>> | "_id"]?:
    | 1
    | -1
    | Exclude<IndexDirection, number>;
};
export type SchemaIndex<T extends Record<string, AnyMonarchType>> =
  | [CreateIndexesFields<T>]
  | [CreateIndexesFields<T>, CreateIndexesOptions | undefined];
export type CreateIndex<T extends Record<string, AnyMonarchType>> = (
  fields: CreateIndexesFields<T>,
  options?: CreateIndexesOptions,
) => SchemaIndex<T>;
export type UniqueIndex<T extends Record<string, AnyMonarchType>> = (
  field: IndexKeys<_InferTypeObjectOutput<T>>,
) => SchemaIndex<T>;

type IndexKeys<T, Prefix extends string = ""> = T extends Array<infer U>
  ? IndexKeys<U, Prefix>
  : T extends ObjectId
    ? never
    : T extends Record<string, any>
      ? keyof T extends infer K extends string
        ? KeysWithWildcard<K, Prefix> | SubKeys<T, K, Prefix>
        : never
      : never;
type SubKeys<T, K, Prefix extends string> = K extends keyof T & string
  ? IndexKeys<T[K], `${Prefix}${K}.`>
  : never;
type KeysWithWildcard<
  K extends string,
  Prefix extends string,
> = string extends K ? `${Prefix}$**` : `${Prefix}${K}` | `${Prefix}$**`;
