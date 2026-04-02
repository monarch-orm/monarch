import { Binary } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";
import type { JSONSchema } from "./type.schema";

/**
 * Binary type.
 *
 * @returns MonarchBinary instance
 */
export const binary = () => new MonarchBinary();

/**
 * Type for Binary fields.
 */
export class MonarchBinary extends MonarchType<Buffer | Binary, Binary> {
  constructor() {
    super((input) => {
      if (input instanceof Binary) return input;
      if (Buffer.isBuffer(input)) return new Binary(input);
      throw MonarchParseError.create({ message: `expected 'Buffer' or 'Binary' received '${typeof input}'` });
    });
  }

  protected copy() {
    return new MonarchBinary();
  }

  protected jsonSchema(): JSONSchema {
    return { bsonType: "binData" };
  }
}
