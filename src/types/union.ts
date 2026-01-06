import { MonarchParseError } from "../errors";
import { type AnyMonarchType, MonarchType } from "./type";
import type {
  InferTypeTaggedUnionInput,
  InferTypeTaggedUnionOutput,
  InferTypeUnionInput,
  InferTypeUnionOutput,
} from "./type-helpers";

/**
 * Union type.
 *
 * @param variants - Type variants
 * @returns MonarchUnion instance
 */
export const union = <T extends [AnyMonarchType, ...AnyMonarchType[]]>(...variants: T) => new MonarchUnion(variants);

/**
 * Type for union fields.
 */
export class MonarchUnion<T extends [AnyMonarchType, ...AnyMonarchType[]]> extends MonarchType<
  InferTypeUnionInput<T>,
  InferTypeUnionOutput<T>
> {
  constructor(variants: T) {
    super((input) => {
      for (const [index, type] of variants.entries()) {
        try {
          const parser = MonarchType.parser(type);
          return parser(input);
        } catch (error) {
          if (error instanceof MonarchParseError) {
            if (index === variants.length - 1) {
              throw new MonarchParseError(`no matching variant found for union type: ${error.message}`);
            }
            continue;
          }
          throw error;
        }
      }
      throw new MonarchParseError(`expected 'union' variant received '${typeof input}'`);
    });
  }
}

/**
 * Tagged union type.
 *
 * @param variants - Tag to type mapping
 * @returns MonarchTaggedUnion instance
 */
export const taggedUnion = <T extends Record<string, AnyMonarchType>>(variants: T) => new MonarchTaggedUnion(variants);

/**
 * Type for tagged union fields.
 */
export class MonarchTaggedUnion<T extends Record<string, AnyMonarchType>> extends MonarchType<
  InferTypeTaggedUnionInput<T>,
  InferTypeTaggedUnionOutput<T>
> {
  constructor(variants: T) {
    super((input) => {
      if (typeof input === "object" && input !== null) {
        if (!("tag" in input)) {
          throw new MonarchParseError("missing field 'tag' in tagged union");
        }
        if (!("value" in input)) {
          throw new MonarchParseError("missing field 'value' in tagged union");
        }
        if (Object.keys(input).length > 2) {
          for (const key of Object.keys(input)) {
            if (key !== "tag" && key !== "value") {
              throw new MonarchParseError(
                `unknown field '${key}', tagged union may only specify 'tag' and 'value' fields`,
              );
            }
          }
        }
        const type = variants[input.tag];
        if (!type) {
          throw new MonarchParseError(`unknown tag '${input.tag.toString()}'`);
        }
        try {
          const parser = MonarchType.parser(type);
          return { tag: input.tag, value: parser(input.value) };
        } catch (error) {
          if (error instanceof MonarchParseError) {
            throw new MonarchParseError(`invalid value for tag '${input.tag.toString()}' ${error.message}'`);
          }
          throw error;
        }
      }
      throw new MonarchParseError(`expected 'object' received '${typeof input}'`);
    });
  }
}
