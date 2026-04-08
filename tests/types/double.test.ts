import { Double } from "mongodb";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createDatabase, createSchema, defineSchemas, Schema } from "../../src";
import { double } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("double", () => {
  test("accepts Double value and returns number", () => {
    const schema = createSchema("test", { value: double() });
    const data = Schema.input(schema, { value: new Double(3.14) });
    expect(data.value).toBeCloseTo(3.14);
  });

  test("accepts number and returns number", () => {
    const schema = createSchema("test", { value: double() });
    const data = Schema.input(schema, { value: 1.5 });
    expect(data.value).toBe(1.5);
  });

  test("rejects non-number input types", () => {
    const schema = createSchema("test", { value: double() });
    // @ts-expect-error
    expect(() => Schema.input(schema, { value: "3.14" })).toThrow("expected 'Double' or 'number' received 'string'");
    // @ts-expect-error
    expect(() => Schema.input(schema, { value: true })).toThrow("expected 'Double' or 'number' received 'boolean'");
  });

  test("works with nullable and optional", () => {
    const schema = createSchema("test", {
      nullable: double().nullable(),
      optional: double().optional(),
    });

    const nullData = Schema.input(schema, { nullable: null });
    expect(nullData).toStrictEqual({ nullable: null });

    const doubleData = Schema.input(schema, { nullable: new Double(2.5) });
    expect(doubleData.nullable).toBeCloseTo(2.5);
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

    const DoubleSchema = createSchema("data", {
      value: double().optional(),
    });

    const { collections } = createDatabase(client.db(), defineSchemas({ DoubleSchema }));

    afterAll(async () => {
      await collections.data.deleteMany({});
    });

    test("accepts Double and returns number", async () => {
      const inserted = await collections.data.insertOne({ value: new Double(3.14) });
      expect(inserted.value).toBeCloseTo(3.14);

      const retrieved = await collections.data.findOne({ _id: inserted._id });
      expect(retrieved!.value).toBeCloseTo(3.14);
    });

    test("accepts number and returns number", async () => {
      const inserted = await collections.data.insertOne({ value: 2.718 });
      expect(inserted.value).toBeCloseTo(2.718);

      const retrieved = await collections.data.findOne({ _id: inserted._id });
      expect(retrieved!.value).toBeCloseTo(2.718);
    });
  });
});
