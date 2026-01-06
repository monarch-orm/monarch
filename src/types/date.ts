import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

/**
 * Date type.
 *
 * @returns MonarchDate instance
 */
export const date = () => new MonarchDate();

/**
 * Type for Date fields.
 */
export class MonarchDate extends MonarchType<Date, Date> {
  constructor() {
    super((input) => {
      if (input instanceof Date) return input;
      throw new MonarchParseError(`expected 'Date' received '${typeof input}'`);
    });
  }

  protected copy() {
    return new MonarchDate();
  }

  /**
   * Validates date is after a target date.
   *
   * @param targetDate - Target date for comparison
   * @returns MonarchDate with after validation
   */
  public after(targetDate: Date) {
    return this.parse((input) => {
      if (input <= targetDate) {
        throw new MonarchParseError(`date must be after ${targetDate.toISOString()}`);
      }
      return input;
    });
  }

  /**
   * Validates date is before a target date.
   *
   * @param targetDate - Target date for comparison
   * @returns MonarchDate with before validation
   */
  public before(targetDate: Date) {
    return this.parse((input) => {
      if (input >= targetDate) {
        throw new MonarchParseError(`date must be before ${targetDate.toISOString()}`);
      }
      return input;
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
export const updatedAt = () => createdAt().onUpdate(() => new Date());

/**
 * Date string type that accepts ISO date strings.
 *
 * @returns MonarchDateString instance
 */
export const dateString = () => new MonarchDateString();

/**
 * Type for ISO date string fields.
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

  protected copy() {
    return new MonarchDateString();
  }

  /**
   * Validates date is after a target date.
   *
   * @param targetDate - Target date for comparison
   * @returns MonarchDateString with after validation
   */
  public after(targetDate: Date) {
    return this.parse((input: Date) => {
      if (input <= targetDate) {
        throw new MonarchParseError(`date must be after ${targetDate.toISOString()}`);
      }
      return input;
    });
  }

  /**
   * Validates date is before a target date.
   *
   * @param targetDate - Target date for comparison
   * @returns MonarchDateString with before validation
   */
  public before(targetDate: Date) {
    return this.parse((input: Date) => {
      if (input >= targetDate) {
        throw new MonarchParseError(`date must be before ${targetDate.toISOString()}`);
      }
      return input;
    });
  }
}
