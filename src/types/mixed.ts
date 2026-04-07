import { type AnyMonarchType, MonarchType } from "./type";
import type { JSONSchema } from "./type.schema";

/**
 * Mixed type.
 *
 * @returns MonarchMixed instance
 */
export const mixed = () => new MonarchMixed();

/**
 * Type for mixed fields.
 */
export class MonarchMixed extends MonarchType<unknown> {
  constructor() {
    super((input) => input);
  }

  protected copy() {
    return new MonarchMixed();
  }

  protected index(_path: string[], _depth: number): AnyMonarchType {
    return this;
  }

  protected jsonSchema(): JSONSchema {
    return {};
  }
}
