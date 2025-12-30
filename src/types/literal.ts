import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

export const literal = <T extends string | number | boolean>(...values: T[]) => new MonarchLiteral(values);

export class MonarchLiteral<T extends string | number | boolean> extends MonarchType<T, T> {
  constructor(values: T[]) {
    super((input) => {
      const _values = new Set(values);
      if (_values.has(input)) return input;
      throw new MonarchParseError(`unknown value '${input}', literal may only specify known values`);
    });
  }
}
