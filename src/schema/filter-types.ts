import type {
  AddToSetOperators,
  AlternativeType,
  ArrayOperator,
  BitwiseFilter,
  BSONRegExp,
  BSONType,
  BSONTypeAlias,
  Document,
  Flatten,
} from "mongodb";
import type {
  MonarchDate,
  MonarchDecimal128,
  MonarchDouble,
  MonarchInt32,
  MonarchLiteral,
  MonarchLong,
  MonarchMixed,
  MonarchNumber,
  MonarchRecord,
  MonarchTaggedUnion,
  MonarchTuple,
} from "../types";
import type { MonarchArray } from "../types/array";
import type { MonarchObject } from "../types/object";
import type { AnyMonarchType, MonarchDefaulted, MonarchNullable, MonarchOptional } from "../types/type";
import type { InferTypeInput, InferTypeOutput } from "../types/type-helpers";
import type { Pretty } from "../utils/type-helpers";
import type { AnySchema } from "./schema";
import type { InferSchemaData, InferSchemaTypes } from "./type-helpers";

type KV<K extends string, V extends AnyMonarchType> = { key: K; value: V };
type Prefix<P extends string, K extends string> = P extends "" ? K : `${P}.${K}`;
type ArrayPath = `${number}` | "$" | `$[${string}]`;
type RecordPath = "$record$"; // placeholder path to be replaced with string
type Replace<T, S extends string, R extends string> = T extends `${infer Head}${S}${infer Tail}`
  ? `${Head}${R}${Replace<Tail, S, R>}`
  : T;
type UnionUnlessRoot<P extends string, T, U> = P extends "" ? T : T | U;
type IsNever<T> = [T] extends [never] ? true : false;
type PrettyNonEmpty<T> = IsNever<keyof T> extends true ? { [k: string]: never } : Pretty<T>;

type IntegerType = MonarchNumber | MonarchInt32 | MonarchLong;
type NumericType = IntegerType | MonarchDouble | MonarchDecimal128;
type BitValue<T> = { and: T } | { or: T } | { xor: T };

/**
 * Strips Nullable/Optional/Defaulted wrappers down to the core type.
 * If Target is provided but not found in the unwrap chain it returns never.
 * */
type Unwrap<T extends AnyMonarchType, Target = never, Found = IsNever<Target>> = [Found, T] extends [false, Target]
  ? Unwrap<T, never, true>
  : T extends MonarchNullable<infer U> | MonarchOptional<infer U> | MonarchDefaulted<infer U>
    ? Unwrap<U, Target, Found>
    : Found extends true
      ? T
      : never;

type TargetKey<T extends KV<any, any>, K, Target> =
  IsNever<Unwrap<Extract<T, { key: K }>["value"], Target>> extends true ? never : Replace<K, RecordPath, string>;

type MapKVUpdate<T extends KV<any, any>> = {
  [K in T["key"] as Replace<K, RecordPath, string>]?: InferTypeInput<Extract<T, { key: K }>["value"]>;
};
type MapKVUpdateEnhanced<T extends KV<any, any>, Target = AnyMonarchType, Value = never> = {
  [K in T["key"] as TargetKey<T, K, Target | MonarchMixed>]?: IsNever<Value> extends true
    ? InferTypeInput<Extract<T, { key: K }>["value"]>
    : Value;
};
type MapKVUpdateUnset<T extends KV<any, any>> = {
  [K in T["key"] as TargetKey<T, K, MonarchOptional<any>>]?: "" | true | 1;
};
type MapKVUpdateRename<T extends KV<any, any>> = {
  [K in T["key"] as TargetKey<T, K, MonarchOptional<any>>]?: keyof MapKVUpdateEnhanced<
    T,
    Extract<T, { key: K }>["value"]
  >;
};
type MapKVUpdateBit<T extends KV<any, any>> = {
  [K in T["key"] as TargetKey<T, K, IntegerType | MonarchMixed>]?: BitValue<
    InferTypeOutput<Extract<T, { key: K }>["value"]>
  >;
};
type MapKVUpdateAddToSet<T extends KV<any, any>> = {
  [K in T["key"] as TargetKey<T, K, MonarchArray<any> | MonarchMixed>]?:
    | Flatten<InferTypeInput<Extract<T, { key: K }>["value"]>>
    | AddToSetOperators<InferTypeInput<Extract<T, { key: K }>["value"]>>;
};
type MapKVUpdatePush<T extends KV<any, any>> = {
  [K in T["key"] as TargetKey<T, K, MonarchArray<any> | MonarchMixed>]?:
    | Flatten<InferTypeInput<Extract<T, { key: K }>["value"]>>
    | ArrayOperator<InferTypeInput<Extract<T, { key: K }>["value"]>>;
};
type MapKVUpdatePullAll<T extends KV<any, any>> = {
  [K in T["key"] as TargetKey<T, K, MonarchArray<any> | MonarchMixed>]?: InferTypeInput<
    Extract<T, { key: K }>["value"]
  >;
};
// Pull operator uses output type because it is passthrough (does not call parsers)
type MapKVUpdatePull<T extends KV<any, any>> = {
  [K in T["key"] as TargetKey<T, K, MonarchArray<any> | MonarchMixed>]?:
    | Partial<Flatten<InferTypeOutput<Extract<T, { key: K }>["value"]>>>
    | FilterOperations<Flatten<InferTypeOutput<Extract<T, { key: K }>["value"]>>>;
};
type MapKVFilterCondition<T extends KV<any, any>> = {
  [K in T["key"] as Replace<K, RecordPath, string>]?: Condition<InferTypeOutput<Extract<T, { key: K }>["value"]>>;
};
type MapKVDistinct<T extends KV<any, any>> = {
  [K in T["key"] as Replace<K, RecordPath, string>]: Exclude<
    InferTypeOutput<Extract<T, { key: K }>["value"]>,
    undefined
  >[];
};

/**
 * Valid MongoDB update operators for a schema.
 *
 * Recursively expands object and record fields into dot-notation paths.
 * Array and tuple element paths are also expanded using index and positional suffixes.
 * Expansion stops at optional fields — they are included as top-level paths only,
 * not recursed into further.
 *
 * Each operator only exposes paths whose field type satisfies that operator's constraint.
 * Mixed fields are additionally allowed in all operators except `$unset` and `$rename`:
 * - `$inc` / `$mul` — numeric fields
 * - `$unset` / `$rename` — optional fields only (mixed must also be optional to qualify)
 * - `$addToSet` / `$pop` / `$pull` / `$push` / `$pullAll` — array fields
 * - `$bit` — integer fields
 * - `$currentDate` — date fields
 * - `$set` / `$setOnInsert` / `$min` / `$max` — all fields
 */
export type UpdateFilter<T extends AnySchema> = UpdateOperators<UpdateFilterKV<MonarchObject<InferSchemaTypes<T>>, "">>;
type UpdateFilterKV<T extends AnyMonarchType, P extends string> = P extends string
  ? IsNever<Unwrap<T, MonarchOptional<any>>> extends true
    ? Unwrap<T> extends MonarchObject<infer U>
      ? UnionUnlessRoot<P, { [K in keyof U]: UpdateFilterKV<U[K], Prefix<P, K & string>> }[keyof U], KV<P, T>>
      : Unwrap<T> extends MonarchRecord<infer U>
        ? UpdateFilterKV<U, Prefix<P, RecordPath>> | KV<P, T>
        : Unwrap<T> extends MonarchArray<infer U>
          ? UpdateFilterKV<U, Prefix<P, ArrayPath>> | KV<P, T>
          : Unwrap<T> extends MonarchTuple<infer U>
            ? { [K in keyof U & `${number}`]: UpdateFilterKV<U[K], Prefix<P, K>> }[keyof U & `${number}`] | KV<P, T>
            : KV<P, T>
    : KV<P, T> // bail out for optional fields
  : never;

type UpdateOperators<T extends KV<any, any>> = {
  $currentDate?: PrettyNonEmpty<MapKVUpdateEnhanced<T, MonarchDate, true | { $type: "date" | "timestamp" }>>;
  $inc?: PrettyNonEmpty<MapKVUpdateEnhanced<T, NumericType>>;
  $min?: PrettyNonEmpty<MapKVUpdate<T>>;
  $max?: PrettyNonEmpty<MapKVUpdate<T>>;
  $mul?: PrettyNonEmpty<MapKVUpdateEnhanced<T, NumericType>>;
  $rename?: PrettyNonEmpty<MapKVUpdateRename<T>>;
  $set?: PrettyNonEmpty<MapKVUpdate<T>>;
  $setOnInsert?: PrettyNonEmpty<MapKVUpdate<T>>;
  $unset?: PrettyNonEmpty<MapKVUpdateUnset<T>>;
  $addToSet?: PrettyNonEmpty<MapKVUpdateAddToSet<T>>;
  $pop?: PrettyNonEmpty<MapKVUpdateEnhanced<T, MonarchArray<any>, 1 | -1>>;
  $pull?: PrettyNonEmpty<MapKVUpdatePull<T>>;
  $push?: PrettyNonEmpty<MapKVUpdatePush<T>>;
  $pullAll?: PrettyNonEmpty<MapKVUpdatePullAll<T>>;
  $bit?: PrettyNonEmpty<MapKVUpdateBit<T>>;
};

/**
 * Valid MongoDB filter conditions for a schema.
 *
 * Recursively expands all field types into dot-notation paths:
 * - Object fields expand into their nested keys
 * - Record fields expand using a wildcard string key
 * - Array fields expand using their element type at the same path (no index suffix),
 *   allowing element-level matching
 * - Tuple fields expand using numeric index suffixes
 * - Tagged union fields expand as `"field.tag"` and `"field.value"`
 * - Mixed fields allow arbitrary dot-notation sub-paths
 *
 * All field types also accept their containing type as a whole, in addition to
 * any expanded sub-paths.
 *
 * Root logical operators (`$and`, `$or`, `$nor`) and `$text`, `$where`, `$comment`
 * are available at the top level via {@link RootFilterOperators}.
 */
export type Filter<T extends AnySchema> = MapKVFilterCondition<FilterKV<MonarchObject<InferSchemaTypes<T>>, "">> &
  RootFilterOperators<T>;
type FilterKV<T extends AnyMonarchType, P extends string> = P extends string
  ? Unwrap<T> extends MonarchObject<infer U>
    ? UnionUnlessRoot<P, { [K in keyof U]: FilterKV<U[K], Prefix<P, K & string>> }[keyof U], KV<P, T>>
    : Unwrap<T> extends MonarchRecord<infer U>
      ? FilterKV<U, Prefix<P, RecordPath>> | KV<P, T>
      : Unwrap<T> extends MonarchArray<infer U>
        ? FilterKV<U, P> | KV<P, T>
        : Unwrap<T> extends MonarchTuple<infer U>
          ? { [K in keyof U & `${number}`]: FilterKV<U[K], Prefix<P, K>> }[keyof U & `${number}`] | KV<P, T>
          : Unwrap<T> extends MonarchTaggedUnion<infer U>
            ?
                | FilterKV<MonarchLiteral<keyof U & string>, Prefix<P, "tag">>
                | FilterKV<MonarchLiteral<InferTypeOutput<U[keyof U]>>, Prefix<P, "value">>
                | KV<P, T>
            : Unwrap<T> extends MonarchMixed
              ? // allow arbitrary paths for mixed
                  KV<Prefix<P, string>, T> | KV<P, T>
              : KV<P, T>
  : never;

export type RootFilterOperators<T extends AnySchema> = {
  $and?: Filter<T>[];
  $nor?: Filter<T>[];
  $or?: Filter<T>[];
  $text?: {
    $search: string;
    $language?: string;
    $caseSensitive?: boolean;
    $diacriticSensitive?: boolean;
  };
  $where?: string | ((this: InferSchemaData<T>) => boolean);
  $comment?: string | Document;
};

export declare type FilterOperations<T> =
  T extends Record<string, any> ? { [K in keyof T]?: FilterOperators<T[K]> } : FilterOperators<T>;

export type FilterOperators<TValue> = {
  $eq?: TValue;
  $gt?: TValue;
  $gte?: TValue;
  $in?: ReadonlyArray<TValue>;
  $lt?: TValue;
  $lte?: TValue;
  $ne?: TValue;
  $nin?: ReadonlyArray<TValue>;
  $not?: TValue extends string ? FilterOperators<TValue> | RegExp : FilterOperators<TValue>;
  /**
   * When `true`, `$exists` matches the documents that contain the field,
   * including documents where the field value is null.
   */
  $exists?: boolean;
  $type?: BSONType | BSONTypeAlias;
  $expr?: Record<string, any>;
  $jsonSchema?: Record<string, any>;
  $mod?: TValue extends number ? [number, number] : never;
  $regex?: TValue extends string ? RegExp | BSONRegExp | string : never;
  $options?: TValue extends string ? string : never;
  $geoIntersects?: {
    $geometry: Document;
  };
  $geoWithin?: Document;
  $near?: Document;
  $nearSphere?: Document;
  $maxDistance?: number;
  $all?: ReadonlyArray<any>;
  $elemMatch?: Document;
  $size?: TValue extends ReadonlyArray<any> ? number : never;
  $bitsAllClear?: BitwiseFilter;
  $bitsAllSet?: BitwiseFilter;
  $bitsAnyClear?: BitwiseFilter;
  $bitsAnySet?: BitwiseFilter;
  $rand?: Record<string, never>;
};

export type Condition<T> = AlternativeType<T> | FilterOperators<AlternativeType<T>>;

/**
 * Valid key paths and their return types for `collection.distinct()`.
 *
 * Follows the same recursive expansion as {@link Filter} with one difference
 * in how arrays and tuples are handled:
 * - Array fields are unwound — the element type is promoted to the parent path
 *   rather than producing an array of arrays.
 * - Tuple fields are unwound similarly: each element is accessible by its numeric
 *   index suffix, and the parent path returns a union of all element types.
 * - Object, record, tagged union, and mixed fields follow the same rules as {@link Filter}.
 *
 * The return type of each path excludes `undefined` — optional fields with no
 * stored value are absent from the distinct result.
 */
export type DistinctFilter<T extends AnySchema> = MapKVDistinct<
  DistinctFilterKV<MonarchObject<InferSchemaTypes<T>>, "">
>;
type DistinctFilterKV<T extends AnyMonarchType, P extends string> = P extends string
  ? Unwrap<T> extends MonarchObject<infer U>
    ? UnionUnlessRoot<P, { [K in keyof U]: DistinctFilterKV<U[K], Prefix<P, K & string>> }[keyof U], KV<P, T>>
    : Unwrap<T> extends MonarchRecord<infer U>
      ? DistinctFilterKV<U, Prefix<P, RecordPath>> | KV<P, T>
      : Unwrap<T> extends MonarchArray<infer U>
        ? // unwind arrays
          DistinctFilterKV<U, P>
        : Unwrap<T> extends MonarchTuple<infer U>
          ? // unwind tuple and known indexes
              | { [K in keyof U & `${number}`]: DistinctFilterKV<U[K], Prefix<P, K>> }[keyof U & `${number}`]
              | KV<P, MonarchLiteral<InferTypeOutput<U[keyof U]>>>
          : Unwrap<T> extends MonarchTaggedUnion<infer U>
            ?
                | DistinctFilterKV<MonarchLiteral<keyof U & string>, Prefix<P, "tag">>
                | DistinctFilterKV<MonarchLiteral<InferTypeOutput<U[keyof U]>>, Prefix<P, "value">>
                | KV<P, T>
            : Unwrap<T> extends MonarchMixed
              ? // allow arbitrary paths for mixed
                  KV<Prefix<P, string>, T> | KV<P, T>
              : KV<P, T>
  : never;
