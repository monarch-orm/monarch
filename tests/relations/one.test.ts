import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas } from "../../src";
import { array, boolean, date, objectId, string } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("one relation tests", async () => {
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
      editor: objectId().optional(),
      contributors: array(objectId()).optional().default([]),
    });

    const schemas = defineSchemas({ UserSchema, PostSchema });
    const relations = schemas.withRelations((s) => ({
      users: {
        tutor: s.users.$one.users({ from: "tutor", to: "_id" }),
      },
      posts: {
        author: s.posts.$one.users({ from: "author", to: "_id" }),
        editor: s.posts.$one.users({ from: "editor", to: "_id" }),
        contributors: s.posts.$refs.users({ from: "contributors", to: "_id" }),
      },
    }));
    return createDatabase(client.db(), relations);
  };

  it("should populate one relation (tutor)", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users.insertOne({
      name: "Bob",
      isAdmin: false,
      createdAt: new Date(),
    });
    const user2 = await collections.users.insertOne({
      name: "Alex",
      isAdmin: false,
      tutor: user._id,
      createdAt: new Date(),
    });
    const populatedUser2 = await collections.users.findById(user2._id).populate({ tutor: true });

    expect(populatedUser2).toStrictEqual({
      ...user2,
      tutor: user,
    });
  });

  it("should populate one relation (author)", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users.insertOne({
      name: "Bob",
      isAdmin: false,
      createdAt: new Date(),
    });
    await collections.posts.insertOne({
      title: "Pilot",
      contents: "Lorem",
      author: user._id,
    });

    const populatedPost = await collections.posts
      .findOne({
        title: "Pilot",
      })
      .populate({ author: true });
    expect(populatedPost?.author).toStrictEqual(user);
  });

  it("should support nested one relation population", async () => {
    const UserSchemaWithRefs = createSchema("users", {
      name: string(),
      isAdmin: boolean(),
      createdAt: date(),
      tutor: objectId().optional(),
    });

    const PostSchemaWithRefs = createSchema("posts", {
      title: string(),
      contents: string(),
      author: objectId().optional(),
    });

    const schemas = defineSchemas({ UserSchemaWithRefs, PostSchemaWithRefs });
    const relations = schemas.withRelations((s) => ({
      users: {
        tutor: s.users.$one.users({ from: "tutor", to: "_id" }),
        posts: s.users.$many.posts({ from: "_id", to: "author" }),
      },
      posts: {
        author: s.posts.$one.users({ from: "author", to: "_id" }),
      },
    }));
    const db = createDatabase(client.db(), relations);

    // Create users with tutor relationship
    const tutor = await db.collections.users.insertOne({
      name: "Master Tutor",
      isAdmin: true,
      createdAt: new Date(),
    });
    const author = await db.collections.users.insertOne({
      name: "Student Author",
      isAdmin: false,
      createdAt: new Date(),
      tutor: tutor._id,
    });
    // Create posts for both users
    await db.collections.posts.insertOne({
      title: "Tutor's Post",
      contents: "Wisdom",
      author: tutor._id,
    });

    const studentPost = await db.collections.posts.insertOne({
      title: "Student's Post",
      contents: "Learning",
      author: author._id,
    });
    // Test nested population
    const populatedPost = await db.collections.posts
      .findById(studentPost._id)
      .select({ contents: true })
      .populate({
        author: {
          omit: {
            tutor: true,
            isAdmin: true,
          },
          populate: {
            tutor: true,
            posts: true,
          },
        },
      });
    // Verify the nested population results
    expect(populatedPost).toBeTruthy();
    expect(populatedPost?.author).toBeTruthy();
    expect(populatedPost?.author?.name).toBe("Student Author");
    // @ts-ignore
    expect(populatedPost?.author?.isAdmin).toBe(undefined);
    expect(populatedPost?.author?.tutor).toBeTruthy();
    expect(populatedPost?.author?.tutor?.name).toBe("Master Tutor");
    expect(populatedPost?.author?.posts).toHaveLength(1);
    expect(populatedPost?.author?.posts[0].title).toBe("Student's Post");
  });
});
