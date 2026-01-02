import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

/**
 * Creates a boolean type definition.
 *
 * @returns MonarchBoolean instance
 */
export const boolean = () => new MonarchBoolean();

/**
 * Boolean type for true/false values.
 */
export class MonarchBoolean extends MonarchType<boolean, boolean> {
  constructor() {
    super((input) => {
      if (typeof input === "boolean") return input;
      throw new MonarchParseError(`expected 'boolean' received '${typeof input}'`);
    });
  }
}
