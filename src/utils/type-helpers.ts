export type Pretty<T> = { [K in keyof T]: T[K] } & {};
export type Merge<First, Second> = { [K in keyof First as K extends keyof Second ? never : K]: First[K] } & Second;
export type MergeN1<First, Second> = Pretty<
  Omit<First, keyof Second> & {
    [K in keyof Second]: K extends keyof First ? Pretty<Merge<First[K], Second[K]>> : Second[K];
  }
>;
export type MergeAll<T extends any[]> = T extends [...infer Head, infer Tail]
  ? Pretty<Merge<MergeAll<Head>, Tail>>
  : {};
export type MergeN1All<T extends any[]> = T extends [...infer Head, infer Tail]
  ? Pretty<MergeN1<MergeN1All<Head>, Tail>>
  : {};
export type Index<T, K> = K extends keyof T ? T[K] : never;
export type IsNever<T> = [T] extends [never] ? true : false;
export type ExtractIfArray<T> = T extends (infer U)[] ? U : T;
export type OrArray<T> = T | T[];
export type TrueKeys<T> = keyof {
  [K in keyof T as T[K] extends true ? K : never]: T[K];
};
export type KnownKey<T> = string extends T ? never : number extends T ? never : symbol extends T ? never : T;
export type KnownObjectKeys<T> = { [K in keyof T as KnownKey<K>]: T[K] };
export type RequiredObject<T> = { [K in keyof T as undefined extends T[K] ? never : K]: Exclude<T[K], undefined> };

export type IdFirst<T> = "_id" extends keyof T ? { _id: T["_id"] } & Omit<T, "_id"> : T;
export type OptionalIdFirst<T> = "_id" extends keyof T ? { _id?: T["_id"] } & Omit<T, "_id"> : T;
