import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createRelations, createSchema } from "../../src";
import { boolean, date, objectId, string } from "../../src/types";
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

  it("should throw error when relation target schema is not initialized", async () => {
    const UserSchema = createSchema("users", {
      name: string(),
      isAdmin: boolean(),
      createdAt: date(),
    });

    const UserSchemaRelations = createRelations(UserSchema, ({ ref }) => ({
      posts: ref(undefined as any, { field: "_id", references: "author" }),
    }));

    const db = createDatabase(client.db(), {
      users: UserSchema,
      UserSchemaRelations,
    });

    await expect(async () => {
      await db.collections.users.find().populate({ posts: true }).exec();
    }).rejects.toThrowError("Target schema not found for relation 'posts' in schema 'users'");
  });

  it("should throw error when schema has no relations defined", async () => {
    const UserSchema = createSchema("users", {
      name: string(),
      isAdmin: boolean(),
      createdAt: date(),
    });

    const db = createDatabase(client.db(), {
      users: UserSchema,
    });

    await expect(async () => {
      await db.collections.users.find().populate({ posts: true }).exec();
    }).rejects.toThrowError("No relations found for schema 'users'");
  });

  it("throws error when defining relations for the same schema multiple times", () => {
    const UserSchema = createSchema("users", {
      name: string(),
      isAdmin: boolean(),
      createdAt: date(),
    });

    const PostSchema = createSchema("posts", {
      title: string(),
      author: objectId().optional(),
    });

    const UserRelations1 = createRelations(UserSchema, ({ ref }) => ({
      posts: ref(PostSchema, { field: "_id", references: "author" }),
    }));

    const UserRelations2 = createRelations(UserSchema, ({ ref }) => ({
      books: ref(PostSchema, { field: "_id", references: "author" }),
    }));

    expect(() => {
      createDatabase(client.db(), {
        users: UserSchema,
        posts: PostSchema,
        UserRelations1,
        UserRelations2,
      });
    }).toThrowError("Relations for schema 'users' already exists.");
  });
});
