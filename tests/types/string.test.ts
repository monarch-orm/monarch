import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { string } from "../../src/types";

describe("string", () => {
  test("lowercase and uppercase", () => {
    const schema = createSchema("test", {
      lower: string().lowercase(),
      upper: string().uppercase(),
    });
    const data = Schema.encode(schema, { lower: "HELLO", upper: "hello" });
    expect(data).toStrictEqual({ lower: "hello", upper: "HELLO" });
  });

  test("length validations", () => {
    const schema = createSchema("test", {
      min: string().minLength(3),
      max: string().maxLength(5),
      exact: string().length(4),
    });

    expect(() => Schema.encode(schema, { min: "ab", max: "test", exact: "test" })).toThrowError(
      "string must be at least 3 characters long",
    );
    expect(() => Schema.encode(schema, { min: "test", max: "toolong", exact: "test" })).toThrowError(
      "string must be at most 5 characters long",
    );
    expect(() => Schema.encode(schema, { min: "test", max: "test", exact: "toolong" })).toThrowError(
      "string must be exactly 4 characters long",
    );

    const data = Schema.encode(schema, {
      min: "abc",
      max: "test",
      exact: "test",
    });
    expect(data).toStrictEqual({ min: "abc", max: "test", exact: "test" });
  });

  test("pattern", () => {
    const schema = createSchema("test", {
      email: string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    });

    expect(() => Schema.encode(schema, { email: "invalid" })).toThrowError(
      "string must match pattern /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/",
    );

    const data = Schema.encode(schema, { email: "test@example.com" });
    expect(data).toStrictEqual({ email: "test@example.com" });
  });

  test("trim", () => {
    const schema = createSchema("test", {
      trimmed: string().trim(),
    });

    const data = Schema.encode(schema, { trimmed: "  hello  " });
    expect(data).toStrictEqual({ trimmed: "hello" });
  });

  test("nonempty", () => {
    const schema = createSchema("test", {
      required: string().nonempty(),
    });

    expect(() => Schema.encode(schema, { required: "" })).toThrowError("string must not be empty");

    const data = Schema.encode(schema, { required: "hello" });
    expect(data).toStrictEqual({ required: "hello" });
  });

  test("includes", () => {
    const schema = createSchema("test", {
      contains: string().includes("world"),
    });

    expect(() => Schema.encode(schema, { contains: "hello" })).toThrowError('string must include "world"');

    const data = Schema.encode(schema, { contains: "hello world" });
    expect(data).toStrictEqual({ contains: "hello world" });
  });
});
