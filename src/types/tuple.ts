import { MonarchParseError } from "../errors";
import { type AnyMonarchType, type Parser, MonarchType } from "./type";
import type { InferTypeTupleInput, InferTypeTupleOutput } from "./type-helpers";

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
    super((input) => {
      if (Array.isArray(input)) {
        if (input.length !== types.length) {
          throw new MonarchParseError(
            `expected 'array' with ${types.length} elements received ${input.length} elements`,
          );
        }
        const parsed = [] as InferTypeTupleOutput<T>;
        for (const [index, type] of types.entries()) {
          try {
            const parser = MonarchType.parser(type);
            parsed[index] = parser(input[index]);
          } catch (error) {
            if (error instanceof MonarchParseError) {
              throw new MonarchParseError({ path: index, error });
            }
            throw error;
          }
        }
        return parsed;
      }
      throw new MonarchParseError(`expected 'array' received '${typeof input}'`);
    });
  }

  protected parserAt(path: string[], index: number): Parser<any, any> {
    if (index === path.length - 1) return this.parser;
    const tupleIndex = path[index + 1];
    const parsedIndex = Number(tupleIndex);
    const elementType = this.types[tupleIndex && Number.isInteger(parsedIndex) ? parsedIndex : -1];
    if (elementType) {
      try {
        return MonarchType.parserAt(elementType, path, index + 1);
      } catch (error) {
        if (error instanceof MonarchParseError) {
          throw new MonarchParseError({ path: tupleIndex!, error });
        }
        throw error;
      }
    }
    throw new MonarchParseError(`expected a valid tuple index`);
  }

  protected copy() {
    return new MonarchTuple(this.types);
  }
}
