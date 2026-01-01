import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { number, record } from "../../src/types";

describe("record", () => {
  test("record", () => {
    const schema = createSchema("test", {
      grades: record(number()),
    });

    // @ts-expect-error
    expect(() => Schema.encode(schema, {})).toThrowError("expected 'object' received 'undefined'");
    // empty object is ok
    expect(() => Schema.encode(schema, { grades: {} })).not.toThrowError();
    expect(() =>
      // @ts-expect-error
      Schema.encode(schema, { grades: { math: "50" } }),
    ).toThrowError("field 'math' expected 'number' received 'string'");
    const data = Schema.encode(schema, { grades: { math: 50 } });
    expect(data).toStrictEqual({ grades: { math: 50 } });
  });
});
