import { ObjectId } from "mongodb";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas } from "../../src";
import { boolean, number, objectId, string } from "../../src/types";
import { createMockDatabase, mockUsers } from "../mock";

describe("Insert and Find Operations", async () => {
  const { server, client } = await createMockDatabase();

  const UserSchema = createSchema("users", {
    name: string().optional(),
    email: string().lowercase().optional(),
    age: number().optional().default(10),
    isVerified: boolean().default(false),
  });

  const TodoSchema = createSchema("todos", {
    _id: number(),
    title: string(),
    userId: objectId(),
  });

  const ExplicitObjectIdSchema = createSchema("explicitObjectIds", {
    _id: objectId(),
    name: string(),
  });

  const ExplicitStringIdSchema = createSchema("explicitStringIds", {
    _id: string(),
    name: string(),
  });

  const { collections } = createDatabase(
    client.db(),
    defineSchemas({
      UserSchema,
      TodoSchema,
      ExplicitObjectIdSchema,
      ExplicitStringIdSchema,
    }),
  );

  beforeAll(async () => {
    await client.connect();
  });

  afterEach(async () => {
    await collections.users.deleteMany({});
    await collections.todos.deleteMany({});
    await collections.explicitObjectIds.deleteMany({});
    await collections.explicitStringIds.deleteMany({});
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  describe("Insert Operations", () => {
    it("inserts one document with auto-generated ObjectId", async () => {
      const newUser1 = await collections.users.insertOne(mockUsers[0]);
      expect(newUser1).toMatchObject(mockUsers[0]);
      expect(newUser1._id).toBeDefined();
      expect(newUser1._id).toBeInstanceOf(ObjectId);

      const newUser2 = await collections.users.insertOne(mockUsers[0]);
      expect(newUser2).toMatchObject(mockUsers[0]);
      expect(newUser2._id).toBeDefined();
      expect(newUser2._id).toBeInstanceOf(ObjectId);
      expect(newUser2._id).not.toStrictEqual(newUser1._id);
    });

    it("inserts one document with provided ObjectId", async () => {
      const id = new ObjectId();
      const newUser = await collections.users.insertOne({ _id: id, ...mockUsers[0] });
      expect(newUser).toMatchObject(mockUsers[0]);
      expect(newUser._id).toStrictEqual(id);
    });

    it("inserts one document with string ObjectId", async () => {
      const id = new ObjectId();
      const newUser = await collections.users.insertOne({ _id: id.toString(), ...mockUsers[0] });
      expect(newUser).toMatchObject(mockUsers[0]);
      expect(newUser._id).toStrictEqual(id);
    });

    it("rejects invalid ObjectId string", async () => {
      await expect(async () => {
        await collections.users.insertOne({ _id: "not_an_object_id", ...mockUsers[0] });
      }).rejects.toThrowError("expected 'ObjectId'");
    });

    describe("explicit ObjectId _id", () => {
      it("allows omitting _id", async () => {
        const inserted = await collections.explicitObjectIds.insertOne({
          name: "Alice",
        });

        expect(inserted._id).toBeInstanceOf(ObjectId);
        expect(inserted.name).toBe("Alice");

        const retrieved = await collections.explicitObjectIds.findById(inserted._id);
        expect(retrieved).toStrictEqual(inserted);
      });

      it("accepts _id provided as ObjectId", async () => {
        const id = new ObjectId();

        const inserted = await collections.explicitObjectIds.insertOne({
          _id: id,
          name: "Alice",
        });

        expect(inserted._id).toStrictEqual(id);
        expect(inserted.name).toBe("Alice");

        const retrieved = await collections.explicitObjectIds.findOne({ _id: id });
        expect(retrieved).toStrictEqual(inserted);
      });

      it("accepts _id provided as string", async () => {
        const id = new ObjectId();

        const inserted = await collections.explicitObjectIds.insertOne({
          _id: id.toString(),
          name: "Alice",
        });

        expect(inserted._id).toStrictEqual(id);
        expect(inserted.name).toBe("Alice");

        const retrieved = await collections.explicitObjectIds.findById(id.toString());
        expect(retrieved).toStrictEqual(inserted);
      });
    });

    describe("explicit nullable ObjectId _id", () => {
      it("rejects nullable _id schema definitions", () => {
        expect(() =>
          createSchema("explicitNullableObjectIds", {
            _id: objectId().nullable(),
            name: string(),
          }),
        ).toThrowError("schema _id cannot be nullable");
      });
    });

    describe("explicit non-ObjectId _id", () => {
      it("rejects optional non-ObjectId _id schema definitions", () => {
        expect(() =>
          createSchema("explicitOptionalStringIds", {
            _id: string().optional(),
            name: string(),
          }),
        ).toThrowError("schema _id may only be optional when it is objectId()");
      });

      it("requires _id when omitted", async () => {
        await expect(async () => {
          // @ts-expect-error
          await collections.explicitStringIds.insertOne({
            name: "Alice",
          });
        }).rejects.toThrowError("expected 'string'");
      });

      it("accepts _id when provided", async () => {
        const inserted = await collections.explicitStringIds.insertOne({
          _id: "alice-1",
          name: "Alice",
        });

        expect(inserted._id).toBe("alice-1");
        expect(inserted.name).toBe("Alice");
      });
    });

    it("inserts empty document with default values", async () => {
      const emptyUser = await collections.users.insertOne({});
      expect(emptyUser).not.toBe(null);
      expect(emptyUser.age).toBe(10);
      expect(emptyUser.isVerified).toBe(false);
    });

    it("applies transformations on insert", async () => {
      const user = await collections.users.insertOne({
        name: "Test",
        email: "TEST@EXAMPLE.COM",
        age: 30,
        isVerified: true,
      });
      expect(user).not.toBe(null);
      expect(user.email).toBe("test@example.com");
    });

    it("rejects extra fields not in schema", async () => {
      await expect(async () => {
        const user = await collections.users.insertOne({
          name: "Extra",
          email: "extra@example.com",
          age: 40,
          isVerified: true,
          // @ts-expect-error
          extraField: "This should error",
        });
      }).rejects.toThrowError();
    });

    it("inserts many documents", async () => {
      const newUsers = await collections.users.insertMany(mockUsers);
      expect(newUsers.insertedCount).toBe(mockUsers.length);
    });

    it("bulk writes", async () => {
      const bulkWriteResult = await collections.users.bulkWrite([
        {
          insertOne: {
            document: {
              name: "bulk1",
              email: "bulk1@gmail.com",
              age: 22,
              isVerified: false,
            },
          },
        },
        {
          insertOne: {
            document: {
              name: "bulk2",
              email: "bulk2@gmail.com",
              age: 23,
              isVerified: true,
            },
          },
        },
      ]);
      expect(bulkWriteResult.insertedCount).toBe(2);
    });
  });

  describe("Find Operations", () => {
    it("finds documents", async () => {
      await collections.users.insertMany(mockUsers);
      const users = await collections.users.find();
      expect(users.length).toBeGreaterThanOrEqual(3);
    });

    it("finds documents with cursor", async () => {
      await collections.users.insertMany(mockUsers);

      const users1 = await collections.users.find().cursor();
      expect(await users1.next()).toMatchObject(mockUsers[0]);
      expect(await users1.next()).toMatchObject(mockUsers[1]);
      expect(await users1.next()).toMatchObject(mockUsers[2]);
      expect(await users1.next()).toBe(null);

      const users2 = await collections.users.find().cursor();
      let i = 0;
      for await (const user of users2) {
        expect(user).toMatchObject(mockUsers[i++]);
      }
    });

    it("finds one document without filter", async () => {
      await collections.users.insertOne(mockUsers[0]);
      const user = await collections.users.findOne({});
      expect(user).toStrictEqual(expect.objectContaining(mockUsers[0]));
    });

    it("finds one document with ObjectId filter", async () => {
      const userId = new ObjectId();
      await collections.users.insertOne({ _id: userId, ...mockUsers[0] });

      const user = await collections.users.findOne({ _id: userId });
      expect(user).toStrictEqual({ _id: userId, ...mockUsers[0] });
    });

    it("does not find document when using string instead of ObjectId in filter", async () => {
      const userId = new ObjectId();
      await collections.users.insertOne({ _id: userId, ...mockUsers[0] });

      const user = await collections.users
        //@ts-expect-error
        .findOne({ _id: userId.toString() });
      expect(user).toBe(null);
    });

    it("finds one document with non-ObjectId primary key", async () => {
      const todoId = 1;
      const userId = new ObjectId();
      await collections.todos.insertOne({ _id: todoId, title: "todo 1", userId });

      const todo = await collections.todos.findOne({ _id: todoId });
      expect(todo).toStrictEqual({ _id: todoId, title: "todo 1", userId });
    });

    it("finds one document by ObjectId", async () => {
      const userId = new ObjectId();
      await collections.users.insertOne({ _id: userId, ...mockUsers[0] });

      const user = await collections.users.findById(userId);
      expect(user).toStrictEqual({ _id: userId, ...mockUsers[0] });
    });

    it("finds one document by ObjectId string", async () => {
      const userId = new ObjectId();
      await collections.users.insertOne({ _id: userId, ...mockUsers[0] });

      const user = await collections.users.findById(userId.toString());
      expect(user).toStrictEqual({ _id: userId, ...mockUsers[0] });
    });

    it("rejects invalid ObjectId string in findById", async () => {
      await expect(async () => {
        await collections.users.findById("not_an_object_id");
      }).rejects.toThrowError();
    });

    it("finds one document by non-ObjectId primary key", async () => {
      const todoId = 1;
      const userId = new ObjectId();
      await collections.todos.insertOne({ _id: todoId, title: "todo 1", userId });

      const todo = await collections.todos.findById(todoId);
      expect(todo).toStrictEqual({ _id: todoId, title: "todo 1", userId });
    });

    it("returns null when document not found by id", async () => {
      const todoId = 1;
      const userId = new ObjectId();
      await collections.todos.insertOne({ _id: todoId, title: "todo 1", userId });

      const todo = await collections.todos.findById(todoId + 1);
      expect(todo).toBe(null);
    });

    it("gets distinct values", async () => {
      await collections.users.insertOne(mockUsers[0]);
      const distinctEmails = await collections.users.distinct("age");
      expect(distinctEmails).not.toBe(null);
    });

    it("countDocuments", async () => {
      await collections.users.insertMany(mockUsers);
      const count = await collections.users.countDocuments();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("estimatedDocumentCount", async () => {
      await collections.users.insertMany(mockUsers);
      const estimatedCount = await collections.users.estimatedDocumentCount();
      expect(estimatedCount).toBe(3);
    });
  });
});
