import { MonarchParseError } from "../errors";
import { type Parser, MonarchType } from "./type";

/**
 * Mixed type.
 *
 * @returns MonarchMixed instance
 */
export const mixed = () => new MonarchMixed();

/**
 * Type for mixed fields.
 */
export class MonarchMixed extends MonarchType<unknown, unknown> {
  constructor() {
    super((input) => {
      return input;
    });
  }

  protected parserAt(path: string[], index: number): Parser<any, any> {
    if (index === path.length - 1) return this.parser;
    throw new MonarchParseError(`updates must replace the entire mixed value`);
  }

  protected copy() {
    return new MonarchMixed();
  }
}
