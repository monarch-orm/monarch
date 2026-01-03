import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

/**
 * Boolean type.
 *
 * @returns MonarchBoolean instance
 */
export const boolean = () => new MonarchBoolean();

/**
 * Type for boolean fields.
 */
export class MonarchBoolean extends MonarchType<boolean, boolean> {
  constructor() {
    super((input) => {
      if (typeof input === "boolean") return input;
      throw new MonarchParseError(`expected 'boolean' received '${typeof input}'`);
    });
  }
}
