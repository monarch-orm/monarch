import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";
import type { JSONSchema } from "./type.schema";

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
export class MonarchLiteral<T> extends MonarchType<T> {
  constructor(private values: T[]) {
    super((input) => {
      const _values = new Set(values);
      if (_values.has(input)) return input;
      throw MonarchParseError.create({ message: `unknown value '${input}', literal may only specify known values` });
    });
  }

  protected copy() {
    return new MonarchLiteral(this.values);
  }

  protected jsonSchema(): JSONSchema {
    return { enum: [...this.values] };
  }
}
