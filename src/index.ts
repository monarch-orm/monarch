import { array } from "./types/array";
import { binary } from "./types/binary";
import { boolean } from "./types/boolean";
import { createdAt, date, dateString, updatedAt } from "./types/date";
import { decimal128 } from "./types/decimal128";
import { literal } from "./types/literal";
import { long } from "./types/long";
import { mixed } from "./types/mixed";
import { number } from "./types/number";
import { object } from "./types/object";
import { objectId } from "./types/objectId";
import { pipe } from "./types/pipe";
import { record } from "./types/record";
import { string } from "./types/string";
import { tuple } from "./types/tuple";
import { defaulted, nullable, optional, type } from "./types/type";
import { taggedUnion, union } from "./types/union";

export { ObjectId } from "mongodb";
export { Collection } from "./collection/collection";
export { createClient, createDatabase, Database, type InferInput, type InferOutput } from "./database";
export { MonarchError } from "./errors";
export { createRelations, Relations, type Relation } from "./relations/relations";
export { createSchema, Schema } from "./schema/schema";
export { type InferSchemaInput, type InferSchemaOutput } from "./schema/type-helpers";
export { virtual, type Virtual } from "./schema/virtuals";
export { generateObjectId, isValidObjectId, objectIdToString, toObjectId } from "./utils/objectId";

export const m = {
  array,
  boolean,
  binary,
  date,
  dateString,
  decimal128,
  createdAt,
  updatedAt,
  literal,
  long,
  mixed,
  number,
  object,
  objectId,
  pipe,
  record,
  string,
  taggedUnion,
  type,
  tuple,
  union,
  nullable,
  optional,
  defaulted,
};
