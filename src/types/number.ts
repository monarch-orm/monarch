import { FieldError } from "../errors";
import { MonarchType } from "./type";

export const number = () => new MonarchNumber();

export class MonarchNumber extends MonarchType<number, number> {
  constructor() {
    super((input) => {
      if (typeof input === "number") return input;
      throw new FieldError(`expected 'number' received '${typeof input}'`);
    });
  }

  public min(value: number) {
    return number().extend(this, {
      preParse: (input) => {
        if (input < value) {
          throw new FieldError(
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
          throw new FieldError(`number must be less than or equal to ${value}`);
        }
        return input;
      },
    });
  }

  public integer() {
    return number().extend(this, {
      postParse: (input) => {
        return Math.floor(input);
      },
    });
  }

  public multipleOf(value: number) {
    return number().extend(this, {
      postParse: (input) => {
        if (input % value !== 0) {
          throw new FieldError(`number must be a multiple of ${value}`);
        }
        return input;
      },
    });
  }
}
