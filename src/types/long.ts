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
      if (Long.isLong(input)) return input;
      if (typeof input === "bigint") return Long.fromBigInt(input);
      if (typeof input === "number") {
        // Only convert to Long if outside safe integer range
        if (Number.isSafeInteger(input)) {
          return input;
        }
        return Long.fromNumber(input);
      }
      throw new MonarchParseError(`expected 'Long', 'number', or 'bigint' received '${typeof input}'`);
    });
  }

  protected copy() {
    return new MonarchLong();
  }
}
