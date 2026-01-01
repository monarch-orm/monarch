import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

export const number = () => new MonarchNumber();

export class MonarchNumber extends MonarchType<number, number> {
  constructor() {
    super((input) => {
      if (typeof input === "number") return input;
      throw new MonarchParseError(`expected 'number' received '${typeof input}'`);
    });
  }

  public min(value: number) {
    return number().extend(this, {
      parse: (input) => {
        if (input < value) {
          throw new MonarchParseError(`number must be greater than or equal to ${value}`);
        }
        return input;
      },
    });
  }

  public max(value: number) {
    return number().extend(this, {
      parse: (input) => {
        if (input > value) {
          throw new MonarchParseError(`number must be less than or equal to ${value}`);
        }
        return input;
      },
    });
  }

  public integer() {
    return number().extend(this, {
      parse: (input) => {
        if (!Number.isInteger(input)) {
          throw new MonarchParseError("number must be an integer");
        }
        return input;
      },
    });
  }
}
