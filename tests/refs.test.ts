import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createRelations, createSchema, virtual } from "../src";
import { array, boolean, date, objectId, string } from "../src/types";
import { createMockDatabase } from "./mock";

describe("Tests for refs population", async () => {
  const { server, client } = await createMockDatabase();

  beforeAll(async () => {
    await client.connect();
  });

  afterEach(async () => {
    // Drop the database after each test to ensure isolation
    await client.db().dropDatabase();
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  const setupSchemasAndCollections = () => {
    // Define schemas
    const UserSchema = createSchema("users", {
      name: string(),
      isAdmin: boolean(),
      createdAt: date(),
      tutor: objectId().optional(),
      maybe: string().optional(),
    });
    const PostSchema = createSchema("posts", {
      title: string(),
      contents: string(),
      author: objectId().optional(),
      editor: objectId().optional(),
      contributors: array(objectId()).optional().default([]),
      secret: string().default(() => "secret"),
    })
      .omit({ secret: true })
      .virtuals({
        contributorsCount: virtual(
          "contributors",
          ({ contributors }) => contributors?.length ?? 0,
        ),
        secretSize: virtual("secret", ({ secret }) => secret?.length),
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
    const PostSchemaRelations = createRelations(
      PostSchema,
      ({ one, many }) => ({
        author: one(UserSchema, { field: "author", references: "_id" }),
        editor: one(UserSchema, { field: "editor", references: "_id" }),
        contributors: many(UserSchema, {
          field: "contributors",
          references: "_id",
        }),
      }),
    );
    const BookSchemaRelations = createRelations(
      BookSchema,
      ({ one }) => ({
        author: one(UserSchema, { field: "author", references: "_id" }),
      }),
    );

    // Create database collections
    return createDatabase(client.db(), {
      users: UserSchema,
      posts: PostSchema,
      books: BookSchema,
      UserSchemaRelations,
      PostSchemaRelations,
      BookSchemaRelations,
    });
  };

  it("should populate relation", async () => {
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

    const populatedUser2 = await collections.users
      .findById(user2._id)
      .populate({ tutor: true })
      .exec();

    expect(populatedUser2).toStrictEqual({
      ...user2,
      tutor: user,
    });
  });

  it("should populate 'author' and 'contributors' in findOne", async () => {
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
        createdAt: new Date(),
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Pilot",
        contents: "Lorem",
        author: user._id,
        editor: user._id,
        contributors: [user2._id],
      })
      .exec();

    // Fetch and populate post's author using findOne
    const populatedPost = await collections.posts
      .findOne({
        title: "Pilot",
      })
      .populate({ contributors: true, author: true })
      .exec();

    expect(populatedPost?.author).toStrictEqual(user);
    expect(populatedPost?.contributors).toBeDefined();
    expect(populatedPost?.contributors).toHaveLength(1);
    expect(populatedPost?.contributors[0]).toStrictEqual(user2);
  });

  it("should populate 'posts' in find for multiple users", async () => {
    const { collections } = setupSchemasAndCollections();

    // Create users
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

    // Create posts and assign to users
    await collections.posts
      .insertOne({
        title: "Pilot",
        contents: "Lorem",
        author: user._id,
        editor: user._id,
        contributors: [tutoredUser._id],
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Pilot 2",
        contents: "Lorem2",
        author: user._id,
        editor: user._id,
        contributors: [],
      })
      .exec();

    // Test case for optional author
    await collections.posts
      .insertOne({
        title: "No Author",
        contents: "Lorem",
        editor: user._id,
        contributors: [],
      })
      .exec();

    // Fetch and populate posts for all users using find
    const populatedUsers = await collections.users
      .find()
      .populate({ posts: true, tutor: true })
      .exec();

    expect(populatedUsers.length).toBe(2);
    expect(populatedUsers[0].posts.length).toBe(2);
    expect(populatedUsers[1].posts.length).toBe(0);
    expect(populatedUsers[1].tutor).toStrictEqual(user);
  });

  it("should support nested population", async () => {
    const { collections } = setupSchemasAndCollections();

    // Create users with tutor relationship
    const tutor = await collections.users
      .insertOne({
        name: "Master Tutor",
        isAdmin: true,
        createdAt: new Date(),
      })
      .exec();

    const author = await collections.users
      .insertOne({
        name: "Student Author",
        isAdmin: false,
        createdAt: new Date(),
        tutor: tutor._id,
      })
      .exec();

    // Create posts for both users
    await collections.posts
      .insertOne({
        title: "Tutor's Post",
        contents: "Wisdom",
        author: tutor._id,
      })
      .exec();

    const studentPost = await collections.posts
      .insertOne({
        title: "Student's Post",
        contents: "Learning",
        author: author._id,
      })
      .exec();

    // Test nested population
    const populatedPost = await collections.posts
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

  it("It should handle multiple population with same field", async () => {
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
        editor: user._id,
      })
      .exec();
  await collections.books
    .insertOne({
      title: "Book 1",
      author: user._id,
    })
    .exec();

    const populatedUser = await collections.users
      .findById(user._id)
      .populate({ posts: true, books: true })
      .exec();

    expect(populatedUser).toBeTruthy();
    expect(populatedUser?.posts).toHaveLength(1);
    expect(populatedUser?.books).toHaveLength(1);
    expect(populatedUser?.posts?.[0]?.title).toBe("Post 1");
    expect(populatedUser?.books?.[0]?.title).toBe("Book 1");
  });

  it("It should handle deep nested populations with same relation fields", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users
      .insertOne({
        name: "Test User",
        isAdmin: false,
        createdAt: new Date(),
      })
      .exec();

    const user2 = await collections.users
      .insertOne({
        name: "Test User 2",
        isAdmin: false,
        createdAt: new Date(),
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Post 1",
        contents: "Content 1",
        author: user._id,
        editor: user2._id,
      })
      .exec();

    await collections.posts
      .insertOne({
        title: "Post 2",
        contents: "Content 2",
        author: user2._id,
        editor: user2._id,
      })
      .exec();

    await collections.books
      .insertOne({
        title: "Book 1",
        author: user._id,
      })
      .exec();

    const populatedUser = await collections.users
      .findById(user._id)
      .populate({ posts: {
        populate: {
          editor: {
            populate: {
              posts: true
            }
          }
        }
      }, books: true })
      .exec();

    expect(populatedUser).toBeTruthy();
    expect(populatedUser?.posts).toHaveLength(1);
    expect(populatedUser?.books).toHaveLength(1);
    expect(populatedUser?.posts?.[0]?.title).toBe("Post 1");
    expect(populatedUser?.posts?.[0]?.editor?.posts).toHaveLength(1);
    expect(populatedUser?.books?.[0]?.title).toBe("Book 1");
  })

  describe("Monarch Population Options", () => {
    it("should populate with limit and skip options", async () => {
      const { collections } = setupSchemasAndCollections();

      // Create a user and posts
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

      // Fetch and populate posts with limit and skip
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
      // Create a user and posts
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

      // Fetch and populate posts with select and omit options
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
      // Create a user and posts
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

      // Fetch and populate posts with select and omit options
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
      // Create a user and posts
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

      // Fetch and populate posts with select and omit options
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
      // Create a user and posts
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

      // Fetch and populate posts with sort option
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

    it("should access original population fields in virtuals", async () => {
      const { collections } = setupSchemasAndCollections();
      // Create a user and posts
      const user1 = await collections.users
        .insertOne({
          name: "Test User 1",
          isAdmin: false,
          createdAt: new Date(),
        })
        .exec();

      const user2 = await collections.users
        .insertOne({
          name: "Test User 2",
          isAdmin: false,
          createdAt: new Date(),
        })
        .exec();

      await collections.posts
        .insertOne({
          title: "Post 6",
          contents: "Content 6",
          contributors: [user1._id, user2._id],
          secret: "12345",
        })
        .exec();

      // Fetch and populate posts with sort option
      const populatedPost = await collections.posts
        .find()
        .populate({
          contributors: {
            select: { name: true },
          },
        })
        .exec();

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
      // should remove extra inputs for virtuals
      expect(populatedPost[0]).not.toHaveProperty("secret");
    });
  });

  describe("Schema Relation Validations", () => {
    it("should throw error when relation target schema is not initialized", async () => {
      const UserSchema = createSchema("users", {
        name: string(),
        isAdmin: boolean(),
        createdAt: date(),
      });

      // Create relations before PostSchema is defined
      const UserSchemaRelations = createRelations(UserSchema, ({ ref }) => ({
        posts: ref(undefined as any, { field: "_id", references: "author" }),
      }));

      const db = createDatabase(client.db(), {
        users: UserSchema,
        UserSchemaRelations,
      });

      // Attempt to populate undefined relation
      await expect(async () => {
        await db.collections.users.find().populate({ posts: true }).exec();
      }).rejects.toThrow(
        "Target schema not found for relation 'posts' in schema 'users'",
      );
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

      // Attempt to populate non-existent relation
      await expect(async () => {
        await db.collections.users.find().populate({ posts: true }).exec();
      }).rejects.toThrow("No relations found for schema 'users'");
    });
  });
});
