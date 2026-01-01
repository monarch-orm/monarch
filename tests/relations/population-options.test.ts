import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createRelations, createSchema, virtual } from "../../src";
import { array, boolean, date, objectId, string } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("Population Options", async () => {
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
    });

    const PostSchema = createSchema("posts", {
      title: string(),
      contents: string(),
      author: objectId().optional(),
      contributors: array(objectId()).optional().default([]),
      secret: string().default(() => "secret"),
    })
      .omit({ secret: true })
      .virtuals({
        contributorsCount: virtual("contributors", ({ contributors }) => contributors?.length ?? 0),
        secretSize: virtual("secret", ({ secret }) => secret?.length),
      });

    const UserSchemaRelations = createRelations(UserSchema, ({ ref }) => ({
      posts: ref(PostSchema, { field: "_id", references: "author" }),
    }));

    const PostSchemaRelations = createRelations(PostSchema, ({ one, many }) => ({
      author: one(UserSchema, { field: "author", references: "_id" }),
      contributors: many(UserSchema, {
        field: "contributors",
        references: "_id",
      }),
    }));

    return createDatabase(client.db(), {
      users: UserSchema,
      posts: PostSchema,
      UserSchemaRelations,
      PostSchemaRelations,
    });
  };

  it("should populate with limit and skip options", async () => {
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

    await collections.posts
      .insertOne({
        title: "Post 2",
        contents: "Content 2",
        author: user._id,
      })
      .exec();

    const populatedUser = await collections.users
      .find()
      .populate({ posts: { limit: 1, skip: 0 } })
      .exec();

    expect(populatedUser.length).toBe(1);
    expect(populatedUser[0].posts.length).toBe(1);
    expect(populatedUser[0].posts[0].title).toBe("Post 1");
  });

  it("should populate with default omit option", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users
      .insertOne({
        name: "Test User 2",
        isAdmin: false,
        createdAt: new Date(),
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Post 3",
        contents: "Content 3",
        author: user._id,
      })
      .exec();

    const populatedUser = await collections.users
      .find()
      .populate({
        posts: true,
      })
      .exec();

    expect(populatedUser.length).toBe(1);
    expect(populatedUser[0].posts.length).toBe(1);
    expect(populatedUser[0].posts[0]).toHaveProperty("contents");
    expect(populatedUser[0].posts[0]).not.toHaveProperty("secret");
  });

  it("should populate with omit option", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users
      .insertOne({
        name: "Test User 2",
        isAdmin: false,
        createdAt: new Date(),
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Post 3",
        contents: "Content 3",
        author: user._id,
      })
      .exec();

    const populatedUser = await collections.users
      .find()
      .populate({
        posts: {
          omit: { title: true },
        },
      })
      .exec();

    expect(populatedUser.length).toBe(1);
    expect(populatedUser[0].posts.length).toBe(1);
    expect(populatedUser[0].posts[0]).toHaveProperty("secret");
    expect(populatedUser[0].posts[0]).not.toHaveProperty("title");
  });

  it("should populate with select option", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users
      .insertOne({
        name: "Test User 2",
        isAdmin: false,
        createdAt: new Date(),
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Post 3",
        contents: "Content 3",
        author: user._id,
      })
      .exec();

    const populatedUser = await collections.users
      .find()
      .populate({
        posts: {
          select: { title: true },
        },
      })
      .exec();

    expect(populatedUser.length).toBe(1);
    expect(populatedUser[0].posts.length).toBe(1);
    expect(populatedUser[0].posts[0]).toHaveProperty("title");
    expect(populatedUser[0].posts[0]).not.toHaveProperty("contents");
    expect(populatedUser[0].posts[0]).not.toHaveProperty("secret");
  });

  it("should populate with sort option", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users
      .insertOne({
        name: "Test User 5",
        isAdmin: false,
        createdAt: new Date(),
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Post 6",
        contents: "Content 6",
        author: user._id,
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Post 7",
        contents: "Content 7",
        author: user._id,
      })
      .exec();

    const populatedUser = await collections.users
      .find()
      .populate({
        posts: {
          sort: { title: -1 },
        },
      })
      .exec();

    expect(populatedUser.length).toBe(1);
    expect(populatedUser[0].posts.length).toBe(2);
    expect(populatedUser[0].posts[0]).toHaveProperty("title", "Post 7");
    expect(populatedUser[0].posts[1]).toHaveProperty("title", "Post 6");
  });
});
