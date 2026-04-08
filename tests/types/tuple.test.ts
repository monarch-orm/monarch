import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { number, string, tuple } from "../../src/types";

describe("tuple", () => {
  test("tuple", () => {
    const schema = createSchema("test", {
      items: tuple([number(), string()]),
    });

    // @ts-expect-error
    expect(() => Schema.input(schema, {})).toThrow("expected 'array' received 'undefined'");
    // @ts-expect-error
    expect(() => Schema.input(schema, { items: [] })).toThrow("expected 'array' with 2 elements received 0 elements");
    const data = Schema.input(schema, { items: [0, "1"] });
    expect(data).toStrictEqual({ items: [0, "1"] });
    // @ts-expect-error
    expect(() => Schema.input(schema, { items: [0, 1] })).toThrow("items.1: expected 'string' received 'number'");
    // @ts-expect-error
    expect(() => Schema.input(schema, { items: [1, "1", 2] })).toThrow(
      "expected 'array' with 2 elements received 3 elements",
    );
  });

  test("rejects optional tuple item type", () => {
    expect(() =>
      createSchema("test", {
        items: tuple([number(), number().optional()]),
      }),
    ).toThrow("tuple item at index 1 cannot be optional");
  });
});
