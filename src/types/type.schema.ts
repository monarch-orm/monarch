/**
 * JSON Schema Draft 4
 */
export type JSONSchema = {
  // Core
  id?: string; // Note: Draft 4 uses 'id', not '$id'
  $schema?: string;
  $ref?: string;
  title?: string;
  description?: string;
  default?: any;

  // Validation: Numbers
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean; // Note: Boolean in Draft 4
  minimum?: number;
  exclusiveMinimum?: boolean; // Note: Boolean in Draft 4

  // Validation: Strings
  maxLength?: number;
  minLength?: number;
  pattern?: string;

  // Validation: Arrays
  items?: JSONSchema | JSONSchema[];
  additionalItems?: boolean | JSONSchema;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;

  // Validation: Objects
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  definitions?: { [key: string]: JSONSchema };
  properties?: { [key: string]: JSONSchema };
  patternProperties?: { [key: string]: JSONSchema };
  dependencies?: { [key: string]: JSONSchema | string[] };

  // Validation: General
  enum?: any[];
  type?: JSONSchemaTypeName | JSONSchemaTypeName[];
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;

  // Formats
  format?: string;
};

export type JSONSchemaTypeName = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null";
