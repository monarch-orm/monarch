import { MonarchError, MonarchParseError } from "../errors";
import { MonarchNullable, MonarchOptional, MonarchType, type AnyMonarchType } from "./type";
import type { InferTypeTupleInput, InferTypeTupleOutput } from "./type-helpers";
import type { JSONSchema } from "./type.schema";

/**
 * Tuple type.
 *
 * @param types - Element types
 * @returns MonarchTuple instance
 */
export const tuple = <T extends [AnyMonarchType, ...AnyMonarchType[]]>(types: T) => {
  return new MonarchTuple(types);
};

/**
 * Type for tuple fields.
 */
export class MonarchTuple<T extends [AnyMonarchType, ...AnyMonarchType[]]> extends MonarchType<
  InferTypeTupleInput<T>,
  InferTypeTupleOutput<T>
> {
  constructor(private types: T) {
    for (const [index, type] of types.entries()) {
      if (MonarchType.isInstanceOf(type, MonarchOptional)) {
        throw new MonarchError(`tuple item at index ${index} cannot be optional`);
      }
    }

    super((input) => {
      if (Array.isArray(input)) {
        if (input.length !== types.length) {
          throw MonarchParseError.create({
            message: `expected 'array' with ${types.length} elements received ${input.length} elements`,
          });
        }
        const parsed = [] as InferTypeTupleOutput<T>;
        for (const [index, type] of types.entries()) {
          try {
            const parser = MonarchType.parser(type);
            parsed[index] = parser(input[index]);
          } catch (error) {
            throw MonarchParseError.fromCause({ path: index, cause: error });
          }
        }
        return parsed;
      }
      throw MonarchParseError.create({ message: `expected 'array' received '${typeof input}'` });
    });
  }

  protected index(path: string[], depth: number): AnyMonarchType {
    if (depth === path.length - 1) return this;
    const index = path[depth + 1];
    const parsedIndex = index ? Number(index) : -1;
    const elementType = this.types[parsedIndex];
    if (elementType) {
      try {
        return MonarchType.index(elementType, path, depth + 1);
      } catch (error) {
        throw MonarchParseError.fromCause({ path: index, cause: error });
      }
    }
    throw MonarchParseError.create({ message: `expected a valid tuple index` });
  }

  protected copy() {
    return new MonarchTuple(this.types);
  }

  protected jsonSchema(): JSONSchema {
    const items = this.types.map((type) => {
      let itemSchema = MonarchType.jsonSchema(type);
      const isNullable = MonarchType.isInstanceOf(type, MonarchNullable);
      if (isNullable) itemSchema = MonarchNullable.nullableJsonSchema(itemSchema);
      return itemSchema;
    });

    return {
      bsonType: "array",
      items,
      minItems: this.types.length,
      maxItems: this.types.length,
      additionalItems: false,
    };
  }
}
