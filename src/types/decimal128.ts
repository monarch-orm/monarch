import { Decimal128 } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

export const decimal128 = () => new MonarchDecimal128();

export class MonarchDecimal128 extends MonarchType<Decimal128 | string, Decimal128> {
  constructor() {
    super((input) => {
      if (input instanceof Decimal128) return input;
      if (typeof input === "string") return Decimal128.fromString(input);
      throw new MonarchParseError(`expected 'Decimal128' or 'string' received '${typeof input}'`);
    });
  }
}
