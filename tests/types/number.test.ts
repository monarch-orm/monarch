import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { number } from "../../src/types";

describe("number", () => {
  test("number validation", () => {
    const schema = createSchema("test", {
      value: number(),
    });

    const data = Schema.encode(schema, { value: 42 });
    expect(data).toStrictEqual({ value: 42 });

    // @ts-expect-error
    expect(() => Schema.encode(schema, { value: "42" })).toThrowError("expected 'number' received 'string'");
  });

  test("min and max constraints", () => {
    const schema = createSchema("test", {
      min: number().min(5),
      max: number().max(10),
    });

    expect(() => Schema.encode(schema, { min: 3, max: 8 })).toThrowError("number must be greater than or equal to 5");
    expect(() => Schema.encode(schema, { min: 6, max: 12 })).toThrowError("number must be less than or equal to 10");

    const data = Schema.encode(schema, { min: 7, max: 8 });
    expect(data).toStrictEqual({ min: 7, max: 8 });
  });

  test("integer conversion", () => {
    const schema = createSchema("test", {
      value: number().integer(),
    });

    expect(() => Schema.encode(schema, { value: 5.7 })).toThrowError("number must be an integer");
  });

  test("validation error order - type error before value validation", () => {
    // Test that type validation errors occur before chained validation method errors
    const schema = createSchema("test", {
      minValue: number().min(5),
      maxValue: number().max(10),
      integerValue: number().integer(),
    });

    // Invalid type for number().min() should throw type error first
    expect(() =>
      Schema.encode(schema, {
        minValue: "not a number" as any,
        maxValue: 8,
        integerValue: 6,
      }),
    ).toThrowError("expected 'number' received 'string'");

    // Invalid type for number().max() should throw type error first
    expect(() =>
      Schema.encode(schema, {
        minValue: 7,
        maxValue: true as any,
        integerValue: 6,
      }),
    ).toThrowError("expected 'number' received 'boolean'");

    // Invalid type for number().integer() should throw type error first
    expect(() =>
      Schema.encode(schema, {
        minValue: 7,
        maxValue: 8,
        integerValue: { value: 6 } as any,
      }),
    ).toThrowError("expected 'number' received 'object'");
  });
});
