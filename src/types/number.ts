import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

export const number = () => new MonarchNumber();

export class MonarchNumber extends MonarchType<number, number> {
  constructor() {
    super((input) => {
      if (typeof input === "number") return input;
      throw new MonarchParseError(
        `expected 'number' received '${typeof input}'`,
      );
    });
  }

  public min(value: number) {
    return number().extend(this, {
      preParse: (input) => {
        if (input < value) {
          throw new MonarchParseError(
            `number must be greater than or equal to ${value}`,
          );
        }
        return input;
      },
    });
  }

  public max(value: number) {
    return number().extend(this, {
      preParse: (input) => {
        if (input > value) {
          throw new MonarchParseError(
            `number must be less than or equal to ${value}`,
          );
        }
        return input;
      },
    });
  }

  public integer() {
    return number().extend(this, {
      preParse: (input) => {
        if (!Number.isInteger(input)) {
          throw new MonarchParseError("number must be an integer");
        }
        return input;
      },
    });
  }

  public positive() {
    return this.min(0);
  }

  public negative() {
    return this.max(0);
  }

  public range(min: number, max: number) {
    return this.min(min).max(max);
  }

  public multipleOf(value: number) {
    return number().extend(this, {
      preParse: (input) => {
        if (input % value !== 0) {
          throw new MonarchParseError(`number must be a multiple of ${value}`);
        }
        return input;
      },
    });
  }
}
