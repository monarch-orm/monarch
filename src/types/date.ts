import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

export const date = () => new MonarchDate();

export class MonarchDate extends MonarchType<Date, Date | string | number> {
  constructor() {
    super((input) => {
      if (input instanceof Date) return input;
      const date = new Date(input);
      if (Number.isNaN(date.getTime())) {
        throw new MonarchParseError(
          `expected 'Date' received '${typeof input}'`,
        );
      }
      return date;
    });
  }

  public after(afterDate: Date) {
    return date().extend(this, {
      preParse: (input) => {
        if (input > afterDate) return input;
        throw new MonarchParseError(`date must be after ${afterDate}`);
      },
    });
  }

  public min(targetDate: Date) {
    return date().extend(this, {
      preParse: (input) => {
        if (input < targetDate) {
          throw new MonarchParseError(
            `date must be after ${targetDate.toISOString()}`,
          );
        }
        return input;
      },
    });
  }

  public max(targetDate: Date) {
    return date().extend(this, {
      preParse: (input) => {
        if (input > targetDate) {
          throw new MonarchParseError(
            `date must be before ${targetDate.toISOString()}`,
          );
        }
        return input;
      },
    });
  }

  public future() {
    return this.min(new Date());
  }

  public past() {
    return this.max(new Date());
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
      throw new MonarchParseError(
        `expected 'ISO Date string' received '${typeof input}'`,
      );
    });
  }

  public after(afterDate: Date) {
    return dateString().extend(this, {
      preParse: (input) => {
        const date = new Date(input);
        if (date > afterDate) return input;
        throw new MonarchParseError(`date must be after ${afterDate}`);
      },
    });
  }
}
