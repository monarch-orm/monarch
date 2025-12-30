import type { Pretty } from "../utils/type-helpers";
import type { AnyMonarchType, MonarchType } from "./type";

export type InferTypeInput<T> = T extends MonarchType<infer U, any> ? U : never;
export type InferTypeOutput<T> = T extends MonarchType<any, infer U> ? U : never;

export type _InferTypeObjectInput<T extends Record<string, AnyMonarchType>> = {
  [K in keyof T as undefined extends InferTypeInput<T[K]> ? never : K]: InferTypeInput<T[K]>; // required keys
} & {
  [K in keyof T as undefined extends InferTypeInput<T[K]> ? K : never]?: InferTypeInput<T[K]>; // optional keys
};
export type InferTypeObjectInput<T extends Record<string, AnyMonarchType>> = Pretty<_InferTypeObjectInput<T>>;
export type _InferTypeObjectOutput<T extends Record<string, AnyMonarchType>> = {
  [K in keyof T]: InferTypeOutput<T[K]>;
};
export type InferTypeObjectOutput<T extends Record<string, AnyMonarchType>> = Pretty<_InferTypeObjectOutput<T>>;

export type InferTypeTupleInput<T extends [AnyMonarchType, ...AnyMonarchType[]]> = {
  [K in keyof T]: InferTypeInput<T[K]>;
};
export type InferTypeTupleOutput<T extends [AnyMonarchType, ...AnyMonarchType[]]> = {
  [K in keyof T]: InferTypeOutput<T[K]>;
};

export type InferTypeUnionInput<T extends [AnyMonarchType, ...AnyMonarchType[]]> = InferTypeInput<T[number]>;

export type InferTypeUnionOutput<T extends [AnyMonarchType, ...AnyMonarchType[]]> = InferTypeOutput<T[number]>;

export type InferTypeTaggedUnionInput<T extends Record<string, AnyMonarchType>> = {
  [K in keyof T]: { tag: K; value: InferTypeInput<T[K]> };
}[keyof T];
export type InferTypeTaggedUnionOutput<T extends Record<string, AnyMonarchType>> = {
  [K in keyof T]: { tag: K; value: InferTypeOutput<T[K]> };
}[keyof T];
