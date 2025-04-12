import { MonarchParseError } from "../errors";
import { type AnyMonarchType, MonarchType } from "./type";
import type { InferTypeUnionInput, InferTypeUnionOutput } from "./type-helpers";

export const union = <T extends [AnyMonarchType, ...AnyMonarchType[]]>(
  ...variants: T
) => new MonarchUnion(variants);

export class MonarchUnion<
  T extends [AnyMonarchType, ...AnyMonarchType[]],
> extends MonarchType<InferTypeUnionInput<T>, InferTypeUnionOutput<T>> {
  constructor(variants: T) {
    super((input) => {
      for (const [index, type] of variants.entries()) {
        try {
          const parser = MonarchType.parser(type);
          return parser(input);
        } catch (error) {
          if (error instanceof MonarchParseError) {
            if (index === variants.length - 1) {
              throw new MonarchParseError(
                `expected type ${variants.map((variant) => variant.constructor.name).join(" or ")}`,
                input,
              );
            }
            continue;
          }
          throw error;
        }
      }
      throw new MonarchParseError("no variants found for union type");
    });
  }
}
