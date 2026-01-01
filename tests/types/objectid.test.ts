import { ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createDatabase, createSchema, Schema } from "../../src";
import { objectId } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("objectId()", () => {
  test("validates ObjectId type", () => {
    const schema = createSchema("test", {
      id: objectId(),
    });

    const testId = new ObjectId();
    const data = Schema.encode(schema, { id: testId });
    expect(data.id).toBeInstanceOf(ObjectId);
    expect(data.id.toString()).toBe(testId.toString());
  });

  test("converts valid string to ObjectId", () => {
    const schema = createSchema("test", {
      id: objectId(),
    });

    const validId = "507f1f77bcf86cd799439011";
    const data = Schema.encode(schema, { id: validId });
    expect(data.id).toBeInstanceOf(ObjectId);
    expect(data.id.toString()).toBe(validId);
  });

  test("rejects invalid ObjectId strings", () => {
    const schema = createSchema("test", {
      id: objectId(),
    });

    // @ts-expect-error
    expect(() => Schema.encode(schema, { id: "invalid" })).toThrowError("expected valid ObjectId");
    // @ts-expect-error
    expect(() => Schema.encode(schema, { id: {} })).toThrowError("expected valid ObjectId");
  });

  test("works with nullable and optional", () => {
    const schema = createSchema("test", {
      nullableId: objectId().nullable(),
      optionalId: objectId().optional(),
    });

    const nullData = Schema.encode(schema, { nullableId: null });
    expect(nullData).toStrictEqual({ nullableId: null });

    const testId = new ObjectId();
    const undefinedData = Schema.encode(schema, { nullableId: testId });
    expect(undefinedData.nullableId).toBeInstanceOf(ObjectId);
    expect(undefinedData.nullableId?.toString()).toBe(testId.toString());
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

    const TestSchema = createSchema("objectid_test", {
      refId: objectId().optional(),
    });

    const { collections } = createDatabase(client.db(), {
      testData: TestSchema,
    });

    afterAll(async () => {
      await collections.testData.deleteMany({});
    });

    test("accepts ObjectId and returns ObjectId", async () => {
      const testId = new ObjectId();

      const inserted = await collections.testData
        .insertOne({
          refId: testId,
        })
        ;

      expect(inserted.refId).toBeInstanceOf(ObjectId);
      expect(inserted.refId?.toString()).toBe(testId.toString());

      const retrieved = await collections.testData.findOne({ _id: inserted._id });
      expect(retrieved).not.toBeNull();
      expect(retrieved!.refId).toBeInstanceOf(ObjectId);
      expect(retrieved!.refId?.toString()).toBe(testId.toString());
      expect(retrieved!.refId).toEqual(inserted.refId);
    });

    test("accepts valid string and returns ObjectId", async () => {
      const validId = "507f1f77bcf86cd799439011";

      const inserted = await collections.testData
        .insertOne({
          refId: validId,
        })
        ;

      expect(inserted.refId).toBeInstanceOf(ObjectId);
      expect(inserted.refId?.toString()).toBe(validId);

      const retrieved = await collections.testData.findOne({ _id: inserted._id });
      expect(retrieved).not.toBeNull();
      expect(retrieved!.refId).toBeInstanceOf(ObjectId);
      expect(retrieved!.refId?.toString()).toBe(validId);
      expect(retrieved!.refId).toEqual(inserted.refId);
    });
  });
});
