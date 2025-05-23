import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

export const string = () => new MonarchString();

export class MonarchString extends MonarchType<string, string> {
  constructor() {
    super((input) => {
      if (typeof input === "string") return input;
      throw new MonarchParseError(
        `expected 'string' received '${typeof input}'`,
      );
    });
  }

  public lowercase() {
    return string().extend(this, {
      postParse: (input) => input.toLowerCase(),
    });
  }

  public uppercase() {
    return string().extend(this, {
      postParse: (input) => input.toUpperCase(),
    });
  }

  public minLength(length: number) {
    return string().extend(this, {
      postParse: (input) => {
        if (input.length < length) {
          throw new MonarchParseError(
            `string must be at least ${length} characters long`,
          );
        }
        return input;
      },
    });
  }

  public maxLength(length: number) {
    return string().extend(this, {
      postParse: (input) => {
        if (input.length > length) {
          throw new MonarchParseError(
            `string must be at most ${length} characters long`,
          );
        }
        return input;
      },
    });
  }

  public length(length: number) {
    return string().extend(this, {
      postParse: (input) => {
        if (input.length !== length) {
          throw new MonarchParseError(
            `string must be exactly ${length} characters long`,
          );
        }
        return input;
      },
    });
  }

  public pattern(regex: RegExp) {
    return string().extend(this, {
      postParse: (input) => {
        if (!regex.test(input)) {
          throw new MonarchParseError(`string must match pattern ${regex}`);
        }
        return input;
      },
    });
  }

  public trim() {
    return string().extend(this, {
      postParse: (input) => input.trim(),
    });
  }

  public nonEmpty() {
    return string().extend(this, {
      preParse: (input) => {
        if (input.length === 0) {
          throw new MonarchParseError("string must not be empty");
        }
        return input;
      },
    });
  }

  public includes(searchString: string) {
    return string().extend(this, {
      preParse: (input) => {
        if (!input.includes(searchString)) {
          throw new MonarchParseError(`string must include "${searchString}"`);
        }
        return input;
      },
    });
  }
}
