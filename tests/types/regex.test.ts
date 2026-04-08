import { BSONRegExp } from "mongodb";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createDatabase, createSchema, defineSchemas, Schema } from "../../src";
import { regex } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("regex", () => {
  test("accepts BSONRegExp value and returns RegExp", () => {
    const schema = createSchema("test", { value: regex() });
    const data = Schema.input(schema, { value: new BSONRegExp("^hello", "i") });
    expect(data.value).toBeInstanceOf(RegExp);
    expect(data.value.source).toBe("^hello");
    expect(data.value.flags).toContain("i");
  });

  test("accepts RegExp value and returns RegExp", () => {
    const schema = createSchema("test", { value: regex() });
    const data = Schema.input(schema, { value: /^hello/i });
    expect(data.value).toBeInstanceOf(RegExp);
    expect(data.value.source).toBe("^hello");
    expect(data.value.flags).toContain("i");
  });

  test("preserves regex flags", () => {
    const schema = createSchema("test", { value: regex() });
    // BSON supports i, m, s, x flags (not g or u)
    const data = Schema.input(schema, { value: /test/im });
    expect(data.value).toBeInstanceOf(RegExp);
    expect(data.value.source).toBe("test");
    expect(data.value.flags).toContain("i");
    expect(data.value.flags).toContain("m");
  });

  test("rejects unsupported BSON flags", () => {
    const schema = createSchema("test", { value: regex() });
    expect(() => Schema.input(schema, { value: /test/g })).toThrow();
  });

  test("rejects non-regex input types", () => {
    const schema = createSchema("test", { value: regex() });
    // @ts-expect-error
    expect(() => Schema.input(schema, { value: "pattern" })).toThrow(
      "expected 'BSONRegExp' or 'RegExp' received 'string'",
    );
    // @ts-expect-error
    expect(() => Schema.input(schema, { value: 123 })).toThrow("expected 'BSONRegExp' or 'RegExp' received 'number'");
  });

  test("works with nullable and optional", () => {
    const schema = createSchema("test", {
      nullable: regex().nullable(),
      optional: regex().optional(),
    });

    const nullData = Schema.input(schema, { nullable: null });
    expect(nullData).toStrictEqual({ nullable: null });

    const data = Schema.input(schema, { nullable: /hello/ });
    expect(data.nullable).toBeInstanceOf(RegExp);
  });

  describe("Database Integration", async () => {
    const { server, client } = await createMockDatabase();

    beforeAll(async () => {
      await client.connect();
    });

    afterAll(async () => {
      await client.close();
      await server.stop();
    });

    const RegexSchema = createSchema("data", {
      pattern: regex().optional(),
    });

    const { collections } = createDatabase(client.db(), defineSchemas({ RegexSchema }));

    afterAll(async () => {
      await collections.data.deleteMany({});
    });

    test("accepts BSONRegExp and returns RegExp", async () => {
      const inserted = await collections.data.insertOne({ pattern: new BSONRegExp("^hello", "i") });
      expect(inserted.pattern).toBeInstanceOf(RegExp);
      expect(inserted.pattern!.source).toBe("^hello");
      expect(inserted.pattern!.flags).toContain("i");

      const retrieved = await collections.data.findOne({ _id: inserted._id });
      expect(retrieved!.pattern).toBeInstanceOf(RegExp);
      expect(retrieved!.pattern!.source).toBe("^hello");
      expect(retrieved!.pattern!.flags).toContain("i");
    });

    test("accepts RegExp and returns RegExp", async () => {
      const inserted = await collections.data.insertOne({ pattern: /^world/m });
      expect(inserted.pattern).toBeInstanceOf(RegExp);
      expect(inserted.pattern!.source).toBe("^world");
      expect(inserted.pattern!.flags).toContain("m");

      const retrieved = await collections.data.findOne({ _id: inserted._id });
      expect(retrieved!.pattern).toBeInstanceOf(RegExp);
      expect(retrieved!.pattern!.source).toBe("^world");
      expect(retrieved!.pattern!.flags).toContain("m");
    });
  });
});
