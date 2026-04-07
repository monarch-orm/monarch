import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { boolean } from "../../src/types";

describe("boolean", () => {
  test("validates boolean type", () => {
    const schema = createSchema("test", {
      isActive: boolean(),
    });

    const trueData = Schema.input(schema, { isActive: true });
    expect(trueData).toStrictEqual({ isActive: true });

    const falseData = Schema.input(schema, { isActive: false });
    expect(falseData).toStrictEqual({ isActive: false });
  });

  test("rejects non-boolean values", () => {
    const schema = createSchema("test", {
      isActive: boolean(),
    });

    // @ts-expect-error
    expect(() => Schema.input(schema, { isActive: "true" })).toThrowError("expected 'boolean' received 'string'");
    // @ts-expect-error
    expect(() => Schema.input(schema, { isActive: 1 })).toThrowError("expected 'boolean' received 'number'");
    // @ts-expect-error
    expect(() => Schema.input(schema, { isActive: {} })).toThrowError("expected 'boolean' received 'object'");
  });

  test("works with nullable and optional", () => {
    const schema = createSchema("test", {
      nullableBoolean: boolean().nullable(),
      optionalBoolean: boolean().optional(),
    });

    const nullData = Schema.input(schema, { nullableBoolean: null });
    expect(nullData).toStrictEqual({ nullableBoolean: null });

    const undefinedData = Schema.input(schema, { nullableBoolean: true });
    expect(undefinedData).toStrictEqual({ nullableBoolean: true });
  });
});
