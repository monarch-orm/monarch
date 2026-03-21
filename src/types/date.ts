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
      throw MonarchParseError.create({ message: `expected 'Date' received '${typeof input}'` });
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
        throw MonarchParseError.create({ message: `date must be after ${targetDate.toISOString()}` });
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
        throw MonarchParseError.create({ message: `date must be before ${targetDate.toISOString()}` });
      }
      return input;
    });
  }
}
