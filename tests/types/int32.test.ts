import { Int32 } from "mongodb";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createDatabase, createSchema, Schema } from "../../src";
import { int32 } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("int32", () => {
  test("accepts Int32 value and returns Int32", () => {
    const schema = createSchema("test", { value: int32() });
    const data = Schema.input(schema, { value: new Int32(42) });
    expect(data.value).toBeInstanceOf(Int32);
    expect((data.value as Int32).value).toBe(42);
  });

  test("converts number to Int32", () => {
    const schema = createSchema("test", { value: int32() });
    const data = Schema.input(schema, { value: 123 });
    expect(data.value).toBeInstanceOf(Int32);
    expect((data.value as Int32).value).toBe(123);
  });

  test("rejects non-integer input types", () => {
    const schema = createSchema("test", { value: int32() });
    // @ts-expect-error
    expect(() => Schema.input(schema, { value: "123" })).toThrowError("expected 'Int32' or 'number' received 'string'");
    // @ts-expect-error
    expect(() => Schema.input(schema, { value: true })).toThrowError("expected 'Int32' or 'number' received 'boolean'");
  });

  test("works with nullable and optional", () => {
    const schema = createSchema("test", {
      nullable: int32().nullable(),
      optional: int32().optional(),
    });

    const nullData = Schema.input(schema, { nullable: null });
    expect(nullData).toStrictEqual({ nullable: null });

    const intData = Schema.input(schema, { nullable: new Int32(5) });
    expect(intData.nullable).toBeInstanceOf(Int32);
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

    const IntSchema = createSchema("bson_int32", {
      value: int32().optional(),
    });

    const { collections } = createDatabase(client.db(), { data: IntSchema });

    afterAll(async () => {
      await collections.data.deleteMany({});
    });

    test("accepts Int32 and insertOne returns Int32", async () => {
      const inserted = await collections.data.insertOne({ value: new Int32(100) });
      expect(inserted.value).toBeInstanceOf(Int32);
      expect((inserted.value as Int32).value).toBe(100);

      // MongoDB driver returns int32 as a plain number
      const retrieved = await collections.data.findOne({ _id: inserted._id });
      expect(retrieved!.value).toBe(100);
    });

    test("accepts number and insertOne returns Int32", async () => {
      const inserted = await collections.data.insertOne({ value: 42 });
      expect(inserted.value).toBeInstanceOf(Int32);

      // MongoDB driver returns int32 as a plain number
      const retrieved = await collections.data.findOne({ _id: inserted._id });
      expect(retrieved!.value).toBe(42);
    });
  });
});
