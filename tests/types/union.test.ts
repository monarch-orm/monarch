import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { number, object, string, taggedUnion, tuple, union } from "../../src/types";

describe("Union Types", () => {
  describe("union", () => {
    test("union", () => {
      const schema = createSchema("milf", {
        emailOrPhone: union(string(), number()),
      });

      // @ts-expect-error
      expect(() => Schema.input(schema, { emailOrPhone: {} })).toThrowError("no matching variant found for union type");
      // @ts-expect-error
      expect(() => Schema.input(schema, { emailOrPhone: [] })).toThrowError("no matching variant found for union type");
      // @ts-expect-error
      expect(() => Schema.input(schema, { emailOrPhone: null })).toThrowError(
        "no matching variant found for union type",
      );

      const data1 = Schema.input(schema, { emailOrPhone: "test" });
      expect(data1).toStrictEqual({ emailOrPhone: "test" });

      const data2 = Schema.input(schema, { emailOrPhone: 42 });
      expect(data2).toStrictEqual({ emailOrPhone: 42 });
    });
  });

  describe("taggedUnion", () => {
    test("taggedUnion", () => {
      const schema = createSchema("test", {
        color: taggedUnion({
          rgba: object({ r: number(), g: number(), b: number(), a: string() }),
          hex: string(),
          hsl: tuple([string(), string(), string()]),
        }),
      });

      // @ts-expect-error
      expect(() => Schema.input(schema, {})).toThrowError("expected 'object' received 'undefined'");
      // @ts-expect-error
      expect(() => Schema.input(schema, { color: {} })).toThrowError("missing field");
      // @ts-expect-error
      expect(() => Schema.input(schema, { color: { tag: "hex" } })).toThrowError(
        "missing field 'value' in tagged union",
      );
      expect(() =>
        // @ts-expect-error
        Schema.input(schema, { color: { value: "#fff" } }),
      ).toThrowError("missing field 'tag' in tagged union");
      expect(() =>
        Schema.input(schema, {
          // @ts-expect-error
          color: { tag: "hex", value: "#fff", extra: "user" },
        }),
      ).toThrowError("unknown field 'extra', tagged union may only specify 'tag' and 'value' fields");
      expect(() =>
        // @ts-expect-error
        Schema.input(schema, { color: { tag: "hwb", value: "#fff" } }),
      ).toThrowError("unknown tag 'hwb'");
      expect(() =>
        // @ts-expect-error
        Schema.input(schema, { color: { tag: "hsl", value: "#fff" } }),
      ).toThrowError("invalid value for tag 'hsl'");
      const data1 = Schema.input(schema, {
        color: { tag: "rgba", value: { r: 0, g: 0, b: 0, a: "100%" } },
      });
      expect(data1).toStrictEqual({
        color: { tag: "rgba", value: { r: 0, g: 0, b: 0, a: "100%" } },
      });
      const data2 = Schema.input(schema, {
        color: { tag: "hex", value: "#fff" },
      });
      expect(data2).toStrictEqual({
        color: { tag: "hex", value: "#fff" },
      });
      const data3 = Schema.input(schema, {
        color: { tag: "hsl", value: ["0", "0", "0"] },
      });
      expect(data3).toStrictEqual({
        color: { tag: "hsl", value: ["0", "0", "0"] },
      });
    });
  });
});
