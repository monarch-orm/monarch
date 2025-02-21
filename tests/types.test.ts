import { describe, expect, it, test, vi } from "vitest";
import { createSchema, Schema } from "../src";
import {
  array,
  boolean,
  literal,
  mixed,
  number,
  object,
  pipe,
  record,
  string,
  taggedUnion,
  tuple,
  type,
  union,
} from "../src/types";

const numberString = () => type<number, `${number}`>((input) => `${input}`);

describe("Types", () => {
  it("validates and transforms input", () => {
    const schema = createSchema("users", {
      name: string(),
      upperName: string().transform((input) => input.toUpperCase()),
      age: numberString(),
    });
    const data = Schema.toData(schema, {
      name: "tom",
      upperName: "tom",
      age: 0,
    });
    expect(data).toStrictEqual({ name: "tom", upperName: "TOM", age: "0" });
  });

  it("validate and transform order", () => {
    const schema = createSchema("test", {
      name: string()
        .uppercase() // should have made everything uppercase
        .validate(
          (input) => input.toUpperCase() === input,
          "String is not in all caps",
        ),
    });
    expect(() =>
      Schema.toData(schema, { name: "somename" }),
    ).not.toThrowError();
  });

  test("nullable", () => {
    // transform is skipped when value is null
    const schema1 = createSchema("users", {
      age: numberString().nullable(),
    });
    const data1 = Schema.toData(schema1, { age: null });
    expect(data1).toStrictEqual({ age: null });

    // transform is applied when value is not null
    const schema2 = createSchema("users", {
      age: numberString().nullable(),
    });
    const data2 = Schema.toData(schema2, { age: 0 });
    expect(data2).toStrictEqual({ age: "0" });
  });

  test("optional", () => {
    // transform is skipped when value is undefined
    const schema1 = createSchema("users", {
      age: numberString().optional(),
    });
    const data1 = Schema.toData(schema1, {});
    expect(data1).toStrictEqual({});

    // transform is applied when value is not undefined
    const schema2 = createSchema("users", {
      age: numberString().optional(),
    });
    const data2 = Schema.toData(schema2, { age: 0 });
    expect(data2).toStrictEqual({ age: "0" });
  });

  test("default", () => {
    // default value is used when value is ommited
    const defaultFnTrap1 = vi.fn(() => 11);
    const schema1 = createSchema("users", {
      age: numberString().default(10),
      ageLazy: numberString().default(defaultFnTrap1),
    });
    const data1 = Schema.toData(schema1, {});
    expect(data1).toStrictEqual({ age: "10", ageLazy: "11" });
    expect(defaultFnTrap1).toHaveBeenCalledTimes(1);

    // default value is ignored when value is not null or undefined
    const defaultFnTrap2 = vi.fn(() => 11);
    const schema2 = createSchema("users", {
      age: numberString().default(10),
      ageLazy: numberString().default(defaultFnTrap2),
    });
    const data2 = Schema.toData(schema2, { age: 1, ageLazy: 2 });
    expect(data2).toStrictEqual({ age: "1", ageLazy: "2" });
    expect(defaultFnTrap2).toHaveBeenCalledTimes(0);
  });

  test("pipe", () => {
    const outerValidateFnTrap = vi.fn(() => true);
    const innerValidateFnTrap = vi.fn(() => true);

    const schema1 = createSchema("test", {
      count: pipe(
        string()
          .validate(outerValidateFnTrap, "invalid count string")
          .transform(Number.parseInt),
        number()
          .validate(innerValidateFnTrap, "invalid count number")
          .transform((num) => num * 1000)
          .transform((str) => `count-${str}`),
      ),
    });
    const data1 = Schema.toData(schema1, { count: "1" });
    expect(data1).toStrictEqual({ count: "count-1000" });
    expect(outerValidateFnTrap).toHaveBeenCalledTimes(1);
    expect(innerValidateFnTrap).toHaveBeenCalledTimes(1);
    outerValidateFnTrap.mockClear();
    innerValidateFnTrap.mockClear();

    // pipe in default
    const schema2 = createSchema("test", {
      count: pipe(
        string()
          .validate(outerValidateFnTrap, "invalid count string")
          .transform(Number.parseInt)
          .default("2"),
        number()
          .validate(innerValidateFnTrap, "invalid count number")
          .transform((num) => num * 1000)
          .transform((str) => `count-${str}`),
      ),
    });
    const data2 = Schema.toData(schema2, {});
    expect(data2).toStrictEqual({ count: "count-2000" });
    expect(outerValidateFnTrap).toHaveBeenCalledTimes(1);
    expect(innerValidateFnTrap).toHaveBeenCalledTimes(1);
    outerValidateFnTrap.mockClear();
    innerValidateFnTrap.mockClear();

    // pipe default
    const schema3 = createSchema("test", {
      count: pipe(
        string()
          .validate(outerValidateFnTrap, "invalid count string")
          .transform(Number.parseInt),
        number()
          .validate(innerValidateFnTrap, "invalid count number")
          .transform((num) => num * 1000)
          .transform((str) => `count-${str}`),
      ).default("3"),
    });
    const data3 = Schema.toData(schema3, {});
    expect(data3).toStrictEqual({ count: "count-3000" });
    expect(outerValidateFnTrap).toHaveBeenCalledTimes(1);
    expect(innerValidateFnTrap).toHaveBeenCalledTimes(1);
    outerValidateFnTrap.mockClear();
    innerValidateFnTrap.mockClear();

    // pipe out default
    const schema4 = createSchema("test", {
      count: pipe(
        string()
          .validate(outerValidateFnTrap, "invalid count string")
          .transform(Number.parseInt)
          .optional(),
        number()
          .validate(innerValidateFnTrap, "invalid count number")
          .transform((num) => num * 1000)
          .transform((str) => `count-${str}`)
          .default(4),
      ),
    });
    const data4 = Schema.toData(schema4, {});
    expect(data4).toStrictEqual({ count: "count-4000" });
    expect(outerValidateFnTrap).toHaveBeenCalledTimes(0);
    expect(innerValidateFnTrap).toHaveBeenCalledTimes(1);
    outerValidateFnTrap.mockClear();
    innerValidateFnTrap.mockClear();
  });

  test("object", () => {
    const schema = createSchema("test", {
      permissions: object({
        canUpdate: boolean(),
        canDelete: boolean().default(false),
        role: literal("admin", "moderator", "customer"),
      }),
    });

    // @ts-expect-error
    expect(() => Schema.toData(schema, {})).toThrowError(
      "expected 'object' received 'undefined'",
    );
    expect(() =>
      // @ts-expect-error
      Schema.toData(schema, { permissions: { canUpdate: "yes" } }),
    ).toThrowError("field 'canUpdate' expected 'boolean' received 'string'");
    // fields are validates in the order they are registered in type
    expect(() =>
      // @ts-expect-error
      Schema.toData(schema, { permissions: { role: false } }),
    ).toThrowError("field 'canUpdate' expected 'boolean' received 'undefined'");
    // unknwon fields are rejected
    expect(() =>
      Schema.toData(schema, {
        // @ts-expect-error
        permissions: { canUpdate: true, role: "admin", canCreate: true },
      }),
    ).toThrowError(
      "unknown field 'canCreate', object may only specify known fields",
    );
    const data = Schema.toData(schema, {
      permissions: { canUpdate: true, role: "moderator" },
    });
    expect(data).toStrictEqual({
      permissions: { canUpdate: true, canDelete: false, role: "moderator" },
    });
  });

  test("record", () => {
    const schema = createSchema("test", {
      grades: record(number()),
    });

    // @ts-expect-error
    expect(() => Schema.toData(schema, {})).toThrowError(
      "expected 'object' received 'undefined'",
    );
    // empty object is ok
    expect(() => Schema.toData(schema, { grades: {} })).not.toThrowError();
    expect(() =>
      // @ts-expect-error
      Schema.toData(schema, { grades: { math: "50" } }),
    ).toThrowError("field 'math' expected 'number' received 'string'");
    const data = Schema.toData(schema, { grades: { math: 50 } });
    expect(data).toStrictEqual({ grades: { math: 50 } });
  });

  test("tuple", () => {
    const schema = createSchema("test", {
      items: tuple([number(), string()]),
    });

    // @ts-expect-error
    expect(() => Schema.toData(schema, {})).toThrowError(
      "expected 'array' received 'undefined'",
    );
    // @ts-expect-error
    expect(() => Schema.toData(schema, { items: [] })).toThrowError(
      "element at index '0' expected 'number' received 'undefined'",
    );
    const data = Schema.toData(schema, { items: [0, "1"] });
    expect(data).toStrictEqual({ items: [0, "1"] });
    // @ts-expect-error
    expect(() => Schema.toData(schema, { items: [1, "1", 2] })).toThrowError(
      "expected array with 2 elements received 3 elements",
    );
  });

  test("array", () => {
    const schema = createSchema("test", {
      items: array(number()),
    });

    // @ts-expect-error
    expect(() => Schema.toData(schema, {})).toThrowError(
      "expected 'array' received 'undefined'",
    );
    // empty array is ok
    expect(() => Schema.toData(schema, { items: [] })).not.toThrowError();
    // @ts-expect-error
    expect(() => Schema.toData(schema, { items: [0, "1"] })).toThrowError(
      "element at index '1' expected 'number' received 'string'",
    );
    const data = Schema.toData(schema, { items: [0, 1] });
    expect(data).toStrictEqual({ items: [0, 1] });
  });

  test("literal", () => {
    const schema = createSchema("test", {
      role: literal("admin", "moderator"),
    });

    // @ts-expect-error
    expect(() => Schema.toData(schema, {})).toThrowError(
      "unknown value 'undefined', literal may only specify known values",
    );
    // @ts-expect-error
    expect(() => Schema.toData(schema, { role: "user" })).toThrowError(
      "unknown value 'user', literal may only specify known values",
    );
    const data = Schema.toData(schema, { role: "admin" });
    expect(data).toStrictEqual({ role: "admin" });
  });

  test("taggedUnion", () => {
    const schema = createSchema("test", {
      color: taggedUnion({
        rgba: object({ r: number(), g: number(), b: number(), a: string() }),
        hex: string(),
        hsl: tuple([string(), string(), string()]).transform(
          ([f, s, t]) => f + s + t,
        ),
      }),
    });

    // @ts-expect-error
    expect(() => Schema.toData(schema, {})).toThrowError(
      "expected 'object' received 'undefined'",
    );
    // @ts-expect-error
    expect(() => Schema.toData(schema, { color: {} })).toThrowError(
      "missing field",
    );
    // @ts-expect-error
    expect(() => Schema.toData(schema, { color: { tag: "hex" } })).toThrowError(
      "missing field 'value' in tagged union",
    );
    expect(() =>
      // @ts-expect-error
      Schema.toData(schema, { color: { value: "#fff" } }),
    ).toThrowError("missing field 'tag' in tagged union");
    expect(() =>
      Schema.toData(schema, {
        // @ts-expect-error
        color: { tag: "hex", value: "#fff", extra: "user" },
      }),
    ).toThrowError(
      "unknown field 'extra', tagged union may only specify 'tag' and 'value' fields",
    );
    expect(() =>
      // @ts-expect-error
      Schema.toData(schema, { color: { tag: "hwb", value: "#fff" } }),
    ).toThrowError("unknown tag 'hwb'");
    expect(() =>
      // @ts-expect-error
      Schema.toData(schema, { color: { tag: "hsl", value: "#fff" } }),
    ).toThrowError("invalid value for tag 'hsl'");
    const data1 = Schema.toData(schema, {
      color: { tag: "rgba", value: { r: 0, g: 0, b: 0, a: "100%" } },
    });
    expect(data1).toStrictEqual({
      color: { tag: "rgba", value: { r: 0, g: 0, b: 0, a: "100%" } },
    });
    const data2 = Schema.toData(schema, {
      color: { tag: "hex", value: "#fff" },
    });
    expect(data2).toStrictEqual({
      color: { tag: "hex", value: "#fff" },
    });
    const data3 = Schema.toData(schema, {
      color: { tag: "hsl", value: ["0", "0", "0"] },
    });
    expect(data3).toStrictEqual({
      color: { tag: "hsl", value: "000" },
    });
  });

  test("union", () => {
    const schema = createSchema("milf", {
      emailOrPhone: union(string(), number()),
    });

    // @ts-expect-error
    expect(() => Schema.toData(schema, { emailOrPhone: {} })).toThrowError(
      "no matching variant found for union type",
    );
    // @ts-expect-error
    expect(() => Schema.toData(schema, { emailOrPhone: [] })).toThrowError(
      "no matching variant found for union type",
    );
    // @ts-expect-error
    expect(() => Schema.toData(schema, { emailOrPhone: null })).toThrowError(
      "no matching variant found for union type",
    );

    const data1 = Schema.toData(schema, { emailOrPhone: "test" });
    expect(data1).toStrictEqual({ emailOrPhone: "test" });

    const data2 = Schema.toData(schema, { emailOrPhone: 42 });
    expect(data2).toStrictEqual({ emailOrPhone: 42 });
  });
});

test("mixed", () => {
  const schema = createSchema("test", {
    anything: mixed(),
  });

  const data1 = Schema.toData(schema, { anything: "string" });
  expect(data1).toStrictEqual({ anything: "string" });

  const data2 = Schema.toData(schema, { anything: 42 });
  expect(data2).toStrictEqual({ anything: 42 });

  const data3 = Schema.toData(schema, { anything: true });
  expect(data3).toStrictEqual({ anything: true });

  const data4 = Schema.toData(schema, { anything: { nested: "object" } });
  expect(data4).toStrictEqual({ anything: { nested: "object" } });

  const data5 = Schema.toData(schema, { anything: [1, "2", false] });
  expect(data5).toStrictEqual({ anything: [1, "2", false] });

  const data6 = Schema.toData(schema, { anything: null });
  expect(data6).toStrictEqual({ anything: null });
});
