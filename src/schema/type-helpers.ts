import type { ObjectId } from "mongodb";
import type { MonarchObjectId } from "../types";
import type { _InferTypeObjectInput, _InferTypeObjectOutput, InferTypeInput } from "../types/type-helpers";
import type { IdFirst, Index, Merge, Pretty, TrueKeys } from "../utils/type-helpers";
import type { AnySchema, Schema } from "./schema";
import type { InferVirtualOutput } from "./virtuals";

export type WithObjectId<T> = "_id" extends keyof T ? T : { _id: MonarchObjectId } & T;
export type WithObjectIdInput<T> =
  ObjectId extends Index<T, "_id"> ? { _id?: InferTypeInput<MonarchObjectId> } & Omit<T, "_id"> : T;

export type InferSchemaInput<T extends AnySchema> = Pretty<
  WithObjectIdInput<_InferTypeObjectInput<InferSchemaTypes<T>>>
>;
export type _InferSchemaData<T extends AnySchema> = _InferTypeObjectOutput<InferSchemaTypes<T>>;
export type InferSchemaData<T extends AnySchema> = Pretty<_InferSchemaData<T>>;
export type InferSchemaOutput<T extends AnySchema> = Pretty<
  IdFirst<Merge<_InferSchemaData<T>, InferVirtualOutput<InferSchemaVirtuals<T>>>>
>;

export type InferSchemaTypes<T extends AnySchema> =
  T extends Schema<infer _TName, infer TTypes, infer _TOmit, infer _TVirtuals> ? TTypes : never;
export type InferSchemaOmit<T extends AnySchema> =
  T extends Schema<infer _TName, infer _TTypes, infer TOmit, infer _TVirtuals> ? TrueKeys<TOmit> : never;
export type InferSchemaVirtuals<T extends AnySchema> =
  T extends Schema<infer _TName, infer _TTypes, infer _TOmit, infer TVirtuals> ? TVirtuals : never;
