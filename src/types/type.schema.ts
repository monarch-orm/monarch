import type { Parser } from "./type";

/**
 * MongoDB JSON Schema (Draft 4 based with BSON extensions)
 */
export type JSONSchema = {
  bsonType?: BsonType | BsonType[];
  type?: JsonType | JsonType[];

  // Core Draft 4 Keywords
  title?: string;
  description?: string;
  required?: string[];
  enum?: any[];

  // Object Validation
  properties?: Record<string, JSONSchema>;
  patternProperties?: Record<string, JSONSchema>;
  additionalProperties?: boolean | JSONSchema;
  maxProperties?: number;
  minProperties?: number;

  // Array Validation
  items?: JSONSchema | JSONSchema[];
  additionalItems?: boolean | JSONSchema;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;

  // Number Validation
  multipleOf?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean; // Draft 4: Boolean toggle
  exclusiveMaximum?: boolean; // Draft 4: Boolean toggle

  // String Validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Logic
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
};

export type JsonType = "array" | "boolean" | "integer" | "number" | "null" | "object" | "string";

export type BsonType =
  | "double"
  | "string"
  | "object"
  | "array"
  | "binData"
  | "undefined"
  | "objectId"
  | "bool"
  | "date"
  | "null"
  | "regex"
  | "dbPointer"
  | "javascript"
  | "symbol"
  | "javascriptWithScope"
  | "int"
  | "timestamp"
  | "long"
  | "decimal"
  | "minKey"
  | "maxKey";

export function jsonSchemaParser<TInput, TOutput>(parser: Parser<TInput, TOutput>, schema: JSONSchema) {
  const parserSchema = jsonSchemaFromParser(parser);
  parser["$jsonSchema" as keyof typeof parser] = { ...parserSchema, ...schema } as (typeof parser)[keyof typeof parser];
  return parser;
}

export function jsonSchemaFromParser<TInput, TOutput>(parser: Parser<TInput, TOutput>) {
  return parser["$jsonSchema" as keyof typeof parser] as JSONSchema | undefined;
}
