import { ObjectId } from "mongodb";

/**
 * Safely converts a value to a MongoDB ObjectId.
 * If the value is not a valid ObjectId, returns null.
 *
 * @param id - The value to convert to ObjectId.
 * @returns A valid ObjectId or null if the input is invalid.
 */
export const toObjectId = (input: string | ObjectId): ObjectId | null => {
  if (!ObjectId.isValid(input)) return null;
  return new ObjectId(input);
};
