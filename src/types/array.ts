import { MonarchParseError } from "../errors";
import { type AnyMonarchType, MonarchType } from "./type";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";

/**
 * Array type.
 *
 * @param type - Element type
 * @returns MonarchArray instance
 */
export const array = <T extends AnyMonarchType>(type: T) => new MonarchArray(type);

/**
 * Type for array fields.
 */
export class MonarchArray<T extends AnyMonarchType> extends MonarchType<InferTypeInput<T>[], InferTypeOutput<T>[]> {
  private elementType: T;

  constructor(type: T) {
    super((input) => {
      if (!Array.isArray(input)) {
        throw new MonarchParseError(`expected 'array' received '${typeof input}'`);
      }

      const parser = MonarchType.parser(type);
      const parsed = new Array<InferTypeOutput<T>>(input.length);
      for (const [index, value] of input.entries()) {
        try {
          parsed[index] = parser(value);
        } catch (error) {
          if (error instanceof MonarchParseError) {
            throw new MonarchParseError(`element at index '${index}' ${error.message}`);
          }
          throw error;
        }
      }
      return parsed;
    });
    this.elementType = type;
  }

  protected copy() {
    return new MonarchArray(this.elementType);
  }

  /**
   * Validates minimum array length.
   *
   * @param length - Minimum length
   * @returns MonarchArray with length validation
   */
  public min(length: number) {
    return this.parse((input) => {
      if (input.length < length) {
        throw new MonarchParseError(`array must have at least ${length} elements`);
      }
      return input;
    });
  }

  /**
   * Validates maximum array length.
   *
   * @param length - Maximum length
   * @returns MonarchArray with length validation
   */
  public max(length: number) {
    return this.parse((input) => {
      if (input.length > length) {
        throw new MonarchParseError(`array must have at most ${length} elements`);
      }
      return input;
    });
  }

  /**
   * Validates exact array length.
   *
   * @param length - Exact length
   * @returns MonarchArray with length validation
   */
  public length(length: number) {
    return this.parse((input) => {
      if (input.length !== length) {
        throw new MonarchParseError(`array must have exactly ${length} elements`);
      }
      return input;
    });
  }

  /**
   * Validates array is not empty.
   *
   * @returns MonarchArray with non-empty validation
   */
  public nonempty() {
    return this.parse((input) => {
      if (input.length === 0) {
        throw new MonarchParseError("array must not be empty");
      }
      return input;
    });
  }
}
