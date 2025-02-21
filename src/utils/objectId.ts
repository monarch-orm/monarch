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

/**
 * Checks if a given string is a valid MongoDB ObjectId.
 *
 * @param id - The string to check.
 * @returns True if the string is a valid ObjectId, false otherwise.
 */
export const isValidObjectId = (id: string): boolean => {
  return ObjectId.isValid(id);
};

/**
 * Converts an ObjectId to its string representation.
 *
 * @param objectId - The ObjectId to convert.
 * @returns The string representation of the ObjectId.
 */
export const objectIdToString = (objectId: ObjectId): string => {
  return objectId.toHexString();
};

/**
 * Generates a new MongoDB ObjectId.
 *
 * @returns A new ObjectId instance.
 */
export const generateObjectId = (): ObjectId => {
  return new ObjectId();
};
