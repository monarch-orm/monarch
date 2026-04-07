import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas, mergeSchemas } from "../../src";
import { objectId, string } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("schema groups", async () => {
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

  // Group 1: User module
  const UserSchema = createSchema("users", {
    name: string(),
    tutorId: objectId().optional(),
  });

  const userGroup = defineSchemas({ UserSchema }).withRelations((s) => ({
    users: {
      tutor: s.users.$one.users({ from: "tutorId", to: "_id" }),
    },
  }));

  // Group 2: Content module
  const PostSchema = createSchema("posts", {
    title: string(),
    authorId: objectId(),
  });

  const CategorySchema = createSchema("categories", {
    name: string(),
    parentId: objectId().optional(),
  });

  const contentGroup = defineSchemas({ PostSchema, CategorySchema }).withRelations((s) => ({
    categories: {
      parent: s.categories.$one.categories({ from: "parentId", to: "_id" }),
    },
  }));

  // Merged: within-group relations only
  const mergedGroups = mergeSchemas(userGroup, contentGroup);

  // Merged: with cross-group relations added after merge
  const withCrossGroupRelations = mergedGroups.withRelations((s) => ({
    users: {
      posts: s.users.$many.posts({ from: "_id", to: "authorId" }),
    },
    posts: {
      author: s.posts.$one.users({ from: "authorId", to: "_id" }),
    },
  }));

  describe("merged groups — within-group relations only", () => {
    it("should list all collections from both groups", () => {
      const db = createDatabase(client.db(), mergedGroups);
      const keys = db.listCollections();
      expect(keys).toEqual(expect.arrayContaining(["users", "posts", "categories"]));
    });

    it("should preserve user group relation (users.tutor) after merge", async () => {
      const db = createDatabase(client.db(), mergedGroups);

      const tutor = await db.collections.users.insertOne({ name: "Mentor" });
      await db.collections.users.insertOne({ name: "Learner", tutorId: tutor._id });

      const learner = await db.collections.users.findOne({ name: "Learner" }).populate({ tutor: true });

      expect(learner?.tutor?.name).toBe("Mentor");
    });

    it("should preserve content group relation (categories.parent) after merge", async () => {
      const db = createDatabase(client.db(), mergedGroups);

      const root = await db.collections.categories.insertOne({ name: "Tech" });
      await db.collections.categories.insertOne({ name: "TypeScript", parentId: root._id });

      const child = await db.collections.categories.findOne({ name: "TypeScript" }).populate({ parent: true });

      expect(child?.parent?.name).toBe("Tech");
    });
  });

  describe("merged groups — with cross-group relations defined after merge", () => {
    it("should populate cross-group many relation (users.posts)", async () => {
      const db = createDatabase(client.db(), withCrossGroupRelations);

      const user = await db.collections.users.insertOne({ name: "Bob" });
      await db.collections.posts.insertOne({ title: "Post 1", authorId: user._id });
      await db.collections.posts.insertOne({ title: "Post 2", authorId: user._id });

      const populatedUser = await db.collections.users.findById(user._id).populate({ posts: true });

      expect(populatedUser?.posts).toHaveLength(2);
      expect(populatedUser?.posts?.map((p) => p.title)).toEqual(expect.arrayContaining(["Post 1", "Post 2"]));
    });

    it("should populate cross-group one relation (posts.user)", async () => {
      const db = createDatabase(client.db(), withCrossGroupRelations);

      const user = await db.collections.users.insertOne({ name: "Alice" });
      await db.collections.posts.insertOne({ title: "Hello World", authorId: user._id });

      const post = await db.collections.posts.findOne({ title: "Hello World" }).populate({ author: true });

      expect(post?.author?.name).toBe("Alice");
    });

    it("should still populate within-group relation (users.tutor) after adding cross-group", async () => {
      const db = createDatabase(client.db(), withCrossGroupRelations);

      const tutor = await db.collections.users.insertOne({ name: "Professor" });
      await db.collections.users.insertOne({ name: "Student", tutorId: tutor._id });

      const student = await db.collections.users.findOne({ name: "Student" }).populate({ tutor: true });

      expect(student?.tutor?.name).toBe("Professor");
    });

    it("should still populate within-group relation (categories.parent) after adding cross-group", async () => {
      const db = createDatabase(client.db(), withCrossGroupRelations);

      const parent = await db.collections.categories.insertOne({ name: "Root" });
      await db.collections.categories.insertOne({ name: "Child", parentId: parent._id });

      const child = await db.collections.categories.findOne({ name: "Child" }).populate({ parent: true });

      expect(child?.parent?.name).toBe("Root");
    });
  });

  describe("mergeSchemas relation collisions", () => {
    it("merges distinct relation keys for the same schema", async () => {
      const UsersSchema = createSchema("users", {
        name: string(),
        tutorId: objectId().optional(),
        mentorId: objectId().optional(),
      });

      const groupA = defineSchemas({ UsersSchema }).withRelations((s) => ({
        users: {
          tutor: s.users.$one.users({ from: "tutorId", to: "_id" }),
        },
      }));

      const groupB = defineSchemas({ UsersSchema }).withRelations((s) => ({
        users: {
          mentor: s.users.$one.users({ from: "mentorId", to: "_id" }),
        },
      }));

      const merged = mergeSchemas(groupA, groupB);
      const db = createDatabase(client.db(), merged);

      const tutor = await db.collections.users.insertOne({ name: "Tutor" });
      const mentor = await db.collections.users.insertOne({ name: "Mentor" });
      await db.collections.users.insertOne({
        name: "Student",
        tutorId: tutor._id,
        mentorId: mentor._id,
      });

      const student = await db.collections.users.findOne({ name: "Student" }).populate({
        tutor: true,
        mentor: true,
      });
      expect(student?.tutor?.name).toBe("Tutor");
      expect(student?.mentor?.name).toBe("Mentor");
    });

    it("last merged relation key wins on conflict", async () => {
      const UsersSchema = createSchema("users", {
        name: string(),
        tutorId: objectId().optional(),
        mentorId: objectId().optional(),
      });

      const groupA = defineSchemas({ UsersSchema }).withRelations((s) => ({
        users: {
          person: s.users.$one.users({ from: "tutorId", to: "_id" }),
        },
      }));

      const groupB = defineSchemas({ UsersSchema }).withRelations((s) => ({
        users: {
          person: s.users.$one.users({ from: "mentorId", to: "_id" }),
        },
      }));

      const merged = mergeSchemas(groupA, groupB);
      const db = createDatabase(client.db(), merged);

      const tutor = await db.collections.users.insertOne({ name: "Tutor" });
      const mentor = await db.collections.users.insertOne({ name: "Mentor" });
      await db.collections.users.insertOne({
        name: "Student",
        tutorId: tutor._id,
        mentorId: mentor._id,
      });

      const student = await db.collections.users.findOne({ name: "Student" }).populate({ person: true });
      expect(student?.person?.name).toBe("Mentor");
    });
  });
});
