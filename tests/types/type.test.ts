import { describe, expect, it, test, vi } from "vitest";
import { Schema, createSchema } from "../../src";
import { MonarchParseError } from "../../src/errors";
import { pipe, type } from "../../src/types";

const simpleString = () => type((input: string) => input);
const simpleNumber = () => type((input: number) => input);

describe("type", () => {
  it("validates and transforms input", () => {
    const schema = createSchema("users", {
      age: simpleNumber()
        .validate((input) => input >= 0, "must be positive")
        .transform((input) => `${input}`),
    });

    expect(() => Schema.encode(schema, { age: -1 })).toThrowError("must be positive");

    const data = Schema.encode(schema, {
      age: 0,
    });
    expect(data).toStrictEqual({ age: "0" });
  });

  it("validate and transform order", () => {
    const schema = createSchema("test", {
      name: simpleString()
        .transform((input) => input.toUpperCase())
        .validate((input) => input.toUpperCase() === input, "String is not in all caps"),
    });
    expect(() => Schema.encode(schema, { name: "somename" })).not.toThrowError();
  });

  test("nullable", () => {
    // transform is skipped when value is null
    const schema1 = createSchema("users", {
      age: simpleNumber()
        .transform((input) => `${input}`)
        .nullable(),
    });
    const data1 = Schema.encode(schema1, { age: null });
    expect(data1).toStrictEqual({ age: null });

    // transform is applied when value is not null
    const schema2 = createSchema("users", {
      age: simpleNumber()
        .transform((input) => `${input}`)
        .nullable(),
    });
    const data2 = Schema.encode(schema2, { age: 0 });
    expect(data2).toStrictEqual({ age: "0" });
  });

  test("optional", () => {
    // transform is skipped when value is undefined
    const schema1 = createSchema("users", {
      age: simpleNumber()
        .transform((input) => `${input}`)
        .optional(),
    });
    const data1 = Schema.encode(schema1, {});
    expect(data1).toStrictEqual({});

    // transform is applied when value is not undefined
    const schema2 = createSchema("users", {
      age: simpleNumber()
        .transform((input) => `${input}`)
        .optional(),
    });
    const data2 = Schema.encode(schema2, { age: 0 });
    expect(data2).toStrictEqual({ age: "0" });
  });

  test("default", () => {
    // default value is used when value is ommited
    const defaultFnTrap1 = vi.fn(() => 11);
    const schema1 = createSchema("users", {
      age: simpleNumber()
        .transform((input) => `${input}`)
        .default(10),
      ageLazy: simpleNumber()
        .transform((input) => `${input}`)
        .default(defaultFnTrap1),
    });
    const data1 = Schema.encode(schema1, {});
    expect(data1).toStrictEqual({ age: "10", ageLazy: "11" });
    expect(defaultFnTrap1).toHaveBeenCalledTimes(1);

    // default value is ignored when value is not null or undefined
    const defaultFnTrap2 = vi.fn(() => 11);
    const schema2 = createSchema("users", {
      age: simpleNumber()
        .transform((input) => `${input}`)
        .default(10),
      ageLazy: simpleNumber()
        .transform((input) => `${input}`)
        .default(defaultFnTrap2),
    });
    const data2 = Schema.encode(schema2, { age: 1, ageLazy: 2 });
    expect(data2).toStrictEqual({ age: "1", ageLazy: "2" });
    expect(defaultFnTrap2).toHaveBeenCalledTimes(0);
  });

  describe("pipe", () => {
    test("pipes types in sequence", () => {
      const outerValidateFnTrap = vi.fn(() => true);
      const innerValidateFnTrap = vi.fn(() => true);

      const schema = createSchema("test", {
        count: pipe(
          simpleString()
            .validate(outerValidateFnTrap, "invalid string")
            .transform((input) => Number.parseInt(input)),
          simpleNumber()
            .validate(innerValidateFnTrap, "invalid number")
            .transform((num) => `count-${num * 1000}`),
        ),
      });

      const data = Schema.encode(schema, { count: "1" });
      expect(data).toStrictEqual({ count: "count-1000" });
      expect(outerValidateFnTrap).toHaveBeenCalledTimes(1);
      expect(innerValidateFnTrap).toHaveBeenCalledTimes(1);
    });

    test("pipe with default on pipe input", () => {
      const outerValidateFnTrap = vi.fn(() => true);
      const innerValidateFnTrap = vi.fn(() => true);

      const schema = createSchema("test", {
        count: pipe(
          simpleString()
            .validate(outerValidateFnTrap, "invalid string")
            .transform((input) => Number.parseInt(input))
            .default("2"),
          simpleNumber()
            .validate(innerValidateFnTrap, "invalid number")
            .transform((num) => `count-${num * 1000}`),
        ),
      });

      const data = Schema.encode(schema, {});
      expect(data).toStrictEqual({ count: "count-2000" });
      expect(outerValidateFnTrap).toHaveBeenCalledTimes(1);
      expect(innerValidateFnTrap).toHaveBeenCalledTimes(1);
    });

    test("pipe with default on pipe", () => {
      const outerValidateFnTrap = vi.fn(() => true);
      const innerValidateFnTrap = vi.fn(() => true);

      const schema = createSchema("test", {
        count: pipe(
          simpleString()
            .validate(outerValidateFnTrap, "invalid string")
            .transform((input) => Number.parseInt(input)),
          simpleNumber()
            .validate(innerValidateFnTrap, "invalid number")
            .transform((num) => `count-${num * 1000}`),
        ).default("3"),
      });

      const data = Schema.encode(schema, {});
      expect(data).toStrictEqual({ count: "count-3000" });
      expect(outerValidateFnTrap).toHaveBeenCalledTimes(1);
      expect(innerValidateFnTrap).toHaveBeenCalledTimes(1);
    });

    test("pipe with default on pipe output", () => {
      const outerValidateFnTrap = vi.fn(() => true);
      const innerValidateFnTrap = vi.fn(() => true);

      const schema = createSchema("test", {
        count: pipe(
          simpleString()
            .validate(outerValidateFnTrap, "invalid string")
            .transform((input) => Number.parseInt(input))
            .optional(),
          simpleNumber()
            .validate(innerValidateFnTrap, "invalid number")
            .transform((num) => `count-${num * 1000}`)
            .default(4),
        ),
      });

      const data = Schema.encode(schema, {});
      expect(data).toStrictEqual({ count: "count-4000" });
      expect(outerValidateFnTrap).toHaveBeenCalledTimes(0);
      expect(innerValidateFnTrap).toHaveBeenCalledTimes(1);
    });
  });

  describe("preprocess and parse", () => {
    test("preprocess runs before base parser", () => {
      const executionOrder: string[] = [];

      // Create a custom type with a base parser that tracks execution
      const baseType = type<string>((input) => {
        executionOrder.push("base-parser");
        return input;
      });

      // Add preprocess
      const extendedType = baseType.preprocess((input) => {
        executionOrder.push("preprocess");
        return input;
      });

      const schema = createSchema("test", { value: extendedType });
      Schema.encode(schema, { value: "test" });

      expect(executionOrder).toEqual(["preprocess", "base-parser"]);
    });

    test("parse runs after base parser", () => {
      const executionOrder: string[] = [];

      // Create a custom type with a base parser that tracks execution
      const baseType = type<string>((input) => {
        executionOrder.push("base-parser");
        return input;
      });

      // Add parse
      const extendedType = baseType.parse((input) => {
        executionOrder.push("parse");
        return input;
      });

      const schema = createSchema("test", { value: extendedType });
      Schema.encode(schema, { value: "test" });

      expect(executionOrder).toEqual(["base-parser", "parse"]);
    });

    test("execution order is preprocess -> base parser -> parse", () => {
      const executionOrder: string[] = [];

      // Create a custom type with a base parser that tracks execution
      const baseType = type<string>((input) => {
        executionOrder.push("base-parser");
        return input;
      });

      // Add both preprocess and parse
      const extendedType = baseType
        .preprocess((input) => {
          executionOrder.push("preprocess");
          return input;
        })
        .parse((input) => {
          executionOrder.push("parse");
          return input;
        });

      const schema = createSchema("test", { value: extendedType });
      Schema.encode(schema, { value: "test" });

      expect(executionOrder).toEqual(["preprocess", "base-parser", "parse"]);
    });

    test("preprocess can transform input before base parser", () => {
      const baseType = type<string>((input) => {
        if (input !== "PREPROCESSED") {
          throw new MonarchParseError("expected preprocessed input");
        }
        return input;
      });

      const extendedType = baseType.preprocess(() => "PREPROCESSED");

      const schema = createSchema("test", { value: extendedType });
      const data = Schema.encode(schema, { value: "anything" });

      expect(data).toStrictEqual({ value: "PREPROCESSED" });
    });

    test("parse can transform output after base parser", () => {
      const baseType = type<string>((input) => input.toUpperCase());

      const extendedType = baseType.parse((input) => input + "-PARSED");

      const schema = createSchema("test", { value: extendedType });
      const data = Schema.encode(schema, { value: "hello" });

      expect(data).toStrictEqual({ value: "HELLO-PARSED" });
    });

    test("preprocess and parse work together for complete transformation pipeline", () => {
      // Base type that converts string to uppercase
      const baseType = type<string>((input) => input.toUpperCase());

      const extendedType = baseType
        .preprocess((input) => {
          // Trim in preprocess
          return input.trim();
        })
        .parse((input) => {
          // Add prefix and suffix in parse
          return `[${input}]`;
        });

      const schema = createSchema("test", { value: extendedType });
      const data = Schema.encode(schema, { value: "  hello  " });

      expect(data).toStrictEqual({ value: "[HELLO]" });
    });

    test("real-world example: string validation with preprocess and parse", () => {
      const baseType = type<string>((input) => input);

      const trimmedAndValidatedString = baseType
        .preprocess((input) => input.trim())
        .parse((input) => {
          if (input.length === 0) {
            throw new MonarchParseError("string must not be empty after trimming");
          }
          return input;
        });

      const schema = createSchema("test", { value: trimmedAndValidatedString });

      // Should trim in preprocess, then validate in parse
      const data = Schema.encode(schema, { value: "  hello  " });
      expect(data).toStrictEqual({ value: "hello" });

      // Should fail validation after trimming
      expect(() => Schema.encode(schema, { value: "   " })).toThrowError("string must not be empty after trimming");
    });

    test("real-world example: number with range validation using parse", () => {
      const baseType = type<number>((input) => input);

      const percentageNumber = baseType.parse((input) => {
        if (input < 0 || input > 100) {
          throw new MonarchParseError("number must be between 0 and 100");
        }
        return input;
      });

      const schema = createSchema("test", { value: percentageNumber });

      const data = Schema.encode(schema, { value: 50 });
      expect(data).toStrictEqual({ value: 50 });

      expect(() => Schema.encode(schema, { value: 150 })).toThrowError("number must be between 0 and 100");
      expect(() => Schema.encode(schema, { value: -10 })).toThrowError("number must be between 0 and 100");
    });

    test("multiple methods chain correctly", () => {
      const executionOrder: string[] = [];

      const baseType = type<string>((input) => {
        executionOrder.push("base-parser");
        return input;
      });

      const firstExtend = baseType
        .preprocess((input) => {
          executionOrder.push("first-preprocess");
          return input;
        })
        .parse((input) => {
          executionOrder.push("first-parse");
          return input;
        });

      const secondExtend = firstExtend
        .preprocess((input) => {
          executionOrder.push("second-preprocess");
          return input;
        })
        .parse((input) => {
          executionOrder.push("second-parse");
          return input;
        });

      const schema = createSchema("test", { value: secondExtend });
      Schema.encode(schema, { value: "test" });

      // Second extend's preprocess -> first extend's full pipeline -> second extend's parse
      expect(executionOrder).toEqual([
        "second-preprocess",
        "first-preprocess",
        "base-parser",
        "first-parse",
        "second-parse",
      ]);
    });
  });
});
