import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { literal } from "../../src/types";

describe("literal", () => {
  test("literal", () => {
    const schema = createSchema("test", {
      role: literal("admin", "moderator"),
    });

    // @ts-expect-error
    expect(() => Schema.input(schema, {})).toThrow("unknown value 'undefined', literal may only specify known values");
    // @ts-expect-error
    expect(() => Schema.input(schema, { role: "user" })).toThrow(
      "unknown value 'user', literal may only specify known values",
    );
    const data = Schema.input(schema, { role: "admin" });
    expect(data).toStrictEqual({ role: "admin" });
  });
});
