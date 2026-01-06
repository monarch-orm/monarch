import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { number, string, tuple } from "../../src/types";

describe("tuple", () => {
  test("tuple", () => {
    const schema = createSchema("test", {
      items: tuple([number(), string()]),
    });

    // @ts-expect-error
    expect(() => Schema.encode(schema, {})).toThrowError("expected 'array' received 'undefined'");
    // @ts-expect-error
    expect(() => Schema.encode(schema, { items: [] })).toThrowError(
      "expected 'array' with 2 elements received 0 elements",
    );
    const data = Schema.encode(schema, { items: [0, "1"] });
    expect(data).toStrictEqual({ items: [0, "1"] });
    // @ts-expect-error
    expect(() => Schema.encode(schema, { items: [0, 1] })).toThrowError(
      "items[1]: expected 'string' received 'number'",
    );
    // @ts-expect-error
    expect(() => Schema.encode(schema, { items: [1, "1", 2] })).toThrowError(
      "expected 'array' with 2 elements received 3 elements",
    );
  });
});
