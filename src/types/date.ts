import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

/**
 * Creates a Date type definition.
 *
 * @returns MonarchDate instance
 */
export const date = () => new MonarchDate();

/**
 * Date type with validation methods.
 */
export class MonarchDate extends MonarchType<Date, Date> {
  constructor() {
    super((input) => {
      if (input instanceof Date) return input;
      throw new MonarchParseError(`expected 'Date' received '${typeof input}'`);
    });
  }

  /**
   * Validates date is after a target date.
   *
   * @param targetDate - Target date for comparison
   * @returns MonarchDate with after validation
   */
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

  /**
   * Validates date is before a target date.
   *
   * @param targetDate - Target date for comparison
   * @returns MonarchDate with before validation
   */
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

/**
 * Date field that automatically sets to current date on creation.
 *
 * @returns MonarchDate with default value
 */
export const createdAt = () => date().default(() => new Date());

/**
 * Date field that automatically updates to current date on modification.
 *
 * @returns MonarchDate with update and default values
 */
export const updatedAt = () => {
  const base = date();
  return base.extend(base, { onUpdate: () => new Date() }).default(() => new Date());
};

/**
 * Creates a date type that accepts ISO date strings.
 *
 * @returns MonarchDateString instance
 */
export const dateString = () => new MonarchDateString();

/**
 * Date type that accepts ISO date strings as input.
 */
export class MonarchDateString extends MonarchType<string, Date> {
  constructor() {
    super((input) => {
      if (typeof input === "string" && !Number.isNaN(Date.parse(input))) {
        return new Date(input);
      }
      throw new MonarchParseError(`expected 'ISO Date string' received '${typeof input}'`);
    });
  }

  /**
   * Validates date is after a target date.
   *
   * @param targetDate - Target date for comparison
   * @returns MonarchDateString with after validation
   */
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

  /**
   * Validates date is before a target date.
   *
   * @param targetDate - Target date for comparison
   * @returns MonarchDateString with before validation
   */
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
