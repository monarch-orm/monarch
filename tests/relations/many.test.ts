import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas } from "../../src";
import { array, boolean, date, objectId, string } from "../../src/types";
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
    const relations = schemas.withRelations((r) => ({
      users: {
        tutor: r.one.users({ from: r.users.tutor, to: r.users._id }),
        posts: r.many.posts({ from: r.users._id, to: r.posts.author }),
        books: r.many.books({ from: r.users._id, to: r.books.author }),
      },
      posts: {
        author: r.one.users({ from: r.posts.author, to: r.users._id }),
      },
      books: {
        author: r.one.users({ from: r.books.author, to: r.users._id }),
      },
    }));
    return createDatabase(client.db(), relations);
  };

  it("should populate a many relation across collections", async () => {
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

  it("should populate multiple many relations to different collections", async () => {
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

  it("should support deep nested population across many and one relations", async () => {
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
    const relations = schemas.withRelations((r) => ({
      users: {
        posts: r.many.posts({ from: r.users._id, to: r.posts.author }),
        books: r.many.books({ from: r.users._id, to: r.books.author }),
      },
      posts: {
        author: r.one.users({ from: r.posts.author, to: r.users._id }),
        editor: r.one.users({ from: r.posts.editor, to: r.users._id }),
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

  describe("field type combinations", () => {
    const PostSchema = createSchema("posts", {
      title: string(),
      contents: string(),
      tagIds: array(objectId()).default([]),
    });

    const TagSchema = createSchema("tags", {
      name: string(),
      primaryPostId: objectId().optional(),
      postIds: array(objectId()).default([]),
    });

    it("single → single", async () => {
      const schemas = defineSchemas({ PostSchema, TagSchema });
      const relations = schemas.withRelations((r) => ({
        posts: {
          tags: r.many.tags({ from: r.posts._id, to: r.tags.primaryPostId }),
        },
      }));
      const db = createDatabase(client.db(), relations);

      const post1 = await db.collections.posts.insertOne({ title: "Post 1", contents: "Content 1" });
      const post2 = await db.collections.posts.insertOne({ title: "Post 2", contents: "Content 2" });

      await db.collections.tags.insertOne({ name: "TypeScript", primaryPostId: post1._id });
      await db.collections.tags.insertOne({ name: "MongoDB", primaryPostId: post1._id });
      await db.collections.tags.insertOne({ name: "Unrelated" });

      const populatedPost1 = await db.collections.posts.findById(post1._id).populate({ tags: true });
      expect(populatedPost1?.tags).toHaveLength(2);
      expect(populatedPost1?.tags.map((t) => t.name)).toEqual(expect.arrayContaining(["TypeScript", "MongoDB"]));

      const populatedPost2 = await db.collections.posts.findById(post2._id).populate({ tags: true });
      expect(populatedPost2?.tags).toHaveLength(0);
    });

    it("single → array", async () => {
      const schemas = defineSchemas({ PostSchema, TagSchema });
      const relations = schemas.withRelations((r) => ({
        posts: {
          tags: r.many.tags({ from: r.posts._id, to: r.tags.postIds }),
        },
      }));
      const db = createDatabase(client.db(), relations);

      const post1 = await db.collections.posts.insertOne({ title: "Post 1", contents: "Content 1" });
      const post2 = await db.collections.posts.insertOne({ title: "Post 2", contents: "Content 2" });
      const post3 = await db.collections.posts.insertOne({ title: "Post 3", contents: "Content 3" });

      await db.collections.tags.insertOne({ name: "TypeScript", postIds: [post1._id, post2._id] });
      await db.collections.tags.insertOne({ name: "MongoDB", postIds: [post2._id, post3._id] });
      await db.collections.tags.insertOne({ name: "Unrelated", postIds: [] });

      const populatedPost1 = await db.collections.posts.findById(post1._id).populate({ tags: true });
      expect(populatedPost1?.tags).toHaveLength(1);
      expect(populatedPost1?.tags[0].name).toBe("TypeScript");

      const populatedPost2 = await db.collections.posts.findById(post2._id).populate({ tags: true });
      expect(populatedPost2?.tags).toHaveLength(2);
      expect(populatedPost2?.tags.map((t) => t.name)).toEqual(expect.arrayContaining(["TypeScript", "MongoDB"]));

      const populatedPost3 = await db.collections.posts.findById(post3._id).populate({ tags: true });
      expect(populatedPost3?.tags).toHaveLength(1);
      expect(populatedPost3?.tags[0].name).toBe("MongoDB");
    });

    it("array → single", async () => {
      const schemas = defineSchemas({ PostSchema, TagSchema });
      const relations = schemas.withRelations((r) => ({
        tags: {
          posts: r.many.posts({ from: r.tags.postIds, to: r.posts._id }),
        },
      }));
      const db = createDatabase(client.db(), relations);

      const post1 = await db.collections.posts.insertOne({ title: "Post 1", contents: "Content 1" });
      const post2 = await db.collections.posts.insertOne({ title: "Post 2", contents: "Content 2" });
      const post3 = await db.collections.posts.insertOne({ title: "Post 3", contents: "Content 3" });

      const tsTag = await db.collections.tags.insertOne({ name: "TypeScript", postIds: [post1._id, post2._id] });
      const mongoTag = await db.collections.tags.insertOne({ name: "MongoDB", postIds: [post2._id, post3._id] });
      const emptyTag = await db.collections.tags.insertOne({ name: "Unrelated", postIds: [] });

      const populatedTsTag = await db.collections.tags.findById(tsTag._id).populate({ posts: true });
      expect(populatedTsTag?.posts).toHaveLength(2);
      expect(populatedTsTag?.posts.map((p) => p.title)).toEqual(expect.arrayContaining(["Post 1", "Post 2"]));

      const populatedMongoTag = await db.collections.tags.findById(mongoTag._id).populate({ posts: true });
      expect(populatedMongoTag?.posts).toHaveLength(2);
      expect(populatedMongoTag?.posts.map((p) => p.title)).toEqual(expect.arrayContaining(["Post 2", "Post 3"]));

      const populatedEmptyTag = await db.collections.tags.findById(emptyTag._id).populate({ posts: true });
      expect(populatedEmptyTag?.posts).toHaveLength(0);
    });

    it("array → array", async () => {
      // Find events that share at least one tag with a post.
      const EventSchema = createSchema("events", {
        name: string(),
        tagIds: array(objectId()).default([]),
      });

      const schemas = defineSchemas({ PostSchema, EventSchema });
      const relations = schemas.withRelations((r) => ({
        posts: {
          relatedEvents: r.many.events({ from: r.posts.tagIds, to: r.events.tagIds }),
        },
      }));
      const db = createDatabase(client.db(), relations);

      const { ObjectId } = await import("mongodb");
      const tag1 = new ObjectId();
      const tag2 = new ObjectId();
      const tag3 = new ObjectId();

      const post = await db.collections.posts.insertOne({ title: "Post", contents: "...", tagIds: [tag1, tag2] });

      await db.collections.events.insertOne({ name: "Event A", tagIds: [tag1, tag3] }); // shares tag1
      await db.collections.events.insertOne({ name: "Event B", tagIds: [tag2] }); // shares tag2
      await db.collections.events.insertOne({ name: "Event C", tagIds: [tag3] }); // shares nothing

      const populated = await db.collections.posts.findById(post._id).populate({ relatedEvents: true });
      expect(populated?.relatedEvents).toHaveLength(2);
      expect(populated?.relatedEvents.map((e) => e.name)).toEqual(expect.arrayContaining(["Event A", "Event B"]));
    });
  });
});
