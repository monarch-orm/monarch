import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";
import type { JSONSchema } from "./type.schema";

/**
 * Number type.
 *
 * @returns MonarchNumber instance
 */
export const number = () => new MonarchNumber();

/**
 * Type for number fields.
 */
export class MonarchNumber extends MonarchType<number, number> {
  constructor() {
    super((input) => {
      if (typeof input === "number") return input;
      throw MonarchParseError.create({ message: `expected 'number' received '${typeof input}'` });
    });
  }

  protected copy() {
    return new MonarchNumber();
  }

  protected jsonSchema(): JSONSchema {
    return { type: "number" };
  }

  /**
   * Validates minimum value.
   *
   * @param value - Minimum value
   * @returns MonarchNumber with min validation
   */
  public min(value: number) {
    return this.parse((input) => {
      if (input < value) {
        throw MonarchParseError.create({ message: `number must be greater than or equal to ${value}` });
      }
      return input;
    });
  }

  /**
   * Validates maximum value.
   *
   * @param value - Maximum value
   * @returns MonarchNumber with max validation
   */
  public max(value: number) {
    return this.parse((input) => {
      if (input > value) {
        throw MonarchParseError.create({ message: `number must be less than or equal to ${value}` });
      }
      return input;
    });
  }

  /**
   * Validates value is an integer.
   *
   * @returns MonarchNumber with integer validation
   */
  public integer() {
    return this.parse((input) => {
      if (!Number.isInteger(input)) {
        throw MonarchParseError.create({ message: "number must be an integer" });
      }
      return input;
    });
  }
}
