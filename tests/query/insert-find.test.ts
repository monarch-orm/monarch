import { ObjectId } from "mongodb";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema } from "../../src";
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

  const { collections } = createDatabase(client.db(), {
    users: UserSchema,
    todos: TodoSchema,
  });

  beforeAll(async () => {
    await client.connect();
  });

  afterEach(async () => {
    await collections.users.deleteMany({});
    await collections.todos.deleteMany({});
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

    it("supports promise resolution without exec", async () => {
      const newUser = await collections.users.insertOne(mockUsers[0]);
      expect(newUser).toMatchObject(mockUsers[0]);
    });

    it("rejects invalid ObjectId string", async () => {
      await expect(async () => {
        await collections.users.insertOne({ _id: "not_an_object_id", ...mockUsers[0] });
      }).rejects.toThrowError("expected 'ObjectId'");
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

    it("strips extra fields not in schema", async () => {
      const user = await collections.users.insertOne({
        name: "Extra",
        email: "extra@example.com",
        age: 40,
        isVerified: true,
        extraField: "This should be ignored",
      } as any);
      expect(user).not.toBe(null);
      expect(user).not.toHaveProperty("extraField");
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
