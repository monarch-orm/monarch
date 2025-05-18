import { FieldError } from "../errors";
import { type AnyMonarchType, MonarchType } from "./type";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";

export const array = <T extends AnyMonarchType>(type: T) =>
  new MonarchArray(type);

export class MonarchArray<T extends AnyMonarchType> extends MonarchType<
  InferTypeInput<T>[],
  InferTypeOutput<T>[]
> {
  constructor(type: T) {
    super((input) => {
      if (Array.isArray(input)) {
        const parsed = [] as InferTypeOutput<T>[];
        for (const [index, value] of input.entries()) {
          try {
            const parser = MonarchType.parser(type);
            parsed[index] = parser(value);
          } catch (error) {
            if (error instanceof FieldError) {
              throw new FieldError(error.message, [
                index,
                ...(error.fieldPath ?? []),
              ]);
            }
            throw error;
          }
        }
        return parsed;
      }
      throw new FieldError(`expected 'array' received '${typeof input}'`);
    });
  }
}
