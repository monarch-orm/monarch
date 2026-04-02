import { ObjectId } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";
import type { JSONSchema } from "./type.schema";

/**
 * ObjectId type.
 *
 * @returns MonarchObjectId instance
 */
export const objectId = () => new MonarchObjectId();

/**
 * Type for ObjectId fields.
 */
export class MonarchObjectId extends MonarchType<ObjectId | string, ObjectId> {
  constructor() {
    super((input) => {
      if (ObjectId.isValid(input)) return new ObjectId(input);
      throw MonarchParseError.create({ message: `expected 'ObjectId' received '${typeof input}' ${input}` });
    });
  }

  protected copy() {
    return new MonarchObjectId();
  }

  protected jsonSchema(): JSONSchema {
    return { bsonType: "objectId" };
  }

  public auto() {
    return this.default(() => new ObjectId());
  }
}
