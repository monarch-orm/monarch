import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { array, number, string } from "../../src/types";

describe("array", () => {
  test("validates array type", () => {
    const schema = createSchema("test", {
      items: array(number()),
    });

    // @ts-expect-error
    expect(() => Schema.encode(schema, {})).toThrowError("expected 'array' received 'undefined'");
    // empty array is ok
    expect(() => Schema.encode(schema, { items: [] })).not.toThrowError();
    // @ts-expect-error
    expect(() => Schema.encode(schema, { items: [0, "1"] })).toThrowError(
      "element at index '1' expected 'number' received 'string'",
    );
    const data = Schema.encode(schema, { items: [0, 1] });
    expect(data).toStrictEqual({ items: [0, 1] });
  });

  test("min - validates minimum array length", () => {
    const schema = createSchema("test", {
      items: array(string()).min(2),
    });

    const data = Schema.encode(schema, { items: ["a", "b"] });
    expect(data).toStrictEqual({ items: ["a", "b"] });

    const data2 = Schema.encode(schema, { items: ["a", "b", "c"] });
    expect(data2).toStrictEqual({ items: ["a", "b", "c"] });

    expect(() => Schema.encode(schema, { items: ["a"] })).toThrowError("array must have at least 2 elements");
    expect(() => Schema.encode(schema, { items: [] })).toThrowError("array must have at least 2 elements");
  });

  test("max - validates maximum array length", () => {
    const schema = createSchema("test", {
      items: array(string()).max(3),
    });

    const data = Schema.encode(schema, { items: ["a", "b", "c"] });
    expect(data).toStrictEqual({ items: ["a", "b", "c"] });

    const data2 = Schema.encode(schema, { items: ["a"] });
    expect(data2).toStrictEqual({ items: ["a"] });

    expect(() => Schema.encode(schema, { items: ["a", "b", "c", "d"] })).toThrowError(
      "array must have at most 3 elements",
    );
  });

  test("length - validates exact array length", () => {
    const schema = createSchema("test", {
      coordinates: array(number()).length(2),
    });

    const data = Schema.encode(schema, { coordinates: [10.5, 20.3] });
    expect(data).toStrictEqual({ coordinates: [10.5, 20.3] });

    expect(() => Schema.encode(schema, { coordinates: [10.5] })).toThrowError("array must have exactly 2 elements");
    expect(() => Schema.encode(schema, { coordinates: [10.5, 20.3, 30.1] })).toThrowError(
      "array must have exactly 2 elements",
    );
  });

  test("nonempty - validates array is not empty", () => {
    const schema = createSchema("test", {
      items: array(string()).nonempty(),
    });

    const data = Schema.encode(schema, { items: ["a"] });
    expect(data).toStrictEqual({ items: ["a"] });

    expect(() => Schema.encode(schema, { items: [] })).toThrowError("array must not be empty");
  });

  test("array methods can be chained", () => {
    const schema = createSchema("test", {
      items: array(string()).min(2).max(5),
    });

    const data = Schema.encode(schema, { items: ["a", "b", "c"] });
    expect(data).toStrictEqual({ items: ["a", "b", "c"] });

    expect(() => Schema.encode(schema, { items: ["a"] })).toThrowError("array must have at least 2 elements");
    expect(() => Schema.encode(schema, { items: ["a", "b", "c", "d", "e", "f"] })).toThrowError(
      "array must have at most 5 elements",
    );
  });

  test("array methods work with nullable and optional", () => {
    const schema = createSchema("test", {
      items: array(string()).min(1).nullable(),
      optionalItems: array(number()).max(3).optional(),
    });

    const data = Schema.encode(schema, { items: ["a"], optionalItems: [1, 2] });
    expect(data).toStrictEqual({ items: ["a"], optionalItems: [1, 2] });

    const nullData = Schema.encode(schema, { items: null });
    expect(nullData).toStrictEqual({ items: null });

    const undefinedData = Schema.encode(schema, { items: ["a"] });
    expect(undefinedData).toStrictEqual({ items: ["a"] });
  });
});
