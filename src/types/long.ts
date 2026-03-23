import { Long } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

/**
 * Long type for 64-bit integers.
 *
 * @returns MonarchLong instance
 */
export const long = () => new MonarchLong();

/**
 * Type for Long fields.
 */
export class MonarchLong extends MonarchType<Long | number | bigint, Long | number> {
  constructor() {
    super((input) => {
      try {
        if (Long.isLong(input)) return input;
        if (typeof input === "bigint") return Long.fromBigInt(input);
        if (typeof input === "number") return Long.fromNumber(input);
      } catch (error) {
        throw MonarchParseError.fromCause({ cause: error });
      }
      throw MonarchParseError.create({ message: `expected 'Long', 'number', or 'bigint' received '${typeof input}'` });
    });
  }

  protected copy() {
    return new MonarchLong();
  }
}
