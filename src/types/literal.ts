import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

/**
 * Literal type.
 *
 * @param values - Allowed values
 * @returns MonarchLiteral instance
 */
export const literal = <T extends string | number | boolean>(...values: T[]) => new MonarchLiteral(values);

/**
 * Type for literal fields.
 */
export class MonarchLiteral<T extends string | number | boolean> extends MonarchType<T, T> {
  constructor(private values: T[]) {
    super((input) => {
      const _values = new Set(values);
      if (_values.has(input)) return input;
      throw new MonarchParseError(`unknown value '${input}', literal may only specify known values`);
    });
  }

  protected copy() {
    return new MonarchLiteral(this.values);
  }
}
