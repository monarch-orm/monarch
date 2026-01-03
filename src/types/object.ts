import { MonarchParseError } from "../errors";
import { type AnyMonarchType, MonarchType } from "./type";
import type { InferTypeInput, InferTypeObjectInput, InferTypeObjectOutput } from "./type-helpers";

/**
 * Object type.
 *
 * @param types - Field types
 * @returns MonarchObject instance
 */
export const object = <T extends Record<string, AnyMonarchType>>(types: T) => new MonarchObject<T>(types);

/**
 * Type for object fields.
 */
export class MonarchObject<T extends Record<string, AnyMonarchType>> extends MonarchType<
  InferTypeObjectInput<T>,
  InferTypeObjectOutput<T>
> {
  constructor(types: T) {
    super((input) => {
      if (typeof input === "object" && input !== null) {
        for (const key of Object.keys(input)) {
          if (!(key in types)) {
            throw new MonarchParseError(`unknown field '${key}', object may only specify known fields`);
          }
        }
        const parsed = {} as InferTypeObjectOutput<T>;
        for (const [key, type] of Object.entries(types) as [keyof T & string, T[keyof T]][]) {
          try {
            const parser = MonarchType.parser(type);
            parsed[key as keyof typeof parsed] = parser(input[key as keyof typeof input] as InferTypeInput<T[keyof T]>);
          } catch (error) {
            if (error instanceof MonarchParseError) {
              throw new MonarchParseError(`field '${key}' ${error.message}'`);
            }
            throw error;
          }
        }
        return parsed;
      }
      throw new MonarchParseError(`expected 'object' received '${typeof input}'`);
    });
  }
}
