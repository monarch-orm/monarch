import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { number, record } from "../../src/types";

describe("record", () => {
  test("record", () => {
    const schema = createSchema("test", {
      grades: record(number()),
    });

    // @ts-expect-error
    expect(() => Schema.input(schema, {})).toThrow("expected 'object' received 'undefined'");
    // empty object is ok
    expect(() => Schema.input(schema, { grades: {} })).not.toThrow();
    expect(() =>
      // @ts-expect-error
      Schema.input(schema, { grades: { math: "50" } }),
    ).toThrow("grades.math: expected 'number' received 'string'");
    const data = Schema.input(schema, { grades: { math: 50 } });
    expect(data).toStrictEqual({ grades: { math: 50 } });
  });
});
