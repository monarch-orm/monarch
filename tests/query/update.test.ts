import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema } from "../../src";
import { boolean, number, string } from "../../src/types";
import { createMockDatabase, mockUsers } from "../mock";

describe("Update Operations", async () => {
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
    await collections.users.deleteMany({}).exec();
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  it("finds one and updates", async () => {
    await collections.users.insertOne(mockUsers[0]).exec();

    const updatedUser = await collections.users
      .findOneAndUpdate(
        { email: "anon@gmail.com" },
        {
          $set: {
            age: 30,
          },
        },
      )
      .options({
        returnDocument: "after",
      })
      .exec();

    expect(updatedUser).not.toBe(null);
    expect(updatedUser?.age).toBe(30);
  });

  it("updates one document", async () => {
    await collections.users.insertOne(mockUsers[1]).exec();
    const updated = await collections.users.updateOne({ email: "anon1@gmail.com" }, { $set: { age: 35 } }).exec();
    expect(updated.acknowledged).toBe(true);
  });

  it("updates many documents", async () => {
    await collections.users.insertMany(mockUsers).exec();
    const updated = await collections.users.updateMany({ isVerified: false }, { $set: { age: 40 } }).exec();
    expect(updated.acknowledged).toBe(true);
  });

  it("replaces one document", async () => {
    const original = await collections.users.insertOne(mockUsers[0]).exec();
    const replaced = await collections.users
      .replaceOne(
        { email: "anon@gmail.com" },
        {
          ...original,
          name: "New Name",
        },
      )
      .exec();
    expect(replaced.modifiedCount).toBe(1);
  });

  describe("edge cases", () => {
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
});
