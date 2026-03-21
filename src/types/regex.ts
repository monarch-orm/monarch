import { BSONRegExp } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

/**
 * Regex type.
 *
 * @returns MonarchRegex instance
 */
export const regex = () => new MonarchRegex();

/**
 * Type for BSONRegExp fields.
 */
export class MonarchRegex extends MonarchType<BSONRegExp | RegExp, BSONRegExp> {
  constructor() {
    super((input) => {
      if (input instanceof BSONRegExp) return input;
      if (input instanceof RegExp) return new BSONRegExp(input.source, input.flags);
      throw MonarchParseError.create({ message: `expected 'BSONRegExp' or 'RegExp' received '${typeof input}'` });
    });
  }

  protected copy() {
    return new MonarchRegex();
  }
}
