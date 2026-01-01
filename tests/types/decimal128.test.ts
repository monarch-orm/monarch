import { Decimal128 } from "mongodb";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createDatabase, createSchema, Schema } from "../../src";
import { decimal128 } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("decimal128()", () => {
  test("validates Decimal128 type", () => {
    const schema = createSchema("test", {
      value: decimal128(),
    });

    const testDecimal = Decimal128.fromString("123.456");
    const data = Schema.encode(schema, { value: testDecimal });
    expect(data).toStrictEqual({ value: testDecimal });
    expect(data.value).toBeInstanceOf(Decimal128);
  });

  test("converts string to Decimal128", () => {
    const schema = createSchema("test", {
      value: decimal128(),
    });

    const data = Schema.encode(schema, { value: "123.456" });
    expect(data.value).toBeInstanceOf(Decimal128);
    expect(data.value.toString()).toBe("123.456");
  });

  test("handles high-precision decimals", () => {
    const schema = createSchema("test", {
      value: decimal128(),
    });

    const highPrecision = "123456789.123456789123456789";
    const data = Schema.encode(schema, { value: highPrecision });
    expect(data.value).toBeInstanceOf(Decimal128);
    expect(data.value.toString()).toBe(highPrecision);
  });

  test("rejects invalid values", () => {
    const schema = createSchema("test", {
      value: decimal128(),
    });

    // @ts-expect-error
    expect(() => Schema.encode(schema, { value: 123 })).toThrowError(
      "expected 'Decimal128' or 'string' received 'number'",
    );
    // @ts-expect-error
    expect(() => Schema.encode(schema, { value: {} })).toThrowError(
      "expected 'Decimal128' or 'string' received 'object'",
    );
  });

  test("works with nullable and optional", () => {
    const schema = createSchema("test", {
      nullableDecimal: decimal128().nullable(),
      optionalDecimal: decimal128().optional(),
    });

    const nullData = Schema.encode(schema, { nullableDecimal: null });
    expect(nullData).toStrictEqual({ nullableDecimal: null });

    const undefinedData = Schema.encode(schema, { nullableDecimal: Decimal128.fromString("99.99") });
    expect(undefinedData.nullableDecimal?.toString()).toBe("99.99");
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

    const BsonDataSchema = createSchema("bson_data_decimal", {
      decimalField: decimal128().optional(),
    });

    const { collections } = createDatabase(client.db(), {
      bsonData: BsonDataSchema,
    });

    afterAll(async () => {
      await collections.bsonData.deleteMany({});
    });

    test("accepts Decimal128 and returns Decimal128", async () => {
      const testDecimal = Decimal128.fromString("123456789.123456789123456789");

      const inserted = await collections.bsonData
        .insertOne({
          decimalField: testDecimal,
        })
        ;

      expect(inserted.decimalField).toBeInstanceOf(Decimal128);
      expect(inserted.decimalField!.toString()).toBe("123456789.123456789123456789");

      const retrieved = await collections.bsonData.findOne({ _id: inserted._id });
      expect(retrieved).not.toBeNull();
      expect(retrieved!.decimalField).toBeInstanceOf(Decimal128);
      expect(retrieved!.decimalField!.toString()).toBe("123456789.123456789123456789");
      expect(retrieved!.decimalField).toEqual(inserted.decimalField);
    });

    test("accepts string and returns Decimal128", async () => {
      const inserted = await collections.bsonData
        .insertOne({
          decimalField: "999.999999",
        })
        ;

      expect(inserted.decimalField).toBeInstanceOf(Decimal128);
      expect(inserted.decimalField!.toString()).toBe("999.999999");

      const retrieved = await collections.bsonData.findOne({ _id: inserted._id });
      expect(retrieved).not.toBeNull();
      expect(retrieved!.decimalField).toBeInstanceOf(Decimal128);
      expect(retrieved!.decimalField!.toString()).toBe("999.999999");
      expect(retrieved!.decimalField).toEqual(inserted.decimalField);
    });

    test("handles high precision decimals", async () => {
      const highPrecision = "99999999999999.999999999999999999";
      const inserted = await collections.bsonData
        .insertOne({
          decimalField: highPrecision,
        })
        ;

      expect(inserted.decimalField).toBeInstanceOf(Decimal128);
      expect(inserted.decimalField!.toString()).toBe(highPrecision);

      const retrieved = await collections.bsonData.findOne({ _id: inserted._id });
      expect(retrieved).not.toBeNull();
      expect(retrieved!.decimalField).toBeInstanceOf(Decimal128);
      expect(retrieved!.decimalField!.toString()).toBe(highPrecision);
      expect(retrieved!.decimalField).toEqual(inserted.decimalField);
    });
  });
});
