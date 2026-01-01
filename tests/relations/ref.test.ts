import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createRelations, createSchema } from "../../src";
import { boolean, date, objectId, string } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("ref() relation tests", async () => {
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

    const UserSchemaRelations = createRelations(UserSchema, ({ one, ref }) => ({
      tutor: one(UserSchema, { field: "tutor", references: "_id" }),
      posts: ref(PostSchema, { field: "_id", references: "author" }),
      books: ref(BookSchema, { field: "_id", references: "author" }),
    }));

    const PostSchemaRelations = createRelations(PostSchema, ({ one }) => ({
      author: one(UserSchema, { field: "author", references: "_id" }),
    }));

    const BookSchemaRelations = createRelations(BookSchema, ({ one }) => ({
      author: one(UserSchema, { field: "author", references: "_id" }),
    }));

    return createDatabase(client.db(), {
      users: UserSchema,
      posts: PostSchema,
      books: BookSchema,
      UserSchemaRelations,
      PostSchemaRelations,
      BookSchemaRelations,
    });
  };

  it("should populate ref() relation (posts)", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users
      .insertOne({
        name: "Bob",
        isAdmin: false,
        createdAt: new Date(),
        tutor: undefined,
      })
      .exec();

    const tutoredUser = await collections.users
      .insertOne({
        name: "Alexa",
        isAdmin: false,
        createdAt: new Date(),
        tutor: user._id,
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Pilot",
        contents: "Lorem",
        author: user._id,
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Pilot 2",
        contents: "Lorem2",
        author: user._id,
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "No Author",
        contents: "Lorem",
      })
      .exec();

    const populatedUsers = await collections.users.find().populate({ posts: true, tutor: true }).exec();

    expect(populatedUsers.length).toBe(2);
    expect(populatedUsers[0].posts.length).toBe(2);
    expect(populatedUsers[1].posts.length).toBe(0);
    expect(populatedUsers[1].tutor).toStrictEqual(user);
  });

  it("should handle multiple ref() relations with same field", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users
      .insertOne({
        name: "Test User",
        isAdmin: false,
        createdAt: new Date(),
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Post 1",
        contents: "Content 1",
        author: user._id,
      })
      .exec();

    await collections.books
      .insertOne({
        title: "Book 1",
        author: user._id,
      })
      .exec();

    const populatedUser = await collections.users.findById(user._id).populate({ posts: true, books: true }).exec();

    expect(populatedUser).toBeTruthy();
    expect(populatedUser?.posts).toHaveLength(1);
    expect(populatedUser?.books).toHaveLength(1);
    expect(populatedUser?.posts?.[0]?.title).toBe("Post 1");
    expect(populatedUser?.books?.[0]?.title).toBe("Book 1");
  });

  it("should handle deep nested populations with ref() relations", async () => {
    const PostSchemaWithEditor = createSchema("posts_deep", {
      title: string(),
      contents: string(),
      author: objectId().optional(),
      editor: objectId().optional(),
    });

    const UserSchemaForEditor = createSchema("users_deep", {
      name: string(),
      isAdmin: boolean(),
      createdAt: date(),
    });

    const BookSchemaDeep = createSchema("books_deep", {
      title: string(),
      author: objectId().optional(),
    });

    const UserRelationsEditor = createRelations(UserSchemaForEditor, ({ ref }) => ({
      posts: ref(PostSchemaWithEditor, { field: "_id", references: "author" }),
      books: ref(BookSchemaDeep, { field: "_id", references: "author" }),
    }));

    const PostRelationsEditor = createRelations(PostSchemaWithEditor, ({ one }) => ({
      author: one(UserSchemaForEditor, { field: "author", references: "_id" }),
      editor: one(UserSchemaForEditor, { field: "editor", references: "_id" }),
    }));

    const db = createDatabase(client.db(), {
      users: UserSchemaForEditor,
      posts: PostSchemaWithEditor,
      books: BookSchemaDeep,
      UserRelationsEditor,
      PostRelationsEditor,
    });

    const user = await db.collections.users
      .insertOne({
        name: "Test User",
        isAdmin: false,
        createdAt: new Date(),
      })
      .exec();

    const user2 = await db.collections.users
      .insertOne({
        name: "Test User 2",
        isAdmin: false,
        createdAt: new Date(),
      })
      .exec();

    await db.collections.posts
      .insertOne({
        title: "Post 1",
        contents: "Content 1",
        author: user._id,
        editor: user2._id,
      })
      .exec();

    await db.collections.posts
      .insertOne({
        title: "Post 2",
        contents: "Content 2",
        author: user2._id,
        editor: user2._id,
      })
      .exec();

    await db.collections.books
      .insertOne({
        title: "Book 1",
        author: user._id,
      })
      .exec();

    const populatedUser = await db.collections.users
      .findById(user._id)
      .populate({
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
      })
      .exec();

    expect(populatedUser).toBeTruthy();
    expect(populatedUser?.posts).toHaveLength(1);
    expect(populatedUser?.books).toHaveLength(1);
    expect(populatedUser?.posts?.[0]?.title).toBe("Post 1");
    expect(populatedUser?.posts?.[0]?.editor?.posts).toHaveLength(1);
    expect(populatedUser?.books?.[0]?.title).toBe("Book 1");
  });
});
