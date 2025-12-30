import { ObjectId } from "mongodb";
import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

export const objectId = () => new MonarchObjectId();

export class MonarchObjectId extends MonarchType<ObjectId | string, ObjectId> {
  constructor() {
    super((input) => {
      if (ObjectId.isValid(input)) return new ObjectId(input);
      throw new MonarchParseError(`expected valid ObjectId received '${typeof input}' ${input}`);
    });
  }
}
