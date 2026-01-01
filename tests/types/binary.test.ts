import { Binary } from "mongodb";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createDatabase, createSchema, Schema } from "../../src";
import { binary } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("binary()", () => {
  test("validates Binary type", () => {
    const schema = createSchema("test", {
      data: binary(),
    });

    const testBuffer = Buffer.from("hello world");
    const data = Schema.encode(schema, { data: testBuffer });
    expect(data.data).toBeInstanceOf(Binary);
  });

  test("rejects non-Binary values", () => {
    const schema = createSchema("test", {
      data: binary(),
    });

    // @ts-expect-error
    expect(() => Schema.encode(schema, { data: "not a buffer" })).toThrowError(
      "expected 'Buffer' or 'Binary' received 'string'",
    );
    // @ts-expect-error
    expect(() => Schema.encode(schema, { data: 123 })).toThrowError("expected 'Buffer' or 'Binary' received 'number'");
    // @ts-expect-error
    expect(() => Schema.encode(schema, { data: {} })).toThrowError("expected 'Buffer' or 'Binary' received 'object'");
  });

  test("works with nullable and optional", () => {
    const schema = createSchema("test", {
      nullableBinary: binary().nullable(),
      optionalBinary: binary().optional(),
    });

    const nullData = Schema.encode(schema, { nullableBinary: null });
    expect(nullData).toStrictEqual({ nullableBinary: null });

    const undefinedData = Schema.encode(schema, { nullableBinary: Buffer.from("test") });
    expect(undefinedData.nullableBinary).toBeInstanceOf(Binary);
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

    const BsonDataSchema = createSchema("bson_data_binary", {
      binaryField: binary().optional(),
    });

    const { collections } = createDatabase(client.db(), {
      bsonData: BsonDataSchema,
    });

    afterAll(async () => {
      await collections.bsonData.deleteMany({});
    });

    test("accepts Buffer and returns Binary on insert", async () => {
      const testBuffer = Buffer.from("hello world");

      const inserted = await collections.bsonData.insertOne({
        binaryField: testBuffer,
      });
      expect(inserted.binaryField).toBeInstanceOf(Binary);
      expect(inserted.binaryField!.buffer.toString()).toBe("hello world");

      const retrieved = await collections.bsonData.findOne({ _id: inserted._id });
      expect(retrieved).not.toBeNull();
      expect(retrieved!.binaryField).toBeInstanceOf(Binary);
      expect(retrieved!.binaryField!.buffer.toString()).toBe("hello world");
      expect(retrieved!.binaryField).toEqual(inserted.binaryField);
    });

    test("accepts Binary and returns Binary on insert", async () => {
      const testBinary = new Binary(Buffer.from("binary data"));

      const inserted = await collections.bsonData.insertOne({
        binaryField: testBinary,
      });
      expect(inserted.binaryField).toBeInstanceOf(Binary);
      expect(inserted.binaryField!.buffer.toString()).toBe("binary data");

      const retrieved = await collections.bsonData.findOne({ _id: inserted._id });
      expect(retrieved).not.toBeNull();
      expect(retrieved!.binaryField).toBeInstanceOf(Binary);
      expect(retrieved!.binaryField!.buffer.toString()).toBe("binary data");
      expect(retrieved!.binaryField).toEqual(inserted.binaryField);
    });
  });
});
