import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { string } from "../../src/types";

describe("string", () => {
  test("lowercase and uppercase", () => {
    const schema = createSchema("test", {
      lower: string().lowercase(),
      upper: string().uppercase(),
    });
    const data = Schema.input(schema, { lower: "HELLO", upper: "hello" });
    expect(data).toStrictEqual({ lower: "hello", upper: "HELLO" });
  });

  test("length validations", () => {
    const schema = createSchema("test", {
      min: string().minLength(3),
      max: string().maxLength(5),
      exact: string().length(4),
    });

    expect(() => Schema.input(schema, { min: "ab", max: "test", exact: "test" })).toThrowError(
      "string must have a minimum length of 3",
    );
    expect(() => Schema.input(schema, { min: "test", max: "toolong", exact: "test" })).toThrowError(
      "string must have a maximum length of 5",
    );
    expect(() => Schema.input(schema, { min: "test", max: "test", exact: "toolong" })).toThrowError(
      "string must have a length of 4",
    );

    const data = Schema.input(schema, {
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

    expect(() => Schema.input(schema, { email: "invalid" })).toThrowError(
      "string must match pattern /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/",
    );

    const data = Schema.input(schema, { email: "test@example.com" });
    expect(data).toStrictEqual({ email: "test@example.com" });
  });

  test("trim", () => {
    const schema = createSchema("test", {
      trimmed: string().trim(),
    });

    const data = Schema.input(schema, { trimmed: "  hello  " });
    expect(data).toStrictEqual({ trimmed: "hello" });
  });

  test("nonempty", () => {
    const schema = createSchema("test", {
      required: string().nonempty(),
    });

    expect(() => Schema.input(schema, { required: "" })).toThrowError("string must not be empty");

    const data = Schema.input(schema, { required: "hello" });
    expect(data).toStrictEqual({ required: "hello" });
  });
});
