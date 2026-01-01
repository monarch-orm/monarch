import { Long } from "mongodb";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createDatabase, createSchema, Schema } from "../../src";
import { long } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("long()", () => {
  test("validates Long type", () => {
    const schema = createSchema("test", {
      value: long(),
    });

    const testLong = Long.fromNumber(123456789);
    const data = Schema.encode(schema, { value: testLong });
    expect(data).toStrictEqual({ value: testLong });
    expect(Long.isLong(data.value)).toBe(true);
  });

  test("keeps safe integers as numbers", () => {
    const schema = createSchema("test", {
      value: long(),
    });

    const data = Schema.encode(schema, { value: 123456789 });
    expect(typeof data.value).toBe("number");
    expect(data.value).toBe(123456789);
  });

  test("converts unsafe numbers to Long", () => {
    const schema = createSchema("test", {
      value: long(),
    });

    const unsafeNumber = Number.MAX_SAFE_INTEGER + 1;
    const data = Schema.encode(schema, { value: unsafeNumber });
    expect(Long.isLong(data.value)).toBe(true);
  });

  test("rejects invalid values", () => {
    const schema = createSchema("test", {
      value: long(),
    });

    // @ts-expect-error
    expect(() => Schema.encode(schema, { value: "not a long" })).toThrowError(
      "expected 'Long', 'number', or 'bigint' received 'string'",
    );
    // @ts-expect-error
    expect(() => Schema.encode(schema, { value: {} })).toThrowError(
      "expected 'Long', 'number', or 'bigint' received 'object'",
    );
  });

  test("works with nullable and optional", () => {
    const schema = createSchema("test", {
      nullableLong: long().nullable(),
      optionalLong: long().optional(),
    });

    const nullData = Schema.encode(schema, { nullableLong: null });
    expect(nullData).toStrictEqual({ nullableLong: null });

    const undefinedData = Schema.encode(schema, { nullableLong: Long.fromNumber(100) });
    expect((undefinedData.nullableLong as Long).toNumber()).toBe(100);
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

    const BsonDataSchema = createSchema("bson_data_long", {
      longField: long().optional(),
    });

    const { collections } = createDatabase(client.db(), {
      bsonData: BsonDataSchema,
    });

    afterAll(async () => {
      await collections.bsonData.deleteMany({});
    });

    test("accepts Long (large value) and returns Long", async () => {
      const testLong = Long.fromString("9223372036854775807");

      const inserted = await collections.bsonData
        .insertOne({
          longField: testLong,
        })
        ;

      expect(Long.isLong(inserted.longField)).toBe(true);
      expect((inserted.longField as Long).toString()).toBe("9223372036854775807");

      const retrieved = await collections.bsonData.findOne({ _id: inserted._id });
      expect(retrieved).not.toBeNull();
      expect(retrieved!.longField).toBeDefined();
      expect(Long.isLong(retrieved!.longField)).toBe(true);
      expect((retrieved!.longField as Long).toString()).toBe("9223372036854775807");
      expect(retrieved!.longField).toEqual(inserted.longField);
    });

    test("accepts number (safe integer) and returns number", async () => {
      const inserted = await collections.bsonData
        .insertOne({
          longField: 123456789,
        })
        ;

      expect(typeof inserted.longField).toBe("number");
      expect(inserted.longField).toBe(123456789);

      const retrieved = await collections.bsonData.findOne({ _id: inserted._id });
      expect(retrieved).not.toBeNull();
      expect(retrieved!.longField).toBeDefined();
      expect(typeof retrieved!.longField).toBe("number");
      expect(retrieved!.longField).toBe(123456789);
      expect(retrieved!.longField).toEqual(inserted.longField);
    });

    test("accepts bigint (outside safe range) and returns Long", async () => {
      const inserted = await collections.bsonData
        .insertOne({
          longField: BigInt("9223372036854775807"),
        })
        ;

      expect(Long.isLong(inserted.longField)).toBe(true);
      expect((inserted.longField as Long).toString()).toBe("9223372036854775807");

      const retrieved = await collections.bsonData.findOne({ _id: inserted._id });
      expect(retrieved).not.toBeNull();
      expect(retrieved!.longField).toBeDefined();
      expect(Long.isLong(retrieved!.longField)).toBe(true);
      expect((retrieved!.longField as Long).toString()).toBe("9223372036854775807");
      expect(retrieved!.longField).toEqual(inserted.longField);
    });
  });
});
