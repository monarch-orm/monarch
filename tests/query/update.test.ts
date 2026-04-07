import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createDatabase, createSchema, defineSchemas } from "../../src";
import { array, boolean, date, mixed, number, string } from "../../src/types";
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

  describe("findOneAndUpdate", () => {
    it("returns null when document not found", async () => {
      const result = await collections.users.findOneAndUpdate({ name: "nobody" }, { $set: { age: 1 } });
      expect(result).toBeNull();
    });

    it("returns original document by default", async () => {
      const user = await collections.users.insertOne(mockUsers[0]);
      const result = await collections.users.findOneAndUpdate({ _id: user._id }, { $set: { age: 99 } });
      expect(result?.age).toBe(17);
    });

    it("returns updated document with returnDocument: after", async () => {
      const user = await collections.users.insertOne(mockUsers[0]);
      const result = await collections.users
        .findOneAndUpdate({ _id: user._id }, { $set: { age: 99 } })
        .options({ returnDocument: "after" });
      expect(result?.age).toBe(99);
    });

    it("transforms input through schema", async () => {
      await collections.users.insertOne(mockUsers[0]);
      const result = await collections.users
        .findOneAndUpdate({ email: "anon@gmail.com" }, { $set: { email: "ANON@GMAIL.COM" } })
        .options({ returnDocument: "after" });
      expect(result?.email).toBe("anon@gmail.com");
    });

    it("rejects invalid type", async () => {
      await collections.users.insertOne(mockUsers[0]);
      await expect(
        collections.users
          // @ts-expect-error
          .findOneAndUpdate({ email: "anon@gmail.com" }, { $set: { age: "invalid" } })
          .options({ returnDocument: "after" }),
      ).rejects.toThrow();
    });

    it("supports omit projection", async () => {
      const user = await collections.users.insertOne(mockUsers[0]);
      const result = await collections.users
        .findOneAndUpdate({ _id: user._id }, { $set: { age: 30 } })
        .options({ returnDocument: "after" })
        .omit({ age: true });
      expect(result).not.toHaveProperty("age");
      expect(result).toHaveProperty("name");
    });

    it("supports select projection", async () => {
      const user = await collections.users.insertOne(mockUsers[0]);
      const result = await collections.users
        .findOneAndUpdate({ _id: user._id }, { $set: { age: 30 } })
        .options({ returnDocument: "after" })
        .select({ name: true });
      expect(result).toHaveProperty("name");
      expect(result).not.toHaveProperty("age");
    });

    it("upserts when no document matches", async () => {
      const result = await collections.users
        .findOneAndUpdate({ name: "ghost" }, { $set: { age: 42 } })
        .options({ upsert: true, returnDocument: "after" });
      expect(result).not.toBeNull();
      expect(result?.age).toBe(42);
    });
  });

  describe("findOneAndReplace", () => {
    it("returns null when document not found", async () => {
      const result = await collections.users.findOneAndReplace({ name: "nobody" }, { name: "someone" });
      expect(result).toBeNull();
    });

    it("returns original document by default", async () => {
      const user = await collections.users.insertOne(mockUsers[0]);
      const result = await collections.users.findOneAndReplace({ _id: user._id }, { name: "replaced" });
      expect(result?.name).toBe("anon");
    });

    it("returns replaced document with returnDocument: after", async () => {
      const user = await collections.users.insertOne(mockUsers[0]);
      const result = await collections.users
        .findOneAndReplace({ _id: user._id }, { name: "replaced" })
        .options({ returnDocument: "after" });
      expect(result?.name).toBe("replaced");
    });

    it("replaces entire document content", async () => {
      const user = await collections.users.insertOne(mockUsers[0]);
      await collections.users.findOneAndReplace({ _id: user._id }, { name: "fresh" });
      const fetched = await collections.users.findOne({ _id: user._id });
      expect(fetched?.name).toBe("fresh");
      expect(fetched?.email).toBeUndefined();
    });

    it("upserts when no document matches", async () => {
      const result = await collections.users
        .findOneAndReplace({ name: "ghost" }, { name: "new" })
        .options({ upsert: true, returnDocument: "after" });
      expect(result).not.toBeNull();
      expect(result?.name).toBe("new");
    });

    it("supports omit projection", async () => {
      const user = await collections.users.insertOne(mockUsers[0]);
      const result = await collections.users
        .findOneAndReplace({ _id: user._id }, { name: "replaced", age: 50 })
        .options({ returnDocument: "after" })
        .omit({ age: true });
      expect(result).not.toHaveProperty("age");
      expect(result?.name).toBe("replaced");
    });

    it("supports select projection", async () => {
      const user = await collections.users.insertOne(mockUsers[0]);
      const result = await collections.users
        .findOneAndReplace({ _id: user._id }, { name: "replaced", age: 50 })
        .options({ returnDocument: "after" })
        .select({ name: true });
      expect(result?.name).toBe("replaced");
      expect(result).not.toHaveProperty("age");
    });
  });

  describe("updateOne", () => {
    it("updates matching document", async () => {
      await collections.users.insertOne(mockUsers[1]);
      const result = await collections.users.updateOne({ email: "anon1@gmail.com" }, { $set: { age: 35 } });
      expect(result.acknowledged).toBe(true);
      expect(result.modifiedCount).toBe(1);
    });

    it("transforms input through schema", async () => {
      await collections.users.insertOne(mockUsers[1]);
      await collections.users.updateOne({ email: "anon1@gmail.com" }, { $set: { email: "ANON1@GMAIL.COM" } });
      const user = await collections.users.findOne({ email: "anon1@gmail.com" });
      expect(user?.email).toBe("anon1@gmail.com");
    });

    it("rejects invalid type", async () => {
      await collections.users.insertOne(mockUsers[0]);
      await expect(
        // @ts-expect-error
        collections.users.updateOne({ email: "anon@gmail.com" }, { $set: { age: "invalid" } }),
      ).rejects.toThrow();
    });
  });

  describe("updateMany", () => {
    it("updates all matching documents", async () => {
      await collections.users.insertMany(mockUsers);
      const result = await collections.users.updateMany({ isVerified: false }, { $set: { age: 40 } });
      expect(result.acknowledged).toBe(true);
      expect(result.modifiedCount).toBeGreaterThan(0);
    });

    it("transforms input through schema for all matched", async () => {
      await collections.users.insertMany(mockUsers);
      await collections.users.updateMany({}, { $set: { email: "COMMON@GMAIL.COM" } });
      const users = await collections.users.find({});
      for (const user of users) {
        expect(user.email).toBe("common@gmail.com");
      }
    });
  });

  describe("replaceOne", () => {
    it("replaces matching document", async () => {
      const original = await collections.users.insertOne(mockUsers[0]);
      const result = await collections.users.replaceOne({ email: "anon@gmail.com" }, { ...original, name: "New Name" });
      expect(result.modifiedCount).toBe(1);
    });

    it("stores replaced content", async () => {
      const original = await collections.users.insertOne(mockUsers[0]);
      await collections.users.replaceOne({ _id: original._id }, { name: "replaced" });
      const fetched = await collections.users.findOne({ _id: original._id });
      expect(fetched?.name).toBe("replaced");
    });
  });

  describe("findByIdAndUpdate", () => {
    it("updates by ObjectId", async () => {
      const user = await collections.users.insertOne(mockUsers[0]);
      const result = await collections.users
        .findByIdAndUpdate(user._id, { $set: { age: 99 } })
        .options({ returnDocument: "after" });
      expect(result?._id).toStrictEqual(user._id);
      expect(result?.age).toBe(99);
    });

    it("updates by ObjectId string", async () => {
      const user = await collections.users.insertOne(mockUsers[1]);
      const result = await collections.users
        .findByIdAndUpdate(user._id.toString(), { $set: { age: 77 } })
        .options({ returnDocument: "after" });
      expect(result?._id).toStrictEqual(user._id);
      expect(result?.age).toBe(77);
    });
  });

  describe("operators", async () => {
    const ArraySchema = createSchema("arrays", {
      name: string(),
      tags: array(string().lowercase()),
      nums: array(number()),
    });

    const NumericSchema = createSchema("numeric", {
      name: string(),
      count: number(),
    });

    const OptionalSchema = createSchema("optionals", {
      name: string(),
      nickname: string().optional(),
      alias: string().optional(),
      lastSeen: date().optional(),
    });

    const db = createDatabase(
      client.db(),
      defineSchemas({
        arrays: ArraySchema,
        numeric: NumericSchema,
        optionals: OptionalSchema,
      }),
    );

    afterEach(async () => {
      await db.collections.arrays.deleteMany({});
      await db.collections.numeric.deleteMany({});
      await db.collections.optionals.deleteMany({});
    });

    describe("$push / $addToSet", () => {
      it("$push appends element to array", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: ["x"], nums: [] });
        await db.collections.arrays.updateOne({ _id: doc._id }, { $push: { tags: "y" } });
        const updated = await db.collections.arrays.findOne({ _id: doc._id });
        expect(updated?.tags).toEqual(["x", "y"]);
      });

      it("$push parses element through type", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: [], nums: [] });
        await db.collections.arrays.updateOne({ _id: doc._id }, { $push: { tags: "UPPER" } });
        const updated = await db.collections.arrays.findOne({ _id: doc._id });
        expect(updated?.tags).toEqual(["upper"]);
      });

      it("$push with $each appends multiple elements", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: ["x"], nums: [] });
        await db.collections.arrays.updateOne({ _id: doc._id }, { $push: { tags: { $each: ["y", "z"] } } });
        const updated = await db.collections.arrays.findOne({ _id: doc._id });
        expect(updated?.tags).toEqual(["x", "y", "z"]);
      });

      it("$addToSet adds element only if not present", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: ["x"], nums: [] });
        await db.collections.arrays.updateOne({ _id: doc._id }, { $addToSet: { tags: "x" } });
        await db.collections.arrays.updateOne({ _id: doc._id }, { $addToSet: { tags: "y" } });
        const updated = await db.collections.arrays.findOne({ _id: doc._id });
        expect(updated?.tags).toEqual(["x", "y"]);
      });

      it("$push rejects non-array field", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 0 });
        // @ts-expect-error
        await expect(db.collections.numeric.updateOne({ _id: doc._id }, { $push: { count: 1 } })).rejects.toThrow(
          "requires an array field",
        );
      });

      it("$addToSet rejects non-array field", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 0 });
        // @ts-expect-error
        await expect(db.collections.numeric.updateOne({ _id: doc._id }, { $addToSet: { count: 1 } })).rejects.toThrow(
          "requires an array field",
        );
      });
    });

    describe("$pull / $pullAll / $pop", () => {
      it("$pull removes matching elements", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: ["x", "y", "x"], nums: [] });
        await db.collections.arrays.updateOne({ _id: doc._id }, { $pull: { tags: "x" } });
        const updated = await db.collections.arrays.findOne({ _id: doc._id });
        expect(updated?.tags).toEqual(["y"]);
      });

      it("$pullAll removes all listed elements", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: ["x", "y", "z"], nums: [] });
        await db.collections.arrays.updateOne({ _id: doc._id }, { $pullAll: { tags: ["x", "z"] } });
        const updated = await db.collections.arrays.findOne({ _id: doc._id });
        expect(updated?.tags).toEqual(["y"]);
      });

      it("$pullAll parses each element through type", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: ["x", "y"], nums: [] });
        await db.collections.arrays.updateOne({ _id: doc._id }, { $pullAll: { tags: ["X"] } });
        const updated = await db.collections.arrays.findOne({ _id: doc._id });
        expect(updated?.tags).toEqual(["y"]);
      });

      it("$pop removes last element", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: ["x", "y", "z"], nums: [] });
        await db.collections.arrays.updateOne({ _id: doc._id }, { $pop: { tags: 1 } });
        const updated = await db.collections.arrays.findOne({ _id: doc._id });
        expect(updated?.tags).toEqual(["x", "y"]);
      });

      it("$pop removes first element", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: ["x", "y", "z"], nums: [] });
        await db.collections.arrays.updateOne({ _id: doc._id }, { $pop: { tags: -1 } });
        const updated = await db.collections.arrays.findOne({ _id: doc._id });
        expect(updated?.tags).toEqual(["y", "z"]);
      });

      it("$pull rejects non-array field", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 0 });
        await expect(
          // @ts-expect-error
          db.collections.numeric.updateOne({ _id: doc._id }, { $pull: { count: 1 } }),
        ).rejects.toThrow("requires an array field");
      });

      it("$pullAll rejects non-array field", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 0 });
        await expect(
          // @ts-expect-error
          db.collections.numeric.updateOne({ _id: doc._id }, { $pullAll: { count: [1] } }),
        ).rejects.toThrow("requires an array field");
      });

      it("$pop rejects non-array field", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 0 });
        // @ts-expect-error
        await expect(db.collections.numeric.updateOne({ _id: doc._id }, { $pop: { count: 1 } })).rejects.toThrow(
          "requires an array field",
        );
      });
    });

    describe("$bit", () => {
      it("$bit applies bitwise operation to numeric field", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 6 });
        await db.collections.numeric.updateOne({ _id: doc._id }, { $bit: { count: { and: 3 } } });
        const updated = await db.collections.numeric.findOne({ _id: doc._id });
        expect(updated?.count).toBe(2);
      });

      it("$bit rejects non-integer field", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: [], nums: [] });
        await expect(
          // @ts-expect-error
          db.collections.arrays.updateOne({ _id: doc._id }, { $bit: { tags: { and: 1 } } }),
        ).rejects.toThrow("requires an integer field");
      });
    });

    describe("$inc / $mul", () => {
      it("$inc increments numeric field", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 5 });
        await db.collections.numeric.updateOne({ _id: doc._id }, { $inc: { count: 3 } });
        const updated = await db.collections.numeric.findOne({ _id: doc._id });
        expect(updated?.count).toBe(8);
      });

      it("$mul multiplies numeric field", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 5 });
        await db.collections.numeric.updateOne({ _id: doc._id }, { $mul: { count: 4 } });
        const updated = await db.collections.numeric.findOne({ _id: doc._id });
        expect(updated?.count).toBe(20);
      });

      it("$inc rejects non-numeric field", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: [], nums: [] });
        // @ts-expect-error
        await expect(db.collections.arrays.updateOne({ _id: doc._id }, { $inc: { tags: 1 } })).rejects.toThrow(
          "requires a numeric field",
        );
      });

      it("$mul rejects non-numeric field", async () => {
        const doc = await db.collections.arrays.insertOne({ name: "a", tags: [], nums: [] });
        // @ts-expect-error
        await expect(db.collections.arrays.updateOne({ _id: doc._id }, { $mul: { tags: 1 } })).rejects.toThrow(
          "requires a numeric field",
        );
      });
    });

    describe("$min / $max", () => {
      it("$min updates field only if value is lower", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 10 });
        await db.collections.numeric.updateOne({ _id: doc._id }, { $min: { count: 5 } });
        const updated = await db.collections.numeric.findOne({ _id: doc._id });
        expect(updated?.count).toBe(5);
      });

      it("$min does not update when value is higher", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 10 });
        await db.collections.numeric.updateOne({ _id: doc._id }, { $min: { count: 20 } });
        const updated = await db.collections.numeric.findOne({ _id: doc._id });
        expect(updated?.count).toBe(10);
      });

      it("$max updates field only if value is higher", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 10 });
        await db.collections.numeric.updateOne({ _id: doc._id }, { $max: { count: 20 } });
        const updated = await db.collections.numeric.findOne({ _id: doc._id });
        expect(updated?.count).toBe(20);
      });

      it("$max does not update when value is lower", async () => {
        const doc = await db.collections.numeric.insertOne({ name: "a", count: 10 });
        await db.collections.numeric.updateOne({ _id: doc._id }, { $max: { count: 5 } });
        const updated = await db.collections.numeric.findOne({ _id: doc._id });
        expect(updated?.count).toBe(10);
      });
    });

    describe("$unset", () => {
      it("removes an optional field", async () => {
        const doc = await db.collections.optionals.insertOne({ name: "a", nickname: "nick" });
        await db.collections.optionals.updateOne({ _id: doc._id }, { $unset: { nickname: "" } });
        const updated = await db.collections.optionals.findOne({ _id: doc._id });
        expect(updated).not.toHaveProperty("nickname");
      });

      it("rejects non-optional field", async () => {
        const doc = await db.collections.optionals.insertOne({ name: "a" });
        // @ts-expect-error
        await expect(db.collections.optionals.updateOne({ _id: doc._id }, { $unset: { name: "" } })).rejects.toThrow(
          "requires an optional field",
        );
      });
    });

    describe("$currentDate", () => {
      it("sets date field to current date", async () => {
        const before = new Date();
        const doc = await db.collections.optionals.insertOne({ name: "a" });
        await db.collections.optionals.updateOne({ _id: doc._id }, { $currentDate: { lastSeen: true } });
        const updated = await db.collections.optionals.findOne({ _id: doc._id });
        expect(updated?.lastSeen).toBeInstanceOf(Date);
        expect(updated?.lastSeen!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });

      it("rejects non-date field", async () => {
        const doc = await db.collections.optionals.insertOne({ name: "a" });
        await expect(
          // @ts-expect-error
          db.collections.optionals.updateOne({ _id: doc._id }, { $currentDate: { name: true } }),
        ).rejects.toThrow("requires a date field");
      });

      it("rejects $type timestamp", async () => {
        const doc = await db.collections.optionals.insertOne({ name: "a" });
        await expect(
          db.collections.optionals.updateOne({ _id: doc._id }, { $currentDate: { lastSeen: { $type: "timestamp" } } }),
        ).rejects.toThrow("does not support $type 'timestamp'");
      });
    });

    describe("$rename", () => {
      it("renames optional field to type-compatible destination", async () => {
        const doc = await db.collections.optionals.insertOne({ name: "a", nickname: "nick" });
        await db.collections.optionals.updateOne({ _id: doc._id }, { $rename: { nickname: "alias" } });
        const updated = await db.collections.optionals.findOne({ _id: doc._id });
        expect(updated).not.toHaveProperty("nickname");
        expect(updated?.alias).toBe("nick");
      });

      it("rejects non-optional source field", async () => {
        const doc = await db.collections.optionals.insertOne({ name: "a" });
        await expect(
          // @ts-expect-error
          db.collections.optionals.updateOne({ _id: doc._id }, { $rename: { name: "alias" } }),
        ).rejects.toThrow("requires an optional field");
      });

      it("rejects incompatible destination type", async () => {
        const doc = await db.collections.optionals.insertOne({ name: "a", nickname: "nick" });
        await expect(
          // @ts-expect-error
          db.collections.optionals.updateOne({ _id: doc._id }, { $rename: { nickname: "lastSeen" } }),
        ).rejects.toThrow("is not compatible");
      });
    });
  });

  describe("onUpdate", () => {
    it("applies schema default update", async () => {
      const schema = createSchema("users", {
        name: string(),
        age: number(),
      }).onUpdate(() => ({ $set: { age: 100 } }));
      const db = createDatabase(client.db(), defineSchemas({ users: schema }));

      const user = await db.collections.users.insertOne({ name: "tom", age: 0 });
      const updated = await db.collections.users
        .findOneAndUpdate({ _id: user._id }, { $set: { name: "jerry" } })
        .options({ returnDocument: "after" });
      expect(updated?.age).toBe(100);
      expect(updated?.name).toBe("jerry");
    });

    it("user update takes precedence over schema default for same field", async () => {
      const schema = createSchema("users", {
        name: string(),
        age: number(),
      }).onUpdate(() => ({ $set: { age: 100 } }));
      const db = createDatabase(client.db(), defineSchemas({ users: schema }));

      const user = await db.collections.users.insertOne({ name: "tom", age: 0 });
      const updated = await db.collections.users
        .findOneAndUpdate({ _id: user._id }, { $set: { name: "jerry", age: 50 } })
        .options({ returnDocument: "after" });
      expect(updated?.age).toBe(50);
    });

    it("callback form is invoked per update", async () => {
      const onUpdateTrap = vi.fn(() => true);
      const schema = createSchema("users", {
        name: string(),
        nonce: number().validate(onUpdateTrap, ""),
      }).onUpdate(() => ({ $set: { nonce: 1 } }));
      const db = createDatabase(client.db(), defineSchemas({ users: schema }));

      const user = await db.collections.users.insertOne({ name: "tom", nonce: 0 });
      expect(onUpdateTrap).toBeCalledTimes(1);

      await db.collections.users
        .findOneAndUpdate({ _id: user._id }, { $set: { name: "jerry" } })
        .options({ returnDocument: "after" });
      expect(onUpdateTrap).toBeCalledTimes(2);
    });

    it("applies schema default on updateOne", async () => {
      const schema = createSchema("users", {
        name: string(),
        age: number(),
      }).onUpdate(() => ({ $set: { age: 555 } }));
      const db = createDatabase(client.db(), defineSchemas({ users: schema }));

      const user = await db.collections.users.insertOne({ name: "Alice", age: 0 });
      await db.collections.users.updateOne({ _id: user._id }, { $set: { name: "Bob" } });
      const updated = await db.collections.users.findOne({ _id: user._id });
      expect(updated?.age).toBe(555);
      expect(updated?.name).toBe("Bob");
    });

    it("applies schema default on updateMany", async () => {
      const schema = createSchema("users", {
        name: string(),
        age: number(),
      }).onUpdate(() => ({ $set: { age: 999 } }));
      const db = createDatabase(client.db(), defineSchemas({ users: schema }));

      await db.collections.users.insertOne({ name: "Alice", age: 1 });
      await db.collections.users.insertOne({ name: "Bob", age: 2 });
      await db.collections.users.updateMany({}, { $set: { name: "Updated" } });
      const users = await db.collections.users.find({});
      for (const user of users) {
        expect(user.age).toBe(999);
      }
    });

    it("applies schema default on findByIdAndUpdate", async () => {
      const schema = createSchema("users", {
        name: string(),
        age: number(),
      }).onUpdate(() => ({ $set: { age: 555 } }));
      const db = createDatabase(client.db(), defineSchemas({ users: schema }));

      const user = await db.collections.users.insertOne({ name: "Alice", age: 0 });
      const updated = await db.collections.users
        .findByIdAndUpdate(user._id, { $set: { name: "Bob" } })
        .options({ returnDocument: "after" });
      expect(updated?.age).toBe(555);
    });

    it("runs validation on schema default value", async () => {
      const onUpdateTrap = vi.fn(() => 1);
      const schema = createSchema("users", {
        name: string(),
        nonce: number().optional(),
      }).onUpdate(() => ({ $set: { nonce: onUpdateTrap() } }));
      const db = createDatabase(client.db(), defineSchemas({ users: schema }));

      const user = await db.collections.users.insertOne({ name: "tom" });
      expect(onUpdateTrap).toBeCalledTimes(0);

      await db.collections.users
        .findOneAndUpdate({ _id: user._id }, { $set: { name: "jerry" } })
        .options({ returnDocument: "after" });
      expect(onUpdateTrap).toBeCalledTimes(1);
    });
  });

  describe("mixed field updates", async () => {
    const MixedSchema = createSchema("mixed", {
      label: string(),
      data: mixed(),
      meta: mixed().optional(),
    });

    const db = createDatabase(client.db(), defineSchemas({ MixedSchema }));

    afterEach(async () => {
      await db.collections.mixed.deleteMany({});
    });

    it("$set mixed field with a different value", async () => {
      const doc = await db.collections.mixed.insertOne({ label: "a", data: 0 });
      await db.collections.mixed.updateOne({ _id: doc._id }, { $set: { data: "hello" } });
      const updated = await db.collections.mixed.findOne({ _id: doc._id });
      expect(updated?.data).toBe("hello");
    });

    it("$unset optional mixed field removes the field", async () => {
      const doc = await db.collections.mixed.insertOne({ label: "a", data: 1, meta: "extra" });
      await db.collections.mixed.updateOne({ _id: doc._id }, { $unset: { meta: "" } });
      const updated = await db.collections.mixed.findOne({ _id: doc._id });
      expect(updated).not.toHaveProperty("meta");
    });

    it("$unset non-optional mixed field throws", async () => {
      const doc = await db.collections.mixed.insertOne({ label: "a", data: 1 });
      await expect(
        // @ts-expect-error
        db.collections.mixed.updateOne({ _id: doc._id }, { $unset: { data: "" } }),
      ).rejects.toThrow("requires an optional field");
    });

    it("$rename optional mixed field to another optional mixed field", async () => {
      const doc = await db.collections.mixed.insertOne({ label: "a", data: 0, meta: "value" });
      await db.collections.mixed.updateOne({ _id: doc._id }, { $rename: { meta: "data" } });
      const updated = await db.collections.mixed.findOne({ _id: doc._id });
      expect(updated).not.toHaveProperty("meta");
      expect(updated?.data).toBe("value");
    });

    it("$rename non-optional mixed field throws", async () => {
      const doc = await db.collections.mixed.insertOne({ label: "a", data: 0 });
      await expect(
        // @ts-expect-error
        db.collections.mixed.updateOne({ _id: doc._id }, { $rename: { data: "info" } }),
      ).rejects.toThrow("requires an optional field");
    });

    it("$inc on a mixed field throws at runtime (runtime checks for numeric type)", async () => {
      const doc = await db.collections.mixed.insertOne({ label: "a", data: 5 });
      await expect(db.collections.mixed.updateOne({ _id: doc._id }, { $inc: { data: 1 } })).rejects.toThrow(
        "requires a numeric field",
      );
    });

    it("$push on a mixed field throws at runtime (runtime checks for array type)", async () => {
      const doc = await db.collections.mixed.insertOne({ label: "a", data: [] });
      await expect(db.collections.mixed.updateOne({ _id: doc._id }, { $push: { data: "item" } })).rejects.toThrow(
        "requires an array field",
      );
    });
  });

  describe("undefined values in update", async () => {
    const NullableSchema = createSchema("docs", {
      name: string(),
      age: number().optional(),
      nickname: string().optional(),
    });

    const db = createDatabase(client.db(), defineSchemas({ NullableSchema }));

    afterEach(async () => {
      await db.collections.docs.deleteMany({});
    });

    it("$set with undefined for an optional field is treated as omitted (no change)", async () => {
      const doc = await db.collections.docs.insertOne({ name: "alice", nickname: "ali" });
      await db.collections.docs.updateOne({ _id: doc._id }, { $set: { nickname: undefined } });
      const updated = await db.collections.docs.findOne({ _id: doc._id });
      expect(updated?.nickname).toBe("ali");
    });

    it("$set with undefined for a required field is treated as omitted (no change)", async () => {
      const doc = await db.collections.docs.insertOne({ name: "alice" });
      await db.collections.docs.updateOne({ _id: doc._id }, { $set: { name: undefined } });
      const updated = await db.collections.docs.findOne({ _id: doc._id });
      expect(updated?.name).toBe("alice");
    });

    it("omitting an optional field from $set leaves it unchanged", async () => {
      const doc = await db.collections.docs.insertOne({ name: "alice", nickname: "ali" });
      await db.collections.docs.updateOne({ _id: doc._id }, { $set: { age: 30 } });
      const updated = await db.collections.docs.findOne({ _id: doc._id });
      expect(updated?.nickname).toBe("ali");
    });

    it("$set with undefined alongside valid fields skips undefined and applies the rest", async () => {
      const doc = await db.collections.docs.insertOne({ name: "alice", age: 10 });
      await db.collections.docs.updateOne({ _id: doc._id }, { $set: { age: undefined, nickname: "ali" } });
      const fetched = await db.collections.docs.findOne({ _id: doc._id });
      expect(fetched?.nickname).toBe("ali");
      expect(fetched?.age).toBe(10);
    });
  });

  describe("combined operators", async () => {
    const ComboSchema = createSchema("combo", {
      name: string(),
      count: number(),
      tags: array(string()),
      alias: string().optional(),
    });

    const db = createDatabase(client.db(), defineSchemas({ ComboSchema }));

    afterEach(async () => {
      await db.collections.combo.deleteMany({});
    });

    it("$set and $inc in same update", async () => {
      const doc = await db.collections.combo.insertOne({ name: "a", count: 5, tags: [] });
      await db.collections.combo.updateOne({ _id: doc._id }, { $set: { name: "b" }, $inc: { count: 3 } });
      const updated = await db.collections.combo.findOne({ _id: doc._id });
      expect(updated?.name).toBe("b");
      expect(updated?.count).toBe(8);
    });

    it("$set and $push in same update", async () => {
      const doc = await db.collections.combo.insertOne({ name: "a", count: 0, tags: ["x"] });
      await db.collections.combo.updateOne({ _id: doc._id }, { $set: { name: "b" }, $push: { tags: "y" } });
      const updated = await db.collections.combo.findOne({ _id: doc._id });
      expect(updated?.name).toBe("b");
      expect(updated?.tags).toEqual(["x", "y"]);
    });

    it("$set and $unset in same update on different fields", async () => {
      const doc = await db.collections.combo.insertOne({ name: "a", count: 0, tags: [], alias: "old" });
      await db.collections.combo.updateOne({ _id: doc._id }, { $set: { name: "b" }, $unset: { alias: "" } });
      const updated = await db.collections.combo.findOne({ _id: doc._id });
      expect(updated?.name).toBe("b");
      expect(updated).not.toHaveProperty("alias");
    });

    it("$inc and $push in same update", async () => {
      const doc = await db.collections.combo.insertOne({ name: "a", count: 1, tags: [] });
      await db.collections.combo.updateOne({ _id: doc._id }, { $inc: { count: 9 }, $push: { tags: "new" } });
      const updated = await db.collections.combo.findOne({ _id: doc._id });
      expect(updated?.count).toBe(10);
      expect(updated?.tags).toEqual(["new"]);
    });
  });

  describe("upsert / $setOnInsert", async () => {
    const UpsertSchema = createSchema("docs", {
      name: string(),
      count: number(),
      tags: array(string()),
      alias: string().optional(),
    });

    const db = createDatabase(client.db(), defineSchemas({ UpsertSchema }));

    afterEach(async () => {
      await db.collections.docs.deleteMany({});
    });

    it("$setOnInsert does not apply when document already exists", async () => {
      const doc = await db.collections.docs.insertOne({ name: "existing", count: 1, tags: [] });
      await db.collections.docs
        .findOneAndUpdate(
          { _id: doc._id },
          { $set: { count: 2 }, $setOnInsert: { name: "inserted", count: 0, tags: [] } },
        )
        .options({ upsert: true });
      const updated = await db.collections.docs.findOne({ _id: doc._id });
      expect(updated?.name).toBe("existing");
      expect(updated?.count).toBe(2);
    });

    it("$setOnInsert applies when upsert creates a new document", async () => {
      const result = await db.collections.docs
        .findOneAndUpdate(
          { name: "ghost" },
          { $set: { count: 0, tags: [] }, $setOnInsert: { name: "ghost", count: 0, tags: [] } },
        )
        .options({ upsert: true, returnDocument: "after" });
      expect(result?.name).toBe("ghost");
      expect(result?.count).toBe(0);
    });

    it("$setOnInsert fields fails validation when upsert is true", async () => {
      await expect(
        db.collections.docs
          // @ts-expect-error
          .findOneAndUpdate({ name: "ghost" }, { $set: { name: "alice" }, $setOnInsert: { count: 1 } })
          .options({ upsert: true }),
      ).rejects.toThrow();
    });
  });
});
