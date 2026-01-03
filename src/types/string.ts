import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

/**
 * String type.
 *
 * @returns MonarchString instance
 */
export const string = () => new MonarchString();

/**
 * Type for string fields.
 */
export class MonarchString extends MonarchType<string, string> {
  constructor() {
    super((input) => {
      if (typeof input === "string") return input;
      throw new MonarchParseError(`expected 'string' received '${typeof input}'`);
    });
  }

  /**
   * Trims whitespace from both ends of the string.
   *
   * @returns MonarchString with trim transformation
   */
  public trim() {
    return string().extend(this, {
      parse: (input) => input.trim(),
    });
  }

  /**
   * Converts string to lowercase.
   *
   * @returns MonarchString with lowercase transformation
   */
  public lowercase() {
    return string().extend(this, {
      parse: (input) => input.toLowerCase(),
    });
  }

  /**
   * Converts string to uppercase.
   *
   * @returns MonarchString with uppercase transformation
   */
  public uppercase() {
    return string().extend(this, {
      parse: (input) => input.toUpperCase(),
    });
  }

  /**
   * Validates minimum string length.
   *
   * @param length - Minimum length
   * @returns MonarchString with length validation
   */
  public minLength(length: number) {
    return string().extend(this, {
      parse: (input) => {
        if (input.length < length) {
          throw new MonarchParseError(`string must be at least ${length} characters long`);
        }
        return input;
      },
    });
  }

  /**
   * Validates maximum string length.
   *
   * @param length - Maximum length
   * @returns MonarchString with length validation
   */
  public maxLength(length: number) {
    return string().extend(this, {
      parse: (input) => {
        if (input.length > length) {
          throw new MonarchParseError(`string must be at most ${length} characters long`);
        }
        return input;
      },
    });
  }

  /**
   * Validates exact string length.
   *
   * @param length - Required length
   * @returns MonarchString with length validation
   */
  public length(length: number) {
    return string().extend(this, {
      parse: (input) => {
        if (input.length !== length) {
          throw new MonarchParseError(`string must be exactly ${length} characters long`);
        }
        return input;
      },
    });
  }

  /**
   * Validates string matches a regex pattern.
   *
   * @param regex - Regular expression pattern
   * @returns MonarchString with pattern validation
   */
  public pattern(regex: RegExp) {
    return string().extend(this, {
      parse: (input) => {
        if (!regex.test(input)) {
          throw new MonarchParseError(`string must match pattern ${regex}`);
        }
        return input;
      },
    });
  }

  /**
   * Validates string is not empty.
   *
   * @returns MonarchString with non-empty validation
   */
  public nonempty() {
    return string().extend(this, {
      parse: (input) => {
        if (input.length === 0) {
          throw new MonarchParseError("string must not be empty");
        }
        return input;
      },
    });
  }

  /**
   * Validates string includes a substring.
   *
   * @param searchString - Substring to search for
   * @returns MonarchString with inclusion validation
   */
  public includes(searchString: string) {
    return string().extend(this, {
      parse: (input) => {
        if (!input.includes(searchString)) {
          throw new MonarchParseError(`string must include "${searchString}"`);
        }
        return input;
      },
    });
  }
}
