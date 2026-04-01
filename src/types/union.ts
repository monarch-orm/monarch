import { MonarchParseError } from "../errors";
import { MonarchNullable, MonarchType, type AnyMonarchType } from "./type";
import type {
  InferTypeTaggedUnionInput,
  InferTypeTaggedUnionOutput,
  InferTypeUnionInput,
  InferTypeUnionOutput,
} from "./type-helpers";
import type { JSONSchema } from "./type.schema";

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
  constructor(private variants: T) {
    super((input) => {
      for (const [index, type] of variants.entries()) {
        try {
          const parser = MonarchType.parser(type);
          return parser(input);
        } catch (error) {
          if (error instanceof MonarchParseError) {
            if (index === variants.length - 1) {
              throw MonarchParseError.create({ message: `no matching variant found for union type: ${error.message}` });
            }
            continue;
          }
          throw error;
        }
      }
      throw MonarchParseError.create({ message: `expected 'union' variant received '${typeof input}'` });
    });
  }

  protected index(path: string[], depth: number): AnyMonarchType {
    if (depth === path.length - 1) return this;
    throw MonarchParseError.create({ message: `updates must replace the entire union value` });
  }

  protected copy() {
    return new MonarchUnion(this.variants);
  }

  protected jsonSchema(): JSONSchema {
    const anyOf = this.variants.map((variant) => {
      let variantSchema = MonarchType.jsonSchema(variant);
      const isNullable = MonarchType.isInstanceOf(variant, MonarchNullable);
      if (isNullable) variantSchema = MonarchNullable.nullableJsonSchema(variantSchema);
      return variantSchema;
    });
    return {
      anyOf,
    };
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
  constructor(private variants: T) {
    super((input) => {
      if (typeof input === "object" && input !== null) {
        if (!("tag" in input)) {
          throw MonarchParseError.create({ message: "missing field 'tag' in tagged union" });
        }
        if (!("value" in input)) {
          throw MonarchParseError.create({ message: "missing field 'value' in tagged union" });
        }
        if (Object.keys(input).length > 2) {
          for (const key of Object.keys(input)) {
            if (key !== "tag" && key !== "value") {
              throw MonarchParseError.create({
                message: `unknown field '${key}', tagged union may only specify 'tag' and 'value' fields`,
              });
            }
          }
        }
        const type = variants[input.tag];
        if (!type) {
          throw MonarchParseError.create({ message: `unknown tag '${input.tag.toString()}'` });
        }
        try {
          const parser = MonarchType.parser(type);
          return { tag: input.tag, value: parser(input.value) };
        } catch (error) {
          if (error instanceof MonarchParseError) {
            throw MonarchParseError.create({
              message: `invalid value for tag '${input.tag.toString()}' ${error.message}'`,
            });
          }
          throw error;
        }
      }
      throw MonarchParseError.create({ message: `expected 'object' received '${typeof input}'` });
    });
  }

  protected index(path: string[], depth: number): AnyMonarchType {
    if (depth === path.length - 1) return this;
    throw MonarchParseError.create({ message: `updates must replace the entire tagged union value` });
  }

  protected copy() {
    return new MonarchTaggedUnion(this.variants);
  }

  protected jsonSchema(): JSONSchema {
    return {
      oneOf: Object.entries(this.variants).map(([tag, type]) => {
        let valueSchema = MonarchType.jsonSchema(type);
        const isNullable = MonarchType.isInstanceOf(type, MonarchNullable);
        if (isNullable) valueSchema = MonarchNullable.nullableJsonSchema(valueSchema);
        return {
          bsonType: "object",
          additionalProperties: false,
          required: ["tag", "value"],
          properties: {
            tag: { enum: [tag] },
            value: valueSchema,
          },
        };
      }),
    };
  }
}
