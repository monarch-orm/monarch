import { MonarchParseError } from "../errors";
import { MonarchType, type AnyMonarchType } from "./type";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";
import type { JSONSchema } from "./type.schema";

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
          const parser = MonarchType.parser(type, key);
          const result = parser(value);
          if (result !== undefined) parsed[key] = result;
        }
        return parsed;
      }
      throw MonarchParseError.create(`expected 'object' received '${typeof input}'`);
    });
  }

  protected copy() {
    return new MonarchRecord(this.type);
  }

  protected index(path: string[], depth: number): AnyMonarchType {
    if (depth === path.length - 1) return this;
    const key = path[depth + 1];
    if (key && !key.startsWith("$") && !Number.isInteger(Number(key))) {
      try {
        return MonarchType.index(this.type, path, depth + 1);
      } catch (error) {
        throw MonarchParseError.fromCause({ path: key, cause: error });
      }
    }
    throw MonarchParseError.create(`expected a string key`);
  }

  protected jsonSchema(): JSONSchema {
    return {
      bsonType: "object",
      additionalProperties: false,
      patternProperties: {
        ".*": MonarchType.jsonSchema(this.type),
      },
    };
  }

  public static type<T extends AnyMonarchType>(array: MonarchRecord<T>): T {
    return array.type;
  }
}
