import { Int32 } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

/**
 * Int32 type for 32-bit integers.
 *
 * @returns MonarchInt32 instance
 */
export const int32 = () => new MonarchInt32();

/**
 * Type for Int32 fields.
 */
export class MonarchInt32 extends MonarchType<Int32 | number> {
  constructor() {
    super((input) => {
      if (input instanceof Int32) return input;
      if (typeof input === "number") {
        try {
          return new Int32(input);
        } catch (error) {
          throw MonarchParseError.fromCause({ cause: error });
        }
      }
      throw MonarchParseError.create({ message: `expected 'Int32' or 'number' received '${typeof input}'` });
    });
  }

  protected copy() {
    return new MonarchInt32();
  }
}
