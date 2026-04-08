import { UUID } from "mongodb";
import { randomUUID } from "node:crypto";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";
import type { JSONSchema } from "./type.schema";

/**
 * UUID type.
 *
 * @returns MonarchUUID instance
 */
export const uuid = () => new MonarchUUID();

/**
 * Type for UUID fields.
 */
export class MonarchUUID extends MonarchType<UUID | string, UUID> {
  constructor() {
    super((input) => {
      if (input instanceof UUID) return input;
      if (typeof input === "string") {
        try {
          return new UUID(input);
        } catch (error) {
          throw MonarchParseError.fromCause({ cause: error });
        }
      }
      throw MonarchParseError.create(`expected 'UUID' or 'string' received '${typeof input}'`);
    });
  }

  protected copy() {
    return new MonarchUUID();
  }

  protected jsonSchema(): JSONSchema {
    return { bsonType: "binData" };
  }

  public auto() {
    return this.default(() => randomUUID());
  }
}
