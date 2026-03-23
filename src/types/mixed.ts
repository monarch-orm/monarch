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

  protected index(_path: string[], _depth: number): AnyMonarchType {
    return this;
  }

  protected copy() {
    return new MonarchMixed();
  }
}
