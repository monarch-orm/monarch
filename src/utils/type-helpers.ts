import type { ObjectId } from "mongodb";

export type Merge<First, Second> = Omit<First, keyof Second> & Second;
export type Pretty<T> = { [K in keyof T]: T[K] } & {};
export type Index<T, K> = K extends keyof T ? T[K] : never;
export type ExtractIfArray<T> = T extends (infer U)[] ? U : T;
export type ExtractObject<T extends Record<string, any>, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K] extends U ? T[K] : never;
} & {};
export type TrueKeys<T> = keyof {
  [K in keyof T as T[K] extends true ? K : never]: T[K];
};
export type KnownKey<T> = string extends T
  ? never
  : number extends T
    ? never
    : symbol extends T
      ? never
      : T;
export type KnownObjectKeys<T> = { [K in keyof T as KnownKey<K>]: T[K] };

export type IdFirst<T> = "_id" extends keyof T
  ? { _id: T["_id"] } & Omit<T, "_id">
  : T;
export type WithRequiredObjectId<T> = "_id" extends keyof T
  ? T
  : { _id: ObjectId } & T;
export type WithRequiredId<T> = "_id" extends keyof T
  ? T
  : { _id: ObjectId | string } & T;
export type WithOptionalId<T> = "_id" extends keyof T
  ? T
  : { _id?: ObjectId | string } & T;
