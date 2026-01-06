import { MonarchParseError } from "../errors";
import { type AnyMonarchType, MonarchType } from "./type";
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
  constructor(type: T) {
    super((input) => {
      if (typeof input === "object" && input !== null) {
        const parsed = {} as Record<string, InferTypeOutput<T>>;
        for (const [key, value] of Object.entries(input)) {
          try {
            const parser = MonarchType.parser(type);
            parsed[key] = parser(value);
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
}
