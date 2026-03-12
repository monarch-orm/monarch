import { MonarchParseError } from "../errors";
import { type AnyMonarchType, type Parser, MonarchType } from "./type";
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
            throw new MonarchParseError(`unknown field '${key}', object may only specify known fields`);
          }
        }
        const parsed = {} as InferTypeObjectOutput<T>;
        for (const [key, type] of Object.entries(types) as [keyof T & string, T[keyof T]][]) {
          try {
            const parser = MonarchType.parser(type);
            const result = parser(input[key as keyof typeof input] as InferTypeInput<T[keyof T]>);
            if (result !== undefined) parsed[key as keyof typeof parsed] = result;
          } catch (error) {
            if (error instanceof MonarchParseError) {
              throw new MonarchParseError({ path: key, error });
            }
            throw error;
          }
        }
        return parsed;
      }
      throw new MonarchParseError(`expected 'object' received '${typeof input}'`);
    });
  }

  protected parserAt(path: string[], index: number): Parser<any, any> {
    if (index === path.length - 1) return this.parser;
    const key = path[index + 1];
    if (key && key in this.types) {
      try {
        return MonarchType.parserAt(this.types[key]!, path, index + 1);
      } catch (error) {
        if (error instanceof MonarchParseError) {
          throw new MonarchParseError({ path: key, error });
        }
        throw error;
      }
    }
    throw new MonarchParseError(`unknown field '${key}'`);
  }

  protected copy() {
    return new MonarchObject(this.types);
  }
}
