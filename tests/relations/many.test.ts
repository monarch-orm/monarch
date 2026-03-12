import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas } from "../../src";
import { boolean, date, objectId, string } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("many relation tests", async () => {
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

  const setupSchemasAndCollections = () => {
    const UserSchema = createSchema("users", {
      name: string(),
      isAdmin: boolean(),
      createdAt: date(),
      tutor: objectId().optional(),
    });

    const PostSchema = createSchema("posts", {
      title: string(),
      contents: string(),
      author: objectId().optional(),
    });

    const BookSchema = createSchema("books", {
      title: string(),
      author: objectId().optional(),
    });

    const schemas = defineSchemas({ UserSchema, PostSchema, BookSchema });
    const relations = schemas.withRelations((s) => ({
      users: {
        tutor: s.users.$one.users({ from: "tutor", to: "_id" }),
        posts: s.users.$many.posts({ from: "_id", to: "author" }),
        books: s.users.$many.books({ from: "_id", to: "author" }),
      },
      posts: {
        author: s.posts.$one.users({ from: "author", to: "_id" }),
      },
      books: {
        author: s.books.$one.users({ from: "author", to: "_id" }),
      },
    }));
    return createDatabase(client.db(), relations);
  };

  it("should populate many relation (posts)", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users.insertOne({
      name: "Bob",
      isAdmin: false,
      createdAt: new Date(),
      tutor: undefined,
    });
    await collections.users.insertOne({
      name: "Alexa",
      isAdmin: false,
      createdAt: new Date(),
      tutor: user._id,
    });
    await collections.posts.insertOne({
      title: "Pilot",
      contents: "Lorem",
      author: user._id,
    });

    await collections.posts.insertOne({
      title: "Pilot 2",
      contents: "Lorem2",
      author: user._id,
    });

    await collections.posts.insertOne({
      title: "No Author",
      contents: "Lorem",
    });

    const populatedUsers = await collections.users.find().populate({ posts: true, tutor: true });

    expect(populatedUsers.length).toBe(2);
    expect(populatedUsers[0].posts.length).toBe(2);
    expect(populatedUsers[1].posts.length).toBe(0);
    expect(populatedUsers[1].tutor).toStrictEqual(user);
  });

  it("should handle multiple many relations with same field", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users.insertOne({
      name: "Test User",
      isAdmin: false,
      createdAt: new Date(),
    });
    await collections.posts.insertOne({
      title: "Post 1",
      contents: "Content 1",
      author: user._id,
    });

    await collections.books.insertOne({
      title: "Book 1",
      author: user._id,
    });

    const populatedUser = await collections.users.findById(user._id).populate({ posts: true, books: true });

    expect(populatedUser).toBeTruthy();
    expect(populatedUser?.posts).toHaveLength(1);
    expect(populatedUser?.books).toHaveLength(1);
    expect(populatedUser?.posts?.[0]?.title).toBe("Post 1");
    expect(populatedUser?.books?.[0]?.title).toBe("Book 1");
  });

  it("should handle deep nested populations with many relations", async () => {
    const PostSchemaWithEditor = createSchema("posts", {
      title: string(),
      contents: string(),
      author: objectId().optional(),
      editor: objectId().optional(),
    });

    const UserSchemaForEditor = createSchema("users", {
      name: string(),
      isAdmin: boolean(),
      createdAt: date(),
    });

    const BookSchemaDeep = createSchema("books", {
      title: string(),
      author: objectId().optional(),
    });

    const schemas = defineSchemas({ UserSchemaForEditor, PostSchemaWithEditor, BookSchemaDeep });
    const relations = schemas.withRelations((s) => ({
      users: {
        posts: s.users.$many.posts({ from: "_id", to: "author" }),
        books: s.users.$many.books({ from: "_id", to: "author" }),
      },
      posts: {
        author: s.posts.$one.users({ from: "author", to: "_id" }),
        editor: s.posts.$one.users({ from: "editor", to: "_id" }),
      },
    }));
    const db = createDatabase(client.db(), relations);

    const user = await db.collections.users.insertOne({
      name: "Test User",
      isAdmin: false,
      createdAt: new Date(),
    });
    const user2 = await db.collections.users.insertOne({
      name: "Test User 2",
      isAdmin: false,
      createdAt: new Date(),
    });
    await db.collections.posts.insertOne({
      title: "Post 1",
      contents: "Content 1",
      author: user._id,
      editor: user2._id,
    });

    await db.collections.posts.insertOne({
      title: "Post 2",
      contents: "Content 2",
      author: user2._id,
      editor: user2._id,
    });

    await db.collections.books.insertOne({
      title: "Book 1",
      author: user._id,
    });

    const populatedUser = await db.collections.users.findById(user._id).populate({
      posts: {
        populate: {
          editor: {
            populate: {
              posts: true,
            },
          },
        },
      },
      books: true,
    });
    expect(populatedUser).toBeTruthy();
    expect(populatedUser?.posts).toHaveLength(1);
    expect(populatedUser?.books).toHaveLength(1);
    expect(populatedUser?.posts?.[0]?.title).toBe("Post 1");
    expect(populatedUser?.posts?.[0]?.editor?.posts).toHaveLength(1);
    expect(populatedUser?.books?.[0]?.title).toBe("Book 1");
  });
});
