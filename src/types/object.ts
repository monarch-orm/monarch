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
  constructor(private types: T) {
    super((input) => {
      if (typeof input === "object" && input !== null) {
        for (const key of Object.keys(input)) {
          if (!(key in types)) {
            throw MonarchParseError.create({ message: `unknown field '${key}', object may only specify known fields` });
          }
        }
        const parsed = {} as InferTypeObjectOutput<T>;
        for (const [key, type] of Object.entries(types) as [keyof T & string, T[keyof T]][]) {
          try {
            const parser = MonarchType.parser(type);
            const result = parser(input[key as keyof typeof input] as InferTypeInput<T[keyof T]>);
            if (result !== undefined) parsed[key as keyof typeof parsed] = result;
          } catch (error) {
            throw MonarchParseError.fromCause({ path: key, cause: error });
          }
        }
        return parsed;
      }
      throw MonarchParseError.create({ message: `expected 'object' received '${typeof input}'` });
    });
  }

  protected index(path: string[], depth: number): AnyMonarchType {
    if (depth === path.length - 1) return this;
    const key = path[depth + 1];
    if (key && key in this.types) {
      try {
        return MonarchType.index(this.types[key]!, path, depth + 1);
      } catch (error) {
        throw MonarchParseError.fromCause({ path: key, cause: error });
      }
    }
    throw MonarchParseError.create({ message: `unknown field '${key}'` });
  }

  protected copy() {
    return new MonarchObject(this.types);
  }
}
