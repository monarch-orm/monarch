import { describe, expect, it, test, vi } from "vitest";
import { Schema, createSchema } from "../../src";
import { number, string } from "../../src/types";

describe("type", () => {
  it("validates input", () => {
    const schema = createSchema("users", {
      age: number().validate((input) => input >= 0, "must be positive"),
    });

    expect(() => Schema.input(schema, { age: -1 })).toThrow("must be positive");

    const data = Schema.input(schema, {
      age: 0,
    });
    expect(data).toStrictEqual({ age: 0 });
  });

  test("nullable", () => {
    const schema = createSchema("users", {
      age: number()
        .validate((input) => input >= 0, "must be positive")
        .nullable(),
    });

    // validate is skipped when value is null
    const data = Schema.input(schema, { age: null });
    expect(data).toStrictEqual({ age: null });

    expect(() => Schema.input(schema, { age: -1 })).toThrow("must be positive");
  });

  test("optional", () => {
    const schema = createSchema("users", {
      age: number()
        .validate((input) => input >= 0, "must be positive")
        .optional(),
    });

    // validate is skipped when value is undefined
    const data1 = Schema.input(schema, {});
    expect(data1).toStrictEqual({});

    expect(() => Schema.input(schema, { age: -1 })).toThrow("must be positive");
  });

  test("default", () => {
    const defaultFnTrap = vi.fn(() => 11);
    const schema = createSchema("users", {
      age: number()
        .validate((input) => input >= 0, "must be positive")
        .default(10),
      ageLazy: number()
        .validate((input) => input >= 0, "must be positive")
        .default(defaultFnTrap),
    });

    // default value is used when value is ommited
    const data1 = Schema.input(schema, {});
    expect(data1).toStrictEqual({ age: 10, ageLazy: 11 });
    expect(defaultFnTrap).toHaveBeenCalledTimes(1);
    defaultFnTrap.mockClear();

    // default value is ignored when value is not ommited
    const data2 = Schema.input(schema, { age: 1, ageLazy: 2 });
    expect(data2).toStrictEqual({ age: 1, ageLazy: 2 });
    expect(defaultFnTrap).toHaveBeenCalledTimes(0);

    const schema2 = createSchema("users", {
      age: number()
        .default(-1)
        .validate((input) => input >= 0, "must be positive"),
    });

    // default value is validated when applied before
    expect(() => Schema.input(schema2, { age: -1 })).toThrow("must be positive");

    const schema3 = createSchema("users", {
      age: number()
        .validate((input) => input >= 0, "must be positive")
        .default(-1),
    });

    // default value is validated when applied before
    expect(() => Schema.input(schema3, { age: -1 })).toThrow("must be positive");
  });

  describe("preprocess and parse", () => {
    test("preprocess runs before base parser", () => {
      const executionOrder: string[] = [];

      // Create a custom type with a base parser that tracks execution
      const baseType = string();

      const extendedType1 = baseType.preprocess((input) => {
        executionOrder.push("1");
        return input;
      });

      const extendedType2 = extendedType1.preprocess((input) => {
        executionOrder.push("2");
        return input;
      });

      const schema = createSchema("test", { value: extendedType2 });
      Schema.input(schema, { value: "test" });

      expect(executionOrder).toEqual(["2", "1"]);
    });

    test("parse runs after base parser", () => {
      const executionOrder: string[] = [];

      // Create a custom type with a base parser that tracks execution
      const baseType = string();

      const extendedType1 = baseType.parse((input) => {
        executionOrder.push("1");
        return input;
      });

      const extendedType2 = extendedType1.parse((input) => {
        executionOrder.push("2");
        return input;
      });

      const schema = createSchema("test", { value: extendedType2 });
      Schema.input(schema, { value: "test" });

      expect(executionOrder).toEqual(["1", "2"]);
    });

    test("execution order is preprocess -> base parser -> parse", () => {
      const executionOrder: string[] = [];

      // Create a custom type with a base parser that tracks execution
      const baseType = string();

      // Add both preprocess and parse
      const extendedType = baseType
        .preprocess((input) => {
          executionOrder.push("preprocess1");
          return input;
        })
        .parse((input) => {
          executionOrder.push("parse1");
          return input;
        })
        .preprocess((input) => {
          executionOrder.push("preprocess2");
          return input;
        })
        .parse((input) => {
          executionOrder.push("parse2");
          return input;
        });

      const schema = createSchema("test", { value: extendedType });
      Schema.input(schema, { value: "test" });

      expect(executionOrder).toEqual(["preprocess2", "preprocess1", "parse1", "parse2"]);
    });

    test("preprocess can transform input before base parser", () => {
      const baseType = string().validate((input) => input === "PREPROCESSED", "expected preprocessed input");

      const extendedType = baseType.preprocess(() => "PREPROCESSED");

      const schema = createSchema("test", { value: extendedType });
      const data = Schema.input(schema, { value: "anything" });

      expect(data).toStrictEqual({ value: "PREPROCESSED" });

      const schema2 = createSchema("test", { value: baseType });
      expect(() => Schema.input(schema2, { value: "anything" })).toThrow("expected preprocessed input");
    });

    test("parse can transform output after base parser", () => {
      const baseType = string();

      const extendedType = baseType.parse((input) => input.toUpperCase());

      const schema = createSchema("test", { value: extendedType });
      const data = Schema.input(schema, { value: "hello" });

      expect(data).toStrictEqual({ value: "HELLO" });
    });

    test("preprocess and parse work together for complete transformation pipeline", () => {
      // Base type that converts string to uppercase
      const baseType = string().validate((input) => !input.includes(" "), "no empty space allowed");

      const extendedType = baseType
        .preprocess((input) => {
          // Trim in preprocess
          return input.trim();
        })
        .parse((input) => {
          // Convert to uppercase
          return input.toUpperCase();
        });

      const schema = createSchema("test", { value: extendedType });
      const data = Schema.input(schema, { value: "  hello  " });

      expect(data).toStrictEqual({ value: "HELLO" });

      const schema2 = createSchema("test", { value: baseType });
      expect(() => Schema.input(schema2, { value: "  hello  " })).toThrow("no empty space allowed");
    });
  });
});
