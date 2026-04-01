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

/**
 * JSON Schema Draft 4
 */
export type JSONSchema4 = {
  // Core
  id?: string; // Note: Draft 4 uses 'id', not '$id'
  $schema?: string;
  $ref?: string;
  default?: any;

  // Validation: Objects
  definitions?: { [key: string]: JSONSchema4 };
  dependencies?: { [key: string]: JSONSchema4 | string[] };

  // Formats
  format?: string;
};

export type JSONSchema4TypeName = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null";
