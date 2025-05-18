import { array } from "./types/array";
import { boolean } from "./types/boolean";
import { createdAt, date, dateString, updatedAt } from "./types/date";
import { literal } from "./types/literal";
import { mixed } from "./types/mixed";
import { number } from "./types/number";
import { object } from "./types/object";
import { objectId } from "./types/objectId";
import { pipe } from "./types/pipe";
import { record } from "./types/record";
import { string } from "./types/string";
import { taggedUnion } from "./types/tagged-union";
import { tuple } from "./types/tuple";
import { defaulted, nullable, optional } from "./types/type";
import { union } from "./types/union";

export { MongoClient, MongoError, ObjectId } from "mongodb";
export { Collection } from "./collection/collection";
export {
  createClient,
  createDatabase,
  Database,
  InferInput,
  InferOutput,
} from "./database";
export { MonarchError } from "./errors";
export { createRelations, Relation, Relations } from "./relations/relations";
export { createSchema, Schema } from "./schema/schema";
export { InferSchemaInput, InferSchemaOutput } from "./schema/type-helpers";
export { Virtual, virtual } from "./schema/virtuals";
export {
  generateObjectId,
  isValidObjectId,
  objectIdToString,
  toObjectId,
} from "./utils/objectId";

export const m = {
  array,
  boolean,
  date,
  dateString,
  createdAt,
  updatedAt,
  literal,
  mixed,
  number,
  object,
  objectId,
  pipe,
  record,
  string,
  taggedUnion,
  tuple,
  union,
  nullable,
  optional,
  defaulted,
};
