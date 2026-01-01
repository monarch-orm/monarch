import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createRelations, createSchema } from "../../src";
import { array, boolean, date, objectId, string } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("one() relation tests", async () => {
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

    const UserSchemaRelations = createRelations(UserSchema, ({ one }) => ({
      tutor: one(UserSchema, { field: "tutor", references: "_id" }),
    }));

    const PostSchemaRelations = createRelations(PostSchema, ({ one, many }) => ({
      author: one(UserSchema, { field: "author", references: "_id" }),
      editor: one(UserSchema, { field: "editor", references: "_id" }),
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

  it("should populate one() relation (tutor)", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users
      .insertOne({
        name: "Bob",
        isAdmin: false,
        createdAt: new Date(),
      })
      .exec();

    const user2 = await collections.users
      .insertOne({
        name: "Alex",
        isAdmin: false,
        tutor: user._id,
        createdAt: new Date(),
      })
      .exec();

    const populatedUser2 = await collections.users.findById(user2._id).populate({ tutor: true }).exec();

    expect(populatedUser2).toStrictEqual({
      ...user2,
      tutor: user,
    });
  });

  it("should populate one() relation (author)", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users
      .insertOne({
        name: "Bob",
        isAdmin: false,
        createdAt: new Date(),
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Pilot",
        contents: "Lorem",
        author: user._id,
      })
      .exec();

    const populatedPost = await collections.posts
      .findOne({
        title: "Pilot",
      })
      .populate({ author: true })
      .exec();

    expect(populatedPost?.author).toStrictEqual(user);
  });

  it("should support nested one() relation population", async () => {
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

    const UserRelations = createRelations(UserSchemaWithRefs, ({ one, ref }) => ({
      tutor: one(UserSchemaWithRefs, { field: "tutor", references: "_id" }),
      posts: ref(PostSchemaWithRefs, { field: "_id", references: "author" }),
    }));

    const PostRelations = createRelations(PostSchemaWithRefs, ({ one }) => ({
      author: one(UserSchemaWithRefs, { field: "author", references: "_id" }),
    }));

    const db = createDatabase(client.db(), {
      users: UserSchemaWithRefs,
      posts: PostSchemaWithRefs,
      UserRelations,
      PostRelations,
    });

    // Create users with tutor relationship
    const tutor = await db.collections.users
      .insertOne({
        name: "Master Tutor",
        isAdmin: true,
        createdAt: new Date(),
      })
      .exec();

    const author = await db.collections.users
      .insertOne({
        name: "Student Author",
        isAdmin: false,
        createdAt: new Date(),
        tutor: tutor._id,
      })
      .exec();

    // Create posts for both users
    await db.collections.posts
      .insertOne({
        title: "Tutor's Post",
        contents: "Wisdom",
        author: tutor._id,
      })
      .exec();

    const studentPost = await db.collections.posts
      .insertOne({
        title: "Student's Post",
        contents: "Learning",
        author: author._id,
      })
      .exec();

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
      })
      .exec();

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
