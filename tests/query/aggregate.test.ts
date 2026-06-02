import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas } from "../../src";
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

  const { collections } = createDatabase(
    client.db(),
    defineSchemas({
      users: UserSchema,
    }),
  );

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

  it("accepts an initial pipeline", async () => {
    await collections.users.insertMany(mockUsers);
    const verifiedCount = mockUsers.filter((u) => u.isVerified).length;
    const result = await collections.users.aggregate([{ $match: { isVerified: true } }]);
    expect(result.length).toBe(verifiedCount);
  });

  it("extends an initial pipeline with addStage()", async () => {
    await collections.users.insertMany(mockUsers);
    const result = await collections.users
      .aggregate([{ $match: { isVerified: true } }])
      .addStage({ $group: { _id: "$isVerified", count: { $sum: 1 } } });
    expect(result.length).toBe(1);
  });

  it("executes raw MongoDB aggregate", async () => {
    await collections.users.insertMany(mockUsers);
    const result = await collections.users
      .raw()
      .aggregate([{ $match: { isVerified: true } }])
      .toArray();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(mockUsers.filter((u) => u.isVerified).length);
  });

  describe("immutability", () => {
    it("addStage() returns a new instance and does not affect base pipeline", async () => {
      await collections.users.insertMany(mockUsers);

      const verifiedCount = mockUsers.filter((u) => u.isVerified).length;
      const base = collections.users.aggregate();
      const withMatch = base.addStage({ $match: { isVerified: true } });

      expect(withMatch).not.toBe(base);
      expect((await base).length).toBe(mockUsers.length);
      expect((await withMatch).length).toBe(verifiedCount);
    });

    it("chained addStage() calls are independent from base", async () => {
      await collections.users.insertMany(mockUsers);

      const base = collections.users.aggregate();
      const withMatch = base.addStage({ $match: { isVerified: true } });
      const withLimit = base.addStage({ $limit: 1 });

      expect((await base).length).toBe(mockUsers.length);
      expect((await withMatch).length).toBe(mockUsers.filter((u) => u.isVerified).length);
      expect((await withLimit).length).toBe(1);
    });
  });
});
