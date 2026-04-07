import { MonarchType, object } from "../types";
import type { JSONSchema } from "../types/type.schema";
import { Schema, type AnySchema } from "./schema";

export type { JSONSchema } from "../types/type.schema";

export type SchemaValidation = {
  validationLevel: "off" | "strict" | "moderate";
  validationAction?: "warn" | "error";
};

export type Validator = { $jsonSchema: JSONSchema };

export function getValidator(schema: AnySchema): Validator {
  const type = object(Schema.types(schema));
  return { $jsonSchema: MonarchType.jsonSchema(type) };
}
