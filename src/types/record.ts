import { MonarchParseError } from "../errors";
import { type AnyMonarchType, type Parser, MonarchType } from "./type";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";

/**
 * Record type.
 *
 * @param type - Value type
 * @returns MonarchRecord instance
 */
export const record = <T extends AnyMonarchType>(type: T) => new MonarchRecord(type);

/**
 * Type for record fields.
 */
export class MonarchRecord<T extends AnyMonarchType> extends MonarchType<
  Record<string, InferTypeInput<T>>,
  Record<string, InferTypeOutput<T>>
> {
  constructor(private type: T) {
    super((input) => {
      if (typeof input === "object" && input !== null) {
        const parsed = {} as Record<string, InferTypeOutput<T>>;
        for (const [key, value] of Object.entries(input)) {
          try {
            const parser = MonarchType.parser(type);
            const result = parser(value);
            if (result !== undefined) parsed[key] = result;
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
    if (key && !key.startsWith("$") && !Number.isInteger(Number(key))) {
      try {
        return MonarchType.parserAt(this.type, path, index + 1);
      } catch (error) {
        if (error instanceof MonarchParseError) {
          throw new MonarchParseError({ path: key, error });
        }
        throw error;
      }
    }
    throw new MonarchParseError(`expected a string key`);
  }

  protected copy() {
    return new MonarchRecord(this.type);
  }
}
