import { Double } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";
import type { JSONSchema } from "./type.schema";

/**
 * Double type for 64-bit floating point numbers.
 *
 * @returns MonarchDouble instance
 */
export const double = () => new MonarchDouble();

/**
 * Type for Double fields.
 */
export class MonarchDouble extends MonarchType<Double | number, number> {
  constructor() {
    super((input) => {
      if (input instanceof Double) return input.value;
      if (typeof input === "number") return input;
      throw MonarchParseError.create(`expected 'Double' or 'number' received '${typeof input}'`);
    });
  }

  protected copy() {
    return new MonarchDouble();
  }

  protected jsonSchema(): JSONSchema {
    return { bsonType: "double" };
  }
}
