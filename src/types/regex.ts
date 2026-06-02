import { BSONRegExp } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";
import type { JSONSchema } from "./type.schema";

/**
 * Regex type.
 *
 * @returns MonarchRegex instance
 */
export const regex = () => new MonarchRegex();

/**
 * Type for regex fields.
 */
export class MonarchRegex extends MonarchType<BSONRegExp | RegExp, RegExp> {
  constructor() {
    super((input) => {
      if (input instanceof BSONRegExp) return new RegExp(input.pattern, input.options);
      if (input instanceof RegExp) {
        new BSONRegExp(input.source, input.flags); // validate BSON-compatible flags
        return input;
      }
      throw MonarchParseError.create(`expected 'BSONRegExp' or 'RegExp' received '${typeof input}'`);
    });
  }

  protected copy() {
    return new MonarchRegex();
  }

  protected jsonSchema(): JSONSchema {
    return { bsonType: "regex" };
  }
}
