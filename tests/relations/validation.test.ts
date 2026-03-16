import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas } from "../../src";
import { boolean, date, string } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("Relation Validations", async () => {
  const { server, client } = await createMockDatabase();

  beforeAll(async () => {
    await client.connect();
  });

  afterEach(async () => {
    await client.db().dropDatabase();
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  it("should throw error when schema has no relations defined", async () => {
    const UserSchema = createSchema("users", {
      name: string(),
      isAdmin: boolean(),
      createdAt: date(),
    });

    const db = createDatabase(
      client.db(),
      defineSchemas({
        UserSchema,
      }),
    );

    await expect(async () => {
      await db.collections.users.find().populate({ posts: true });
    }).rejects.toThrowError("No relations found for schema 'users'");
  });
});
