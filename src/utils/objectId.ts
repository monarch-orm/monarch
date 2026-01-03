import { ObjectId } from "mongodb";

/**
 * Safely converts a string to a MongoDB ObjectId.
 * If the string is not a valid ObjectId, returns null.
 *
 * @param id - The string to convert to ObjectId.
 * @returns A valid ObjectId or null if the input is invalid.
 */
export const toObjectId = (id: string | ObjectId): ObjectId | undefined => {
  if (ObjectId.isValid(id)) {
    return new ObjectId(id);
  }
  return undefined;
};
