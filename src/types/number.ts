import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

/**
 * Creates a number type definition.
 *
 * @returns MonarchNumber instance
 */
export const number = () => new MonarchNumber();

/**
 * Number type with validation methods.
 */
export class MonarchNumber extends MonarchType<number, number> {
  constructor() {
    super((input) => {
      if (typeof input === "number") return input;
      throw new MonarchParseError(`expected 'number' received '${typeof input}'`);
    });
  }

  /**
   * Validates minimum value.
   *
   * @param value - Minimum value
   * @returns MonarchNumber with min validation
   */
  public min(value: number) {
    return number().extend(this, {
      parse: (input) => {
        if (input < value) {
          throw new MonarchParseError(`number must be greater than or equal to ${value}`);
        }
        return input;
      },
    });
  }

  /**
   * Validates maximum value.
   *
   * @param value - Maximum value
   * @returns MonarchNumber with max validation
   */
  public max(value: number) {
    return number().extend(this, {
      parse: (input) => {
        if (input > value) {
          throw new MonarchParseError(`number must be less than or equal to ${value}`);
        }
        return input;
      },
    });
  }

  /**
   * Validates value is an integer.
   *
   * @returns MonarchNumber with integer validation
   */
  public integer() {
    return number().extend(this, {
      parse: (input) => {
        if (!Number.isInteger(input)) {
          throw new MonarchParseError("number must be an integer");
        }
        return input;
      },
    });
  }
}
