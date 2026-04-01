import { MonarchParseError } from "../errors";
import { MonarchNullable, MonarchType, type AnyMonarchType } from "./type";
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
          try {
            const parser = MonarchType.parser(type);
            const result = parser(value);
            if (result !== undefined) parsed[key] = result;
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
    if (key && !key.startsWith("$") && !Number.isInteger(Number(key))) {
      try {
        return MonarchType.index(this.type, path, depth + 1);
      } catch (error) {
        throw MonarchParseError.fromCause({ path: key, cause: error });
      }
    }
    throw MonarchParseError.create({ message: `expected a string key` });
  }

  protected copy() {
    return new MonarchRecord(this.type);
  }

  protected jsonSchema(): JSONSchema {
    let valueSchema = MonarchType.jsonSchema(this.type);
    const isNullable = MonarchType.isInstanceOf(this.type, MonarchNullable);
    if (isNullable) valueSchema = MonarchNullable.nullableJsonSchema(valueSchema);
    return {
      bsonType: "object",
      additionalProperties: false,
      patternProperties: {
        ".*": valueSchema,
      },
    };
  }

  public static type<T extends AnyMonarchType>(array: MonarchRecord<T>): T {
    return array.type;
  }
}
