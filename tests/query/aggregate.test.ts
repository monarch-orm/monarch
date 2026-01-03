import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema } from "../../src";
import { boolean, number, string } from "../../src/types";
import { createMockDatabase, mockUsers } from "../mock";

describe("Aggregation Operations", async () => {
  const { server, client } = await createMockDatabase();

  const UserSchema = createSchema("users", {
    name: string().optional(),
    email: string().lowercase().optional(),
    age: number().optional().default(10),
    isVerified: boolean().default(false),
  });

  const { collections } = createDatabase(client.db(), {
    users: UserSchema,
  });

  beforeAll(async () => {
    await client.connect();
  });

  afterEach(async () => {
    await collections.users.deleteMany({});
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  it("aggregates data", async () => {
    await collections.users.insertMany(mockUsers);
    const result = await collections.users
      .aggregate()
      .addStage({ $match: { isVerified: true } })
      .addStage({ $group: { _id: "$isVerified", count: { $sum: 1 } } });
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("executes raw MongoDB operations", async () => {
    const result = await collections.users.raw().find().toArray();
    expect(result).toBeInstanceOf(Array);
  });
});
