import { MonarchParseError } from "../errors";
import { type AnyMonarchType, MonarchType } from "./type";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";

export const array = <T extends AnyMonarchType>(type: T) =>
  new MonarchArray(type);

export class MonarchArray<T extends AnyMonarchType> extends MonarchType<
  InferTypeInput<T>[],
  InferTypeOutput<T>[]
> {
  constructor(private type: T) {
    super((input) => {
      if (Array.isArray(input)) {
        const parsed = [] as InferTypeOutput<T>[];
        for (const [index, value] of input.entries()) {
          try {
            const parser = MonarchType.parser(type);
            parsed[index] = parser(value);
          } catch (error) {
            if (error instanceof MonarchParseError) {
              throw new MonarchParseError(
                `at index [${index}] ${error.message}`,
              );
            }
            throw error;
          }
        }
        return parsed;
      }
      throw new MonarchParseError(`expected ${this.typeName()}`, input);
    });
  }

  public typeName(): string {
    return `array<${this.type.typeName()}>`;
  }
}
