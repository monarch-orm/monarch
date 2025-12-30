import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema } from "../src";
import { number, string } from "../src/types";
import { createMockDatabase } from "./mock";

describe("Update mutation", async () => {
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

  it("should not mutate reused update object in updateOne", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number().onUpdate(() => 999),
    });
    const db = createDatabase(client.db(), { users: schema });

    const user1 = await db.collections.users.insertOne({ name: "Alice", age: 20 }).exec();
    const user2 = await db.collections.users.insertOne({ name: "Bob", age: 30 }).exec();

    // Create a reusable update object
    const updateObj = { $set: { name: "Updated" } };

    // Use the same update object twice
    await db.collections.users.updateOne({ _id: user1._id }, updateObj).exec();
    await db.collections.users.updateOne({ _id: user2._id }, updateObj).exec();

    // Verify users were updated correctly with auto-update
    const updatedUser1 = await db.collections.users.findOne({ _id: user1._id }).exec();
    expect(updatedUser1?.name).toBe("Updated");
    expect(updatedUser1?.age).toBe(999);

    const updatedUser2 = await db.collections.users.findOne({ _id: user2._id }).exec();
    expect(updatedUser2?.name).toBe("Updated");
    expect(updatedUser2?.age).toBe(999);

    // The key test: original object should not be mutated
    expect(updateObj).toStrictEqual({ $set: { name: "Updated" } });
  });

  it("should not mutate reused update object in updateMany", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number().onUpdate(() => 888),
    });
    const db = createDatabase(client.db(), { users: schema });

    await db.collections.users.insertOne({ name: "Alice", age: 20 }).exec();
    await db.collections.users.insertOne({ name: "Bob", age: 30 }).exec();
    await db.collections.users.insertOne({ name: "Charlie", age: 40 }).exec();

    const updateObj = { $set: { name: "Updated" } };

    // Use the same update object twice for different filters
    await db.collections.users.updateMany({ age: { $lt: 30 } }, updateObj).exec();
    await db.collections.users.updateMany({ age: { $gte: 30 } }, updateObj).exec();

    // Verify all users were updated
    const users = await db.collections.users.find({}).exec();
    expect(users).toHaveLength(3);
    for (const user of users) {
      expect(user.name).toBe("Updated");
      expect(user.age).toBe(888);
    }

    // Original object should not be mutated
    expect(updateObj).toStrictEqual({ $set: { name: "Updated" } });
  });

  it("should not mutate reused update object in findOneAndUpdate", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number().onUpdate(() => 777),
    });
    const db = createDatabase(client.db(), { users: schema });

    const user1 = await db.collections.users.insertOne({ name: "Alice", age: 20 }).exec();
    const user2 = await db.collections.users.insertOne({ name: "Bob", age: 30 }).exec();

    const updateObj = { $set: { name: "Updated" } };

    // Use the same update object twice
    await db.collections.users
      .findOneAndUpdate({ _id: user1._id }, updateObj)
      .options({ returnDocument: "after" })
      .exec();
    await db.collections.users
      .findOneAndUpdate({ _id: user2._id }, updateObj)
      .options({ returnDocument: "after" })
      .exec();

    // Verify users were updated
    const updatedUser1 = await db.collections.users.findOne({ _id: user1._id }).exec();
    expect(updatedUser1?.name).toBe("Updated");
    expect(updatedUser1?.age).toBe(777);

    const updatedUser2 = await db.collections.users.findOne({ _id: user2._id }).exec();
    expect(updatedUser2?.name).toBe("Updated");
    expect(updatedUser2?.age).toBe(777);

    // Original object should not be mutated
    expect(updateObj).toStrictEqual({ $set: { name: "Updated" } });
  });
});
