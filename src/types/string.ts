import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";
import { jsonSchemaParser, type JSONSchema } from "./type.schema";

/**
 * String type.
 *
 * @returns MonarchString instance
 */
export const string = () => new MonarchString();

/**
 * Type for string fields.
 */
export class MonarchString extends MonarchType<string> {
  constructor() {
    super((input) => {
      if (typeof input === "string") return input;
      throw MonarchParseError.create({ message: `expected 'string' received '${typeof input}'` });
    });
  }

  protected copy() {
    return new MonarchString();
  }

  protected jsonSchema(): JSONSchema {
    return { bsonType: "string" };
  }

  /**
   * Trims whitespace from both ends of the string.
   *
   * @returns MonarchString with trim transformation
   */
  public trim() {
    return this.parse((input) => input.trim());
  }

  /**
   * Converts string to lowercase.
   *
   * @returns MonarchString with lowercase transformation
   */
  public lowercase() {
    return this.parse((input) => input.toLowerCase());
  }

  /**
   * Converts string to uppercase.
   *
   * @returns MonarchString with uppercase transformation
   */
  public uppercase() {
    return this.parse((input) => input.toUpperCase());
  }

  /**
   * Validates minimum string length.
   *
   * @param length - Minimum length
   * @returns MonarchString with length validation
   */
  public minLength(length: number) {
    return this.parse(
      jsonSchemaParser(
        (input) => {
          if (input.length < length) {
            throw MonarchParseError.create({ message: `string must have a minimum length of ${length}` });
          }
          return input;
        },
        { minLength: length },
      ),
    );
  }

  /**
   * Validates maximum string length.
   *
   * @param length - Maximum length
   * @returns MonarchString with length validation
   */
  public maxLength(length: number) {
    return this.parse(
      jsonSchemaParser(
        (input) => {
          if (input.length > length) {
            throw MonarchParseError.create({ message: `string must have a maximum length of ${length}` });
          }
          return input;
        },
        { maxLength: length },
      ),
    );
  }

  /**
   * Validates exact string length.
   *
   * @param length - Required length
   * @returns MonarchString with length validation
   */
  public length(length: number) {
    return this.parse(
      jsonSchemaParser(
        (input) => {
          if (input.length !== length) {
            throw MonarchParseError.create({ message: `string must have a length of ${length}` });
          }
          return input;
        },
        { minLength: length, maxLength: length },
      ),
    );
  }

  /**
   * Validates string matches a regex pattern.
   *
   * @param regex - Regular expression pattern
   * @returns MonarchString with pattern validation
   */
  public pattern(regex: RegExp) {
    return this.parse(
      jsonSchemaParser(
        (input) => {
          if (!regex.test(input)) {
            throw MonarchParseError.create({ message: `string must match pattern ${regex}` });
          }
          return input;
        },
        { pattern: regex.source },
      ),
    );
  }

  /**
   * Validates string is not empty.
   *
   * @returns MonarchString with non-empty validation
   */
  public nonempty() {
    return this.parse(
      jsonSchemaParser(
        (input) => {
          if (input.length === 0) {
            throw MonarchParseError.create({ message: "string must not be empty" });
          }
          return input;
        },
        { minLength: 1 },
      ),
    );
  }
}
