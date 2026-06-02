import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";
import type { JSONSchema } from "./type.schema";

/**
 * Boolean type.
 *
 * @returns MonarchBoolean instance
 */
export const boolean = () => new MonarchBoolean();

/**
 * Type for boolean fields.
 */
export class MonarchBoolean extends MonarchType<boolean> {
  constructor() {
    super((input) => {
      if (typeof input === "boolean") return input;
      throw MonarchParseError.create(`expected 'boolean' received '${typeof input}'`);
    });
  }

  protected copy() {
    return new MonarchBoolean();
  }

  protected jsonSchema(): JSONSchema {
    return { bsonType: "bool" };
  }
}
