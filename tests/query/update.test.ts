import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createDatabase, createSchema, defineSchemas } from "../../src";
import { boolean, date, number, string } from "../../src/types";
import { createMockDatabase, mockUsers } from "../mock";

describe("Update Operations", async () => {
  const { server, client } = await createMockDatabase();

  const UserSchema = createSchema("users", {
    name: string().optional(),
    email: string().lowercase().optional(),
    age: number().optional().default(10),
    isVerified: boolean().default(false),
    joinedAt: date().optional(),
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

  it("update runs on update operations", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number(),
      isAdmin: boolean(),
    }).onUpdate({
      $set: { age: 100 },
    });
    const db = createDatabase(client.db(), defineSchemas({ users: schema }));
    const res = await db.collections.users.insertOne({
      name: "tom",
      age: 0,
      isAdmin: true,
    });
    const doc = await db.collections.users.findOne({ _id: res._id });
    expect(doc).toStrictEqual({
      _id: res._id,
      name: "tom",
      age: 0,
      isAdmin: true,
    });
    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      });
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      age: 100,
      isAdmin: true,
    });
  });

  it("update also calls validate", async () => {
    const onUpdateTrap = vi.fn(() => true);
    const schema = createSchema("users", {
      name: string(),
      nonce: number().validate(onUpdateTrap, ""),
    }).onUpdate(() => ({
      $set: { nonce: 1 },
    }));
    const db = createDatabase(client.db(), defineSchemas({ users: schema }));
    const res = await db.collections.users.insertOne({
      name: "tom",
      nonce: 0,
    });
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: 0 });

    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      });
    expect(onUpdateTrap).toBeCalledTimes(2);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: 1,
    });
  });

  it("updates with optional", async () => {
    let nonce = 1;
    const onUpdateTrap = vi.fn(() => nonce++);
    const schema = createSchema("users", {
      name: string(),
      nonce: number().optional(),
    }).onUpdate(() => ({
      $set: { nonce: onUpdateTrap() },
    }));
    const db = createDatabase(client.db(), defineSchemas({ users: schema }));
    const res = await db.collections.users.insertOne({
      name: "tom",
    });
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(res).toStrictEqual({ _id: res._id, name: "tom" });

    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      });
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: 1,
    });
  });

  it("updates with nullable", async () => {
    let nonce = 1;
    const onUpdateTrap = vi.fn(() => nonce++);
    const schema = createSchema("users", {
      name: string(),
      nonce: number().nullable(),
    }).onUpdate(() => ({
      $set: { nonce: onUpdateTrap() },
    }));
    const db = createDatabase(client.db(), defineSchemas({ users: schema }));
    const res = await db.collections.users.insertOne({
      name: "tom",
      nonce: null,
    });
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: null });

    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      });
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: 1,
    });
  });

  it("updates with defaulted", async () => {
    let nonce = 1;
    const onUpdateTrap = vi.fn(() => nonce++);
    const schema = createSchema("users", {
      name: string(),
      nonce: number().default(0),
    }).onUpdate(() => ({
      $set: { nonce: onUpdateTrap() },
    }));
    const db = createDatabase(client.db(), defineSchemas({ users: schema }));
    const res = await db.collections.users.insertOne({
      name: "tom",
    });
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: 0 });

    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      });
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: 1,
    });
  });

  it("finds one and updates", async () => {
    await collections.users.insertOne(mockUsers[0]);

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
      });

    expect(updatedUser).not.toBe(null);
    expect(updatedUser?.age).toBe(30);
  });

  it("updates one document", async () => {
    await collections.users.insertOne(mockUsers[1]);
    const updated = await collections.users.updateOne({ email: "anon1@gmail.com" }, { $set: { age: 35 } });
    expect(updated.acknowledged).toBe(true);
  });

  it("updates many documents", async () => {
    await collections.users.insertMany(mockUsers);
    const updated = await collections.users.updateMany({ isVerified: false }, { $set: { age: 40 } });
    expect(updated.acknowledged).toBe(true);
  });

  it("replaces one document", async () => {
    const original = await collections.users.insertOne(mockUsers[0]);
    const replaced = await collections.users.replaceOne(
      { email: "anon@gmail.com" },
      {
        ...original,
        name: "New Name",
      },
    );
    expect(replaced.modifiedCount).toBe(1);
  });

  it("finds and updates one by ObjectId", async () => {
    const user = await collections.users.insertOne(mockUsers[0]);

    const updatedUser = await collections.users
      .findByIdAndUpdate(user._id, { $set: { age: 99 } })
      .options({ returnDocument: "after" });

    expect(updatedUser).not.toBe(null);
    expect(updatedUser?._id).toStrictEqual(user._id);
    expect(updatedUser?.age).toBe(99);
  });

  it("finds and updates one by ObjectId string", async () => {
    const user = await collections.users.insertOne(mockUsers[1]);

    const updatedUser = await collections.users
      .findByIdAndUpdate(user._id.toString(), { $set: { age: 77 } })
      .options({ returnDocument: "after" });

    expect(updatedUser).not.toBe(null);
    expect(updatedUser?._id).toStrictEqual(user._id);
    expect(updatedUser?.age).toBe(77);
  });

  it("findByIdAndUpdate triggers onUpdate hooks", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number(),
    }).onUpdate({
      $set: { age: 555 },
    });
    const schemas = defineSchemas({ users: schema });
    const db = createDatabase(client.db(), schemas);

    const user = await db.collections.users.insertOne({ name: "Alice", age: 20 });

    const updatedUser = await db.collections.users
      .findByIdAndUpdate(user._id, { $set: { name: "Bob" } })
      .options({ returnDocument: "after" });

    expect(updatedUser?.name).toBe("Bob");
    expect(updatedUser?.age).toBe(555);
  });

  describe("validation", () => {
    it("rejects invalid type in findOneAndUpdate", async () => {
      await collections.users.insertOne(mockUsers[0]);

      await expect(
        collections.users
          .findOneAndUpdate({ email: "anon@gmail.com" }, { $set: { age: "invalid" as any } })
          .options({ returnDocument: "after" }),
      ).rejects.toThrow();
    });

    it("rejects invalid type in updateOne", async () => {
      await collections.users.insertOne(mockUsers[0]);

      await expect(
        collections.users.updateOne({ email: "anon@gmail.com" }, { $set: { age: "invalid" as any } }),
      ).rejects.toThrow();
    });

    it("transforms input in findOneAndUpdate", async () => {
      await collections.users.insertOne(mockUsers[0]);

      const updated = await collections.users
        .findOneAndUpdate({ email: "anon@gmail.com" }, { $set: { email: "ANON@GMAIL.COM" } })
        .options({ returnDocument: "after" });

      expect(updated?.email).toBe("anon@gmail.com");
    });

    it("transforms input in updateOne", async () => {
      await collections.users.insertOne(mockUsers[1]);

      await collections.users.updateOne({ email: "anon1@gmail.com" }, { $set: { email: "ANON1@GMAIL.COM" } });
      const user = await collections.users.findOne({ email: "anon1@gmail.com" });

      expect(user?.email).toBe("anon1@gmail.com");
    });
  });

  describe("edge cases", () => {
    it("should not mutate reused update object in updateOne", async () => {
      const schema = createSchema("users", {
        name: string(),
        age: number(),
      }).onUpdate({
        $set: { age: 999 },
      });
      const schemas = defineSchemas({ users: schema });
      const db = createDatabase(client.db(), schemas);

      const user1 = await db.collections.users.insertOne({ name: "Alice", age: 20 });
      const user2 = await db.collections.users.insertOne({ name: "Bob", age: 30 });

      // Create a reusable update object
      const updateObj = { $set: { name: "Updated" } };

      // Use the same update object twice
      await db.collections.users.updateOne({ _id: user1._id }, updateObj);
      await db.collections.users.updateOne({ _id: user2._id }, updateObj);

      // Verify users were updated correctly with auto-update
      const updatedUser1 = await db.collections.users.findOne({ _id: user1._id });
      expect(updatedUser1?.name).toBe("Updated");
      expect(updatedUser1?.age).toBe(999);

      const updatedUser2 = await db.collections.users.findOne({ _id: user2._id });
      expect(updatedUser2?.name).toBe("Updated");
      expect(updatedUser2?.age).toBe(999);

      // Original object should not be mutated
      expect(updateObj).toStrictEqual({ $set: { name: "Updated" } });
    });

    it("should not mutate reused update object in updateMany", async () => {
      const schema = createSchema("users", {
        name: string(),
        age: number(),
      }).onUpdate({
        $set: { age: 888 },
      });
      const schemas = defineSchemas({ users: schema });
      const db = createDatabase(client.db(), schemas);

      await db.collections.users.insertOne({ name: "Alice", age: 20 });
      await db.collections.users.insertOne({ name: "Bob", age: 30 });
      await db.collections.users.insertOne({ name: "Charlie", age: 40 });

      const updateObj = { $set: { name: "Updated" } };

      // Use the same update object twice for different filters
      await db.collections.users.updateMany({ age: { $lt: 30 } }, updateObj);
      await db.collections.users.updateMany({ age: { $gte: 30 } }, updateObj);

      // Verify all users were updated
      const users = await db.collections.users.find({});
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
        age: number(),
      }).onUpdate({
        $set: { age: 777 },
      });
      const schemas = defineSchemas({ users: schema });
      const db = createDatabase(client.db(), schemas);

      const user1 = await db.collections.users.insertOne({ name: "Alice", age: 20 });
      const user2 = await db.collections.users.insertOne({ name: "Bob", age: 30 });

      const updateObj = { $set: { name: "Updated" } };

      // Use the same update object twice
      await db.collections.users.findOneAndUpdate({ _id: user1._id }, updateObj).options({ returnDocument: "after" });
      await db.collections.users.findOneAndUpdate({ _id: user2._id }, updateObj).options({ returnDocument: "after" });

      // Verify users were updated
      const updatedUser1 = await db.collections.users.findOne({ _id: user1._id });
      expect(updatedUser1?.name).toBe("Updated");
      expect(updatedUser1?.age).toBe(777);

      const updatedUser2 = await db.collections.users.findOne({ _id: user2._id });
      expect(updatedUser2?.name).toBe("Updated");
      expect(updatedUser2?.age).toBe(777);

      // Original object should not be mutated
      expect(updateObj).toStrictEqual({ $set: { name: "Updated" } });
    });
  });
});
