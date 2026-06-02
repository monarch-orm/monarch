import { Long } from "mongodb";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createDatabase, createSchema, defineSchemas, Schema } from "../../src";
import { long } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("long", () => {
  test("accepts Long value and returns Long", () => {
    const schema = createSchema("test", { value: long() });
    const testLong = Long.fromNumber(123456789);
    const data = Schema.input(schema, { value: testLong });
    expect(Long.isLong(data.value)).toBe(true);
    expect(Long.isLong(data.value) && data.value.toNumber()).toBe(123456789);
  });

  test("converts safe integer to Long", () => {
    const schema = createSchema("test", { value: long() });
    const data = Schema.input(schema, { value: 123456789 });
    expect(Long.isLong(data.value)).toBe(true);
    expect(Long.isLong(data.value) && data.value.toNumber()).toBe(123456789);
  });

  test("converts unsafe number to Long", () => {
    const schema = createSchema("test", { value: long() });
    const data = Schema.input(schema, { value: Number.MAX_SAFE_INTEGER + 1 });
    expect(Long.isLong(data.value)).toBe(true);
  });

  test("converts bigint to Long", () => {
    const schema = createSchema("test", { value: long() });
    const data = Schema.input(schema, { value: BigInt("9223372036854775807") });
    expect(Long.isLong(data.value)).toBe(true);
    expect(data.value.toString()).toBe("9223372036854775807");
  });

  test("rejects invalid values", () => {
    const schema = createSchema("test", { value: long() });
    // @ts-expect-error
    expect(() => Schema.input(schema, { value: "not a long" })).toThrow(
      "expected 'Long', 'number', or 'bigint' received 'string'",
    );
    // @ts-expect-error
    expect(() => Schema.input(schema, { value: {} })).toThrow(
      "expected 'Long', 'number', or 'bigint' received 'object'",
    );
  });

  test("works with nullable and optional", () => {
    const schema = createSchema("test", {
      nullableLong: long().nullable(),
      optionalLong: long().optional(),
    });

    const nullData = Schema.input(schema, { nullableLong: null });
    expect(nullData).toStrictEqual({ nullableLong: null });

    const data = Schema.input(schema, { nullableLong: Long.fromNumber(100) });
    expect(Long.isLong(data.nullableLong)).toBe(true);
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

    const BsonDataSchema = createSchema("bsonData", {
      longField: long().optional(),
    });

    const { collections } = createDatabase(client.db(), defineSchemas({ BsonDataSchema }));

    afterAll(async () => {
      await collections.bsonData.deleteMany({});
    });

    test("accepts Long and insertOne returns Long", async () => {
      const testLong = Long.fromString("9223372036854775807");
      const inserted = await collections.bsonData.insertOne({ longField: testLong });
      expect(Long.isLong(inserted.longField)).toBe(true);
      expect(inserted.longField!.toString()).toBe("9223372036854775807");

      const retrieved = await collections.bsonData.findOne({ _id: inserted._id });
      expect(Long.isLong(retrieved!.longField)).toBe(true);
      expect(retrieved!.longField!.toString()).toBe("9223372036854775807");
    });

    test("accepts number and insertOne returns Long", async () => {
      const inserted = await collections.bsonData.insertOne({ longField: 123456789 });
      expect(Long.isLong(inserted.longField)).toBe(true);
      expect((inserted.longField as Long).toNumber()).toBe(123456789);

      // MongoDB driver returns small int64 as a plain number
      const retrieved = await collections.bsonData.findOne({ _id: inserted._id });
      expect(retrieved!.longField).toBe(123456789);
    });

    test("accepts bigint and insertOne returns Long", async () => {
      const inserted = await collections.bsonData.insertOne({ longField: BigInt("9223372036854775807") });
      expect(Long.isLong(inserted.longField)).toBe(true);
      expect(inserted.longField!.toString()).toBe("9223372036854775807");

      const retrieved = await collections.bsonData.findOne({ _id: inserted._id });
      expect(Long.isLong(retrieved!.longField)).toBe(true);
      expect(retrieved!.longField!.toString()).toBe("9223372036854775807");
    });
  });
});
