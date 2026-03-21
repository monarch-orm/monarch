import { MonarchParseError } from "../errors";
import { type AnyMonarchType, MonarchType } from "./type";

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
    super((input) => input);
  }

  protected index(path: string[], depth: number): AnyMonarchType {
    if (depth === path.length - 1) return this;
    throw MonarchParseError.create({ message: `updates must replace the entire mixed value` });
  }

  protected copy() {
    return new MonarchMixed();
  }
}
