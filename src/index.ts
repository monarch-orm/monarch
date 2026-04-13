import { array } from "./types/array";
import { binary } from "./types/binary";
import { boolean } from "./types/boolean";
import { date } from "./types/date";
import { decimal128 } from "./types/decimal128";
import { double } from "./types/double";
import { int32 } from "./types/int32";
import { literal } from "./types/literal";
import { long } from "./types/long";
import { mixed } from "./types/mixed";
import { number } from "./types/number";
import { object } from "./types/object";
import { objectId } from "./types/objectId";
import { record } from "./types/record";
import { regex } from "./types/regex";
import { string } from "./types/string";
import { tuple } from "./types/tuple";
import { defaulted, nullable, optional } from "./types/type";
import { taggedUnion, union } from "./types/union";
import { uuid } from "./types/uuid";

export { ObjectId } from "mongodb";
export { Collection } from "./collection/collection";
export type { AggregationPipelineOptions } from "./collection/pipeline/aggregation";
export type { BulkWriteQueryOptions } from "./collection/query/bulk-write";
export type { DeleteManyQueryOptions } from "./collection/query/delete-many";
export type { DeleteOneQueryOptions } from "./collection/query/delete-one";
export type { DistinctQueryOptions } from "./collection/query/distinct";
export type { FindQueryOptions } from "./collection/query/find";
export type { FindOneQueryOptions } from "./collection/query/find-one";
export type { FindOneAndDeleteQueryOptions } from "./collection/query/find-one-and-delete";
export type { FindOneAndReplaceQueryOptions } from "./collection/query/find-one-and-replace";
export type { FindOneAndUpdateQueryOptions } from "./collection/query/find-one-and-update";
export type { InsertManyQueryOptions } from "./collection/query/insert-many";
export type { InsertOneQueryOptions } from "./collection/query/insert-one";
export type { ReplaceOneQueryOptions } from "./collection/query/replace-one";
export type { UpdateManyQueryOptions } from "./collection/query/update-many";
export type { UpdateOneQueryOptions } from "./collection/query/update-one";
export type { PipelineStage } from "./collection/types/pipeline-stage";
export { createClient, createDatabase, Database, type DatabaseOptions } from "./database";
export { MonarchError, MonarchParseError } from "./errors";
export {
  mergeRelations,
  Relation,
  RelationField,
  type RelationsFn,
  type SchemasRelations,
} from "./relations/relations";
export { createSchema, defineSchemas, mergeSchemas, Schema, Schemas } from "./schema/schema";
export type {
  Condition,
  CreateIndexKey,
  DistinctFilter,
  Filter,
  FilterOperations,
  FilterOperators,
  IndexKey,
  InferSchemaData,
  InferSchemaInput,
  InferSchemaOutput,
  RootFilterOperators,
  UpdateFilter,
} from "./schema/type-helpers";
export { getValidator, type JSONSchema, type SchemaValidation } from "./schema/validation";
export { virtual, type Virtual } from "./schema/virtuals";
export { type InferInput, type InferOutput } from "./type-helpers";
export { toObjectId } from "./utils/misc";

/**
 * Monarch types namespace for convenient access.
 *
 * @example
 * ```ts
 * import { m } from 'monarch-orm';
 *
 * const userSchema = createSchema('users', {
 *   name: m.string(),
 *   age: m.number().optional(),
 * });
 * ```
 */
export const m = {
  array,
  binary,
  boolean,
  date,
  decimal128,
  double,
  int32,
  literal,
  long,
  mixed,
  number,
  object,
  objectId,
  record,
  regex,
  string,
  taggedUnion,
  tuple,
  union,
  uuid,
  nullable,
  optional,
  defaulted,
};
