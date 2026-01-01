import { MonarchParseError } from "../errors";
import { type AnyMonarchType, MonarchType } from "./type";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";

export const array = <T extends AnyMonarchType>(type: T) => new MonarchArray(type);

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

  public min(length: number) {
    return array(this.elementType).extend(this, {
      parse: (input) => {
        if (input.length < length) {
          throw new MonarchParseError(`array must have at least ${length} elements`);
        }
        return input;
      },
    });
  }

  public max(length: number) {
    return array(this.elementType).extend(this, {
      parse: (input) => {
        if (input.length > length) {
          throw new MonarchParseError(`array must have at most ${length} elements`);
        }
        return input;
      },
    });
  }

  public length(length: number) {
    return array(this.elementType).extend(this, {
      parse: (input) => {
        if (input.length !== length) {
          throw new MonarchParseError(`array must have exactly ${length} elements`);
        }
        return input;
      },
    });
  }

  public nonempty() {
    return this.min(1);
  }
}
