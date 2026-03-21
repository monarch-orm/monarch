import { Double } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

/**
 * Double type for 64-bit floating point numbers.
 *
 * @returns MonarchDouble instance
 */
export const double = () => new MonarchDouble();

/**
 * Type for Double fields.
 */
export class MonarchDouble extends MonarchType<Double | number, Double> {
  constructor() {
    super((input) => {
      if (input instanceof Double) return input;
      if (typeof input === "number") return new Double(input);
      throw MonarchParseError.create({ message: `expected 'Double' or 'number' received '${typeof input}'` });
    });
  }

  protected copy() {
    return new MonarchDouble();
  }
}
