import { MonarchError, MonarchParseError } from "../errors";
import { MonarchOptional, MonarchType, type AnyMonarchType } from "./type";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";
import { jsonSchemaParser, type JSONSchema } from "./type.schema";

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
        throw MonarchParseError.create(`expected 'array' received '${typeof input}'`);
      }

      const parsed = new Array<InferTypeOutput<T>>(input.length);
      for (const [index, value] of input.entries()) {
        const parser = MonarchType.parser(type, index);
        parsed[index] = parser(value);
      }
      return parsed;
    });
  }

  protected copy() {
    return new MonarchArray(this.type);
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
    throw MonarchParseError.create(`expected a numeric index or positional operator`);
  }

  protected jsonSchema(): JSONSchema {
    return {
      bsonType: "array",
      items: MonarchType.jsonSchema(this.type),
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
  public minLength(length: number) {
    return this.parse(
      jsonSchemaParser(
        (input) => {
          if (input.length < length) {
            throw MonarchParseError.create(`array must have at least ${length} elements`);
          }
          return input;
        },
        { minItems: length },
      ),
    );
  }

  /**
   * Validates maximum array length.
   *
   * @param length - Maximum length
   * @returns MonarchArray with length validation
   */
  public maxLength(length: number) {
    return this.parse(
      jsonSchemaParser(
        (input) => {
          if (input.length > length) {
            throw MonarchParseError.create(`array must have at most ${length} elements`);
          }
          return input;
        },
        { maxItems: length },
      ),
    );
  }

  /**
   * Validates exact array length.
   *
   * @param length - Exact length
   * @returns MonarchArray with length validation
   */
  public length(length: number) {
    return this.parse(
      jsonSchemaParser(
        (input) => {
          if (input.length !== length) {
            throw MonarchParseError.create(`array must have exactly ${length} elements`);
          }
          return input;
        },
        { minItems: length, maxItems: length },
      ),
    );
  }

  /**
   * Validates array is not empty.
   *
   * @returns MonarchArray with non-empty validation
   */
  public nonempty() {
    return this.parse(
      jsonSchemaParser(
        (input) => {
          if (input.length === 0) {
            throw MonarchParseError.create("array must not be empty");
          }
          return input;
        },
        { minItems: 1 },
      ),
    );
  }
}
