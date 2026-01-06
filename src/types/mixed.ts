import { MonarchType } from "./type";

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

  protected copy() {
    return new MonarchMixed();
  }
}
