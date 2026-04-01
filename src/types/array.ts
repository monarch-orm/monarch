import { MonarchError, MonarchParseError } from "../errors";
import { MonarchNullable, MonarchOptional, MonarchType, type AnyMonarchType } from "./type";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";
import type { JSONSchema } from "./type.schema";

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
  constructor(private type: T) {
    if (MonarchType.isInstanceOf(type, MonarchOptional)) {
      throw new MonarchError("array item type cannot be optional");
    }

    super((input) => {
      if (!Array.isArray(input)) {
        throw MonarchParseError.create({ message: `expected 'array' received '${typeof input}'` });
      }

      const parser = MonarchType.parser(type);
      const parsed = new Array<InferTypeOutput<T>>(input.length);
      for (const [index, value] of input.entries()) {
        try {
          parsed[index] = parser(value);
        } catch (error) {
          throw MonarchParseError.fromCause({ path: index, cause: error });
        }
      }
      return parsed;
    });
  }

  protected index(path: string[], depth: number): AnyMonarchType {
    if (depth === path.length - 1) return this;
    const index = path[depth + 1];
    if (index?.startsWith("$") || (index && Number.isInteger(Number(index)) && Number(index) >= 0)) {
      try {
        return MonarchType.index(this.type, path, depth + 1);
      } catch (error) {
        throw MonarchParseError.fromCause({ path: index, cause: error });
      }
    }
    throw MonarchParseError.create({ message: `expected a numeric index or positional operator` });
  }

  protected copy() {
    return new MonarchArray(this.type);
  }

  protected jsonSchema(): JSONSchema {
    let itemSchema = MonarchType.jsonSchema(this.type);
    const isNullable = MonarchType.isInstanceOf(this.type, MonarchNullable);
    if (isNullable) itemSchema = MonarchNullable.nullableJsonSchema(itemSchema);
    return {
      bsonType: "array",
      items: itemSchema,
    };
  }

  public static type<T extends AnyMonarchType>(array: MonarchArray<T>): T {
    return array.type;
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
        throw MonarchParseError.create({ message: `array must have at least ${length} elements` });
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
        throw MonarchParseError.create({ message: `array must have at most ${length} elements` });
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
        throw MonarchParseError.create({ message: `array must have exactly ${length} elements` });
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
        throw MonarchParseError.create({ message: "array must not be empty" });
      }
      return input;
    });
  }
}
