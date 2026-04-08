import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas, virtual } from "../../src";
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

    const schemas = defineSchemas({ UserSchema, PostSchema });
    const relations = schemas.withRelations((r) => ({
      users: {
        posts: r.$many.posts({ from: r.users._id, to: r.posts.author }),
      },
      posts: {
        author: r.$one.users({ from: r.posts.author, to: r.users._id }),
        contributors: r.$refs.users({ from: r.posts.contributors, to: r.users._id }),
      },
    }));
    return createDatabase(client.db(), relations);
  };

  it("should populate with limit and skip options", async () => {
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

    await collections.posts.insertOne({
      title: "Post 2",
      contents: "Content 2",
      author: user._id,
    });

    const populatedUser = await collections.users.find().populate({ posts: { limit: 1, skip: 0 } });
    expect(populatedUser.length).toBe(1);
    expect(populatedUser[0].posts.length).toBe(1);
    expect(populatedUser[0].posts[0].title).toBe("Post 1");
    expect(populatedUser[0].posts[0].contents).toBe("Content 1");
  });

  it("should populate with default omit option", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users.insertOne({
      name: "Test User 2",
      isAdmin: false,
      createdAt: new Date(),
    });
    await collections.posts.insertOne({
      title: "Post 3",
      contents: "Content 3",
      author: user._id,
    });

    const populatedUser = await collections.users.find().populate({
      posts: true,
    });
    expect(populatedUser.length).toBe(1);
    expect(populatedUser[0].posts.length).toBe(1);
    expect(populatedUser[0].posts[0].contents).toBe("Content 3");
    expect(populatedUser[0].posts[0]).not.toHaveProperty("secret");
  });

  it("should populate with omit option", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users.insertOne({
      name: "Test User 2",
      isAdmin: false,
      createdAt: new Date(),
    });
    await collections.posts.insertOne({
      title: "Post 3",
      contents: "Content 3",
      author: user._id,
    });

    const populatedUser = await collections.users.find().populate({
      posts: {
        omit: { title: true },
      },
    });
    expect(populatedUser.length).toBe(1);
    expect(populatedUser[0].posts.length).toBe(1);
    expect(populatedUser[0].posts[0].contents).toBe("Content 3");
    expect(populatedUser[0].posts[0]).toHaveProperty("secret");
    expect(populatedUser[0].posts[0]).not.toHaveProperty("title");
  });

  it("should populate with select option", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users.insertOne({
      name: "Test User 2",
      isAdmin: false,
      createdAt: new Date(),
    });
    await collections.posts.insertOne({
      title: "Post 3",
      contents: "Content 3",
      author: user._id,
    });

    const populatedUser = await collections.users.find().populate({
      posts: {
        select: { title: true },
      },
    });
    expect(populatedUser.length).toBe(1);
    expect(populatedUser[0].posts.length).toBe(1);
    expect(populatedUser[0].posts[0].title).toBe("Post 3");
    expect(populatedUser[0].posts[0]).not.toHaveProperty("contents");
    expect(populatedUser[0].posts[0]).not.toHaveProperty("secret");
  });

  it("should populate with sort option", async () => {
    const { collections } = setupSchemasAndCollections();

    const user = await collections.users.insertOne({
      name: "Test User 5",
      isAdmin: false,
      createdAt: new Date(),
    });
    await collections.posts.insertOne({
      title: "Post 6",
      contents: "Content 6",
      author: user._id,
    });

    await collections.posts.insertOne({
      title: "Post 7",
      contents: "Content 7",
      author: user._id,
    });

    const populatedUser = await collections.users.find().populate({
      posts: {
        sort: { title: -1 },
      },
    });
    expect(populatedUser.length).toBe(1);
    expect(populatedUser[0].posts.length).toBe(2);
    expect(populatedUser[0].posts[0].title).toBe("Post 7");
    expect(populatedUser[0].posts[0].contents).toBe("Content 7");
    expect(populatedUser[0].posts[1].title).toBe("Post 6");
    expect(populatedUser[0].posts[1].contents).toBe("Content 6");
  });

  describe("default relation options", () => {
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
    });

    describe("$one", () => {
      it("should apply default select when populating with true", async () => {
        const schemas = defineSchemas({ UserSchema, PostSchema });
        const relations = schemas.withRelations((r) => ({
          users: {
            posts: r.$many.posts({ from: r.users._id, to: r.posts.author }),
          },
          posts: {
            author: r.$one.users({ from: r.posts.author, to: r.users._id }).options({ select: { name: true } }),
          },
        }));
        const { collections } = createDatabase(client.db(), relations);

        const user = await collections.users.insertOne({ name: "Alice", isAdmin: true, createdAt: new Date() });
        await collections.posts.insertOne({ title: "Hello", contents: "World", author: user._id });

        const populatedPost = await collections.posts.findOne({ title: "Hello" }).populate({ author: true });
        expect(populatedPost?.author?.name).toBe("Alice");
        expect(populatedPost?.author).not.toHaveProperty("isAdmin");
        expect(populatedPost?.author).not.toHaveProperty("createdAt");
      });

      it("should apply default omit when populating with true", async () => {
        const schemas = defineSchemas({ UserSchema, PostSchema });
        const relations = schemas.withRelations((r) => ({
          users: {
            posts: r.$many.posts({ from: r.users._id, to: r.posts.author }),
          },
          posts: {
            author: r.$one.users({ from: r.posts.author, to: r.users._id }).options({ omit: { isAdmin: true } }),
          },
        }));
        const { collections } = createDatabase(client.db(), relations);

        const user = await collections.users.insertOne({ name: "Alice", isAdmin: true, createdAt: new Date() });
        await collections.posts.insertOne({ title: "Hello", contents: "World", author: user._id });

        const populatedPost = await collections.posts.findOne({ title: "Hello" }).populate({ author: true });
        expect(populatedPost?.author?.name).toBe("Alice");
        expect(populatedPost?.author).not.toHaveProperty("isAdmin");
        expect(populatedPost?.author?.createdAt).toBeDefined();
      });
    });

    describe("$many", () => {
      it("should apply default select when populating with true", async () => {
        const schemas = defineSchemas({ UserSchema, PostSchema });
        const relations = schemas.withRelations((r) => ({
          users: {
            posts: r.$many.posts({ from: r.users._id, to: r.posts.author }).options({ select: { title: true } }),
          },
          posts: {
            author: r.$one.users({ from: r.posts.author, to: r.users._id }),
          },
        }));
        const { collections } = createDatabase(client.db(), relations);

        const user = await collections.users.insertOne({ name: "Bob", isAdmin: false, createdAt: new Date() });
        await collections.posts.insertOne({ title: "My Post", contents: "Secret content", author: user._id });

        const populatedUser = await collections.users.findById(user._id).populate({ posts: true });
        expect(populatedUser?.posts).toHaveLength(1);
        expect(populatedUser?.posts[0].title).toBe("My Post");
        expect(populatedUser?.posts[0]).not.toHaveProperty("contents");
        expect(populatedUser?.posts[0]).not.toHaveProperty("author");
      });

      it("should apply default omit when populating with true", async () => {
        const schemas = defineSchemas({ UserSchema, PostSchema });
        const relations = schemas.withRelations((r) => ({
          users: {
            posts: r.$many.posts({ from: r.users._id, to: r.posts.author }).options({ omit: { contents: true } }),
          },
          posts: {
            author: r.$one.users({ from: r.posts.author, to: r.users._id }),
          },
        }));
        const { collections } = createDatabase(client.db(), relations);

        const user = await collections.users.insertOne({ name: "Bob", isAdmin: false, createdAt: new Date() });
        await collections.posts.insertOne({ title: "My Post", contents: "Secret content", author: user._id });

        const populatedUser = await collections.users.findById(user._id).populate({ posts: true });
        expect(populatedUser?.posts).toHaveLength(1);
        expect(populatedUser?.posts[0].title).toBe("My Post");
        expect(populatedUser?.posts[0]).not.toHaveProperty("contents");
        expect(populatedUser?.posts[0].author).toStrictEqual(user._id);
      });

      it("should apply default sort and limit when populating with true", async () => {
        const schemas = defineSchemas({ UserSchema, PostSchema });
        const relations = schemas.withRelations((r) => ({
          users: {
            posts: r.$many.posts({ from: r.users._id, to: r.posts.author }).options({ sort: { title: -1 }, limit: 2 }),
          },
          posts: {
            author: r.$one.users({ from: r.posts.author, to: r.users._id }),
          },
        }));
        const { collections } = createDatabase(client.db(), relations);

        const user = await collections.users.insertOne({ name: "Bob", isAdmin: false, createdAt: new Date() });
        await collections.posts.insertOne({ title: "Post A", contents: "...", author: user._id });
        await collections.posts.insertOne({ title: "Post B", contents: "...", author: user._id });
        await collections.posts.insertOne({ title: "Post C", contents: "...", author: user._id });

        const populatedUser = await collections.users.findById(user._id).populate({ posts: true });
        expect(populatedUser?.posts).toHaveLength(2);
        expect(populatedUser?.posts[0].title).toBe("Post C");
        expect(populatedUser?.posts[0].contents).toBe("...");
        expect(populatedUser?.posts[1].title).toBe("Post B");
        expect(populatedUser?.posts[1].contents).toBe("...");
      });
    });

    describe("$refs", () => {
      it("should apply default select when populating with true", async () => {
        const schemas = defineSchemas({ UserSchema, PostSchema });
        const relations = schemas.withRelations((r) => ({
          posts: {
            contributors: r.$refs
              .users({ from: r.posts.contributors, to: r.users._id })
              .options({ select: { name: true } }),
          },
        }));
        const { collections } = createDatabase(client.db(), relations);

        const user1 = await collections.users.insertOne({ name: "Bob", isAdmin: false, createdAt: new Date() });
        const user2 = await collections.users.insertOne({ name: "Alice", isAdmin: true, createdAt: new Date() });
        await collections.posts.insertOne({ title: "Collab", contents: "...", contributors: [user1._id, user2._id] });

        const populatedPost = await collections.posts.findOne({ title: "Collab" }).populate({ contributors: true });
        expect(populatedPost?.contributors).toHaveLength(2);
        expect(populatedPost?.contributors[0].name).toBe("Bob");
        expect(populatedPost?.contributors[0]).not.toHaveProperty("isAdmin");
        expect(populatedPost?.contributors[0]).not.toHaveProperty("createdAt");
        expect(populatedPost?.contributors[1].name).toBe("Alice");
        expect(populatedPost?.contributors[1]).not.toHaveProperty("isAdmin");
        expect(populatedPost?.contributors[1]).not.toHaveProperty("createdAt");
      });

      it("should apply default sort and limit when populating with true", async () => {
        const schemas = defineSchemas({ UserSchema, PostSchema });
        const relations = schemas.withRelations((r) => ({
          posts: {
            contributors: r.$refs
              .users({ from: r.posts.contributors, to: r.users._id })
              .options({ sort: { name: 1 }, limit: 2 }),
          },
        }));
        const { collections } = createDatabase(client.db(), relations);

        const user1 = await collections.users.insertOne({ name: "Charlie", isAdmin: false, createdAt: new Date() });
        const user2 = await collections.users.insertOne({ name: "Alice", isAdmin: false, createdAt: new Date() });
        const user3 = await collections.users.insertOne({ name: "Bob", isAdmin: false, createdAt: new Date() });
        await collections.posts.insertOne({
          title: "Collab",
          contents: "...",
          contributors: [user1._id, user2._id, user3._id],
        });

        const populatedPost = await collections.posts.findOne({ title: "Collab" }).populate({ contributors: true });
        expect(populatedPost?.contributors).toHaveLength(2);
        expect(populatedPost?.contributors[0].name).toBe("Alice");
        expect(populatedPost?.contributors[0].isAdmin).toBe(false);
        expect(populatedPost?.contributors[1].name).toBe("Bob");
        expect(populatedPost?.contributors[1].isAdmin).toBe(false);
      });
    });

    describe("default nested populate", () => {
      it("should populate nested relations defined across multiple withRelations calls", async () => {
        const schemas = defineSchemas({ UserSchema, PostSchema });
        const baseRelations = schemas.withRelations((r) => ({
          posts: {
            author: r.$one.users({ from: r.posts.author, to: r.users._id }),
          },
        }));
        const relations = baseRelations.withRelations((r) => ({
          users: {
            posts: r.$many.posts({ from: r.users._id, to: r.posts.author }).options({
              populate: { author: true },
            }),
          },
        }));
        const { collections } = createDatabase(client.db(), relations);

        const user = await collections.users.insertOne({ name: "Bob", isAdmin: false, createdAt: new Date() });
        await collections.posts.insertOne({ title: "Post 1", contents: "Content 1", author: user._id });
        await collections.posts.insertOne({ title: "Post 2", contents: "Content 2", author: user._id });

        const populatedUser = await collections.users.findById(user._id).populate({ posts: true });
        expect(populatedUser?.posts).toHaveLength(2);
        expect(populatedUser?.posts[0].title).toBe("Post 1");
        expect(populatedUser?.posts[0].contents).toBe("Content 1");
        expect(populatedUser?.posts[0].author?.name).toBe("Bob");
        expect(populatedUser?.posts[1].title).toBe("Post 2");
        expect(populatedUser?.posts[1].contents).toBe("Content 2");
        expect(populatedUser?.posts[1].author?.name).toBe("Bob");
      });

      it("should allow inline populate options to override the nested default", async () => {
        const schemas = defineSchemas({ UserSchema, PostSchema });
        const baseRelations = schemas.withRelations((r) => ({
          posts: {
            author: r.$one.users({ from: r.posts.author, to: r.users._id }),
          },
        }));
        const relations = baseRelations.withRelations((r) => ({
          users: {
            posts: r.$many.posts({ from: r.users._id, to: r.posts.author }).options({
              populate: { author: true },
            }),
          },
        }));
        const { collections } = createDatabase(client.db(), relations);

        const user = await collections.users.insertOne({ name: "Bob", isAdmin: false, createdAt: new Date() });
        await collections.posts.insertOne({ title: "Post 1", contents: "Content 1", author: user._id });
        await collections.posts.insertOne({ title: "Post 2", contents: "Content 2", author: user._id });

        const populatedUser = await collections.users.findById(user._id).populate({
          posts: {},
        });
        expect(populatedUser?.posts).toHaveLength(2);
        expect(populatedUser?.posts[0].title).toBe("Post 1");
        expect(populatedUser?.posts[0].contents).toBe("Content 1");
        expect(populatedUser?.posts[0].author).toStrictEqual(user._id);
        expect(populatedUser?.posts[1].title).toBe("Post 2");
        expect(populatedUser?.posts[1].contents).toBe("Content 2");
        expect(populatedUser?.posts[1].author).toStrictEqual(user._id);
      });
    });
  });
});
