import { UUID } from "mongodb";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createDatabase, createSchema, Schema } from "../../src";
import { uuid } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("uuid", () => {
  test("accepts UUID value", () => {
    const schema = createSchema("test", { value: uuid() });
    const id = new UUID();
    const data = Schema.input(schema, { value: id });
    expect(data.value).toBeInstanceOf(UUID);
    expect(data.value).toEqual(id);
  });

  test("converts UUID string to UUID", () => {
    const schema = createSchema("test", { value: uuid() });
    const uuidStr = "550e8400-e29b-41d4-a716-446655440000";
    const data = Schema.input(schema, { value: uuidStr });
    expect(data.value).toBeInstanceOf(UUID);
    expect(data.value.toString()).toBe(uuidStr);
  });

  test("rejects invalid UUID strings", () => {
    const schema = createSchema("test", { value: uuid() });
    expect(() => Schema.input(schema, { value: "not-a-uuid" })).toThrow();
  });

  test("rejects non-string / non-UUID input types", () => {
    const schema = createSchema("test", { value: uuid() });
    // @ts-expect-error
    expect(() => Schema.input(schema, { value: 123 })).toThrowError(
      "expected 'UUID' or 'string' received 'number'",
    );
    // @ts-expect-error
    expect(() => Schema.input(schema, { value: {} })).toThrowError(
      "expected 'UUID' or 'string' received 'object'",
    );
  });

  test("works with nullable and optional", () => {
    const schema = createSchema("test", {
      nullable: uuid().nullable(),
      optional: uuid().optional(),
    });

    const nullData = Schema.input(schema, { nullable: null });
    expect(nullData).toStrictEqual({ nullable: null });

    const id = new UUID();
    const data = Schema.input(schema, { nullable: id });
    expect(data.nullable).toBeInstanceOf(UUID);
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

    const UUIDSchema = createSchema("bson_uuid", {
      value: uuid().optional(),
    });

    const { collections } = createDatabase(client.db(), { data: UUIDSchema });

    afterAll(async () => {
      await collections.data.deleteMany({});
    });

    test("accepts UUID and retrieves UUID", async () => {
      const id = new UUID();
      const inserted = await collections.data.insertOne({ value: id });
      expect(inserted.value).toBeInstanceOf(UUID);

      const retrieved = await collections.data.findOne({ _id: inserted._id });
      expect(retrieved!.value).toBeInstanceOf(UUID);
      expect(retrieved!.value).toEqual(id);
    });

    test("accepts string and retrieves UUID", async () => {
      const uuidStr = "550e8400-e29b-41d4-a716-446655440000";
      const inserted = await collections.data.insertOne({ value: uuidStr });
      expect(inserted.value).toBeInstanceOf(UUID);
      expect(inserted.value!.toString()).toBe(uuidStr);

      const retrieved = await collections.data.findOne({ _id: inserted._id });
      expect(retrieved!.value).toBeInstanceOf(UUID);
      expect(retrieved!.value!.toString()).toBe(uuidStr);
    });
  });
});
