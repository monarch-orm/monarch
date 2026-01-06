import { describe, expect, test } from "vitest";
import { Schema, createSchema } from "../../src";
import { array, boolean, literal, number, object, string } from "../../src/types";

describe("object", () => {
  test("object", () => {
    const schema = createSchema("test", {
      permissions: object({
        canUpdate: boolean(),
        canDelete: boolean().default(false),
        role: literal("admin", "moderator", "customer"),
      }),
    });

    // @ts-expect-error
    expect(() => Schema.encode(schema, {})).toThrowError("expected 'object' received 'undefined'");
    expect(() =>
      // @ts-expect-error
      Schema.encode(schema, { permissions: { canUpdate: "yes" } }),
    ).toThrowError("permissions.canUpdate: expected 'boolean' received 'string'");
    // fields are validates in the order they are registered in type
    expect(() =>
      // @ts-expect-error
      Schema.encode(schema, { permissions: { role: false } }),
    ).toThrowError("permissions.canUpdate: expected 'boolean' received 'undefined'");
    // unknwon fields are rejected
    expect(() =>
      Schema.encode(schema, {
        // @ts-expect-error
        permissions: { canUpdate: true, role: "admin", canCreate: true },
      }),
    ).toThrowError("unknown field 'canCreate', object may only specify known fields");
    const data = Schema.encode(schema, {
      permissions: { canUpdate: true, role: "moderator" },
    });
    expect(data).toStrictEqual({
      permissions: { canUpdate: true, canDelete: false, role: "moderator" },
    });
  });

  test("nested object", () => {
    const schema = createSchema("test", {
      user: object({
        name: string(),
        profile: object({
          age: number(),
          tags: array(string()),
        }),
      }),
    });

    // nested object field error
    expect(() =>
      Schema.encode(schema, {
        // @ts-expect-error
        user: { name: "John", profile: { age: "thirty", tags: [] } },
      }),
    ).toThrowError("user.profile.age: expected 'number' received 'string'");

    // nested array element error
    expect(() =>
      Schema.encode(schema, {
        // @ts-expect-error
        user: { name: "John", profile: { age: 30, tags: ["valid", 123] } },
      }),
    ).toThrowError("user.profile.tags[1]: expected 'string' received 'number'");

    // valid data
    const data = Schema.encode(schema, {
      user: { name: "John", profile: { age: 30, tags: ["developer", "typescript"] } },
    });
    expect(data).toStrictEqual({
      user: { name: "John", profile: { age: 30, tags: ["developer", "typescript"] } },
    });
  });
});
