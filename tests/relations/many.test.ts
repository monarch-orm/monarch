import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createRelations, createSchema, virtual } from "../../src";
import { array, boolean, date, objectId, string } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("many() relation tests", async () => {
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
      PostSchemaRelations,
    });
  };

  it("should populate many() relation (contributors)", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users
      .insertOne({
        name: "Bob",
        isAdmin: false,
        createdAt: new Date(),
      })
      ;

    const user2 = await collections.users
      .insertOne({
        name: "Alex",
        isAdmin: false,
        createdAt: new Date(),
      })
      ;

    await collections.posts
      .insertOne({
        title: "Pilot",
        contents: "Lorem",
        author: user._id,
        contributors: [user2._id],
      })
      ;

    const populatedPost = await collections.posts
      .findOne({
        title: "Pilot",
      })
      .populate({ contributors: true })
      ;

    expect(populatedPost?.contributors).toBeDefined();
    expect(populatedPost?.contributors).toHaveLength(1);
    expect(populatedPost?.contributors[0]).toStrictEqual(user2);
  });

  it("should populate many() relation with multiple contributors", async () => {
    const { collections } = setupSchemasAndCollections();

    const user1 = await collections.users
      .insertOne({
        name: "Bob",
        isAdmin: false,
        createdAt: new Date(),
      })
      ;

    const user2 = await collections.users
      .insertOne({
        name: "Alex",
        isAdmin: false,
        createdAt: new Date(),
      })
      ;

    const user3 = await collections.users
      .insertOne({
        name: "Charlie",
        isAdmin: false,
        createdAt: new Date(),
      })
      ;

    await collections.posts
      .insertOne({
        title: "Multi Author Post",
        contents: "Content",
        author: user1._id,
        contributors: [user2._id, user3._id],
      })
      ;

    const populatedPost = await collections.posts
      .findOne({
        title: "Multi Author Post",
      })
      .populate({ contributors: true, author: true })
      ;

    expect(populatedPost?.author).toStrictEqual(user1);
    expect(populatedPost?.contributors).toBeDefined();
    expect(populatedPost?.contributors).toHaveLength(2);
    expect(populatedPost?.contributors[0]).toStrictEqual(user2);
    expect(populatedPost?.contributors[1]).toStrictEqual(user3);
  });

  it("should access original many() field in virtuals", async () => {
    const { collections } = setupSchemasAndCollections();

    const user1 = await collections.users
      .insertOne({
        name: "Test User 1",
        isAdmin: false,
        createdAt: new Date(),
      })
      ;

    const user2 = await collections.users
      .insertOne({
        name: "Test User 2",
        isAdmin: false,
        createdAt: new Date(),
      })
      ;

    await collections.posts
      .insertOne({
        title: "Post 6",
        contents: "Content 6",
        contributors: [user1._id, user2._id],
        secret: "12345",
      })
      ;

    const populatedPost = await collections.posts
      .find()
      .populate({
        contributors: {
          select: { name: true },
        },
      })
      ;

    expect(populatedPost.length).toBe(1);
    expect(populatedPost[0].contributorsCount).toBe(2);
    expect(populatedPost[0].contributors.length).toBe(2);
    expect(populatedPost[0].contributors[0]).toStrictEqual({
      _id: user1._id,
      name: user1.name,
    });
    expect(populatedPost[0].contributors[1]).toStrictEqual({
      _id: user2._id,
      name: user2.name,
    });
    expect(populatedPost[0].secretSize).toBe(5);
    expect(populatedPost[0]).not.toHaveProperty("secret");
  });
});
