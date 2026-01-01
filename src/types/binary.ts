import { Binary } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

export const binary = () => new MonarchBinary();

export class MonarchBinary extends MonarchType<Buffer | Binary, Binary> {
  constructor() {
    super((input) => {
      if (input instanceof Binary) return input;
      if (Buffer.isBuffer(input)) return new Binary(input);
      throw new MonarchParseError(`expected 'Buffer' or 'Binary' received '${typeof input}'`);
    });
  }
}
