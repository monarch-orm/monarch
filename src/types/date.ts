import { FieldError } from "../errors";
import { MonarchType } from "./type";

export const date = () => new MonarchDate();

export class MonarchDate extends MonarchType<Date, Date> {
  constructor() {
    super((input) => {
      if (input instanceof Date) return input;
      throw new FieldError(`expected 'Date' received '${typeof input}'`);
    });
  }

  public after(afterDate: Date) {
    return date().extend(this, {
      preParse: (input) => {
        if (input > afterDate) return input;
        throw new FieldError(`date must be after ${afterDate}`);
      },
    });
  }

  public before(targetDate: Date) {
    return date().extend(this, {
      preParse: (input) => {
        if (input > targetDate) {
          throw new FieldError(
            `date must be before ${targetDate.toISOString()}`,
          );
        }
        return input;
      },
    });
  }
}

export const createdAt = () => date().default(() => new Date());

export const updatedAt = () => {
  const base = date();
  return base
    .extend(base, { onUpdate: () => new Date() })
    .default(() => new Date());
};

export const dateString = () => new MonarchDateString();

export class MonarchDateString extends MonarchType<string, Date> {
  constructor() {
    super((input) => {
      if (typeof input === "string" && !Number.isNaN(Date.parse(input))) {
        return new Date(input);
      }
      throw new FieldError(
        `expected 'ISO Date string' received '${typeof input}'`,
      );
    });
  }

  public after(afterDate: Date) {
    return dateString().extend(this, {
      preParse: (input) => {
        const date = new Date(input);
        if (date > afterDate) return input;
        throw new FieldError(`date must be after ${afterDate}`);
      },
    });
  }

  public before(targetDate: Date) {
    return dateString().extend(this, {
      preParse: (input) => {
        const date = new Date(input);
        if (date > targetDate) {
          throw new FieldError(
            `date must be before ${targetDate.toISOString()}`,
          );
        }
        return input;
      },
    });
  }
}
