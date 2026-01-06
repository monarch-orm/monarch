import { ObjectId } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

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
      throw new MonarchParseError(`expected 'ObjectId' received '${typeof input}' ${input}`);
    });
  }
}
