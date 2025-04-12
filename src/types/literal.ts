import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

export const literal = <T extends string | number | boolean>(...values: T[]) =>
  new MonarchLiteral(values);

export class MonarchLiteral<
  T extends string | number | boolean,
> extends MonarchType<T, T> {
  constructor(private values: T[]) {
    super((input) => {
      const _values = new Set(values);
      if (_values.has(input)) return input;
      throw new MonarchParseError(
        `expected one of [${values.join(", ")}]`,
        input,
      );
    });
  }

  public typeName(): string {
    return `(${this.values.map((v) => (typeof v === "string" ? `"${v}"` : v)).join(" | ")})`;
  }
}
