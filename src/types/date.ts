import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

export const date = () => new MonarchDate();

export class MonarchDate extends MonarchType<Date, Date> {
  constructor() {
    super((input) => {
      if (input instanceof Date) return input;
      throw new MonarchParseError(`expected 'Date' received '${typeof input}'`);
    });
  }

  public after(targetDate: Date) {
    return date().extend(this, {
      parse: (input) => {
        if (input <= targetDate) {
          throw new MonarchParseError(`date must be after ${targetDate.toISOString()}`);
        }
        return input;
      },
    });
  }

  public before(targetDate: Date) {
    return date().extend(this, {
      parse: (input) => {
        if (input >= targetDate) {
          throw new MonarchParseError(`date must be before ${targetDate.toISOString()}`);
        }
        return input;
      },
    });
  }
}

export const createdAt = () => date().default(() => new Date());

export const updatedAt = () => {
  const base = date();
  return base.extend(base, { onUpdate: () => new Date() }).default(() => new Date());
};

export const dateString = () => new MonarchDateString();

export class MonarchDateString extends MonarchType<string, Date> {
  constructor() {
    super((input) => {
      if (typeof input === "string" && !Number.isNaN(Date.parse(input))) {
        return new Date(input);
      }
      throw new MonarchParseError(`expected 'ISO Date string' received '${typeof input}'`);
    });
  }

  public after(targetDate: Date) {
    return dateString().extend(this, {
      parse: (input) => {
        if (input <= targetDate) {
          throw new MonarchParseError(`date must be after ${targetDate.toISOString()}`);
        }
        return input;
      },
    });
  }

  public before(targetDate: Date) {
    return dateString().extend(this, {
      parse: (input) => {
        if (input >= targetDate) {
          throw new MonarchParseError(`date must be before ${targetDate.toISOString()}`);
        }
        return input;
      },
    });
  }
}
