import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas } from "../../src";
import { boolean, number, objectId, string } from "../../src/types";
import { createMockDatabase, mockUsers } from "../mock";

describe("Query Methods", async () => {
  const { server, client } = await createMockDatabase();

  const UserSchema = createSchema("users", {
    name: string().optional(),
    email: string().lowercase().optional(),
    age: number().optional().default(10),
    isVerified: boolean().default(false),
  });

  const { collections } = createDatabase(
    client.db(),
    defineSchemas({
      users: UserSchema,
    }),
  );

  beforeAll(async () => {
    await client.connect();
  });

  afterEach(async () => {
    await collections.users.deleteMany({});
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  it("queries with single where condition", async () => {
    await collections.users.insertMany(mockUsers);

    const firstUser = await collections.users.findOne({ name: "anon" });
    expect(firstUser?.name).toBe("anon");
  });

  it("queries with multiple where conditions", async () => {
    await collections.users.insertMany(mockUsers);

    const users = await collections.users.find({ name: "anon", age: 17 });
    expect(users.length).toBe(1);
  });

  it("selects specific fields", async () => {
    await collections.users.insertMany(mockUsers);

    const users = await collections.users.find().select({ name: true, email: true });
    expect(users[0].name).toBe("anon");
    expect(users[0].email).toBe("anon@gmail.com");
    // @ts-expect-error
    expect(users[0].age).toBeUndefined();
    // @ts-expect-error
    expect(users[0].isVerified).toBeUndefined();
  });

  it("omits specific fields", async () => {
    await collections.users.insertMany(mockUsers);

    const users = await collections.users.find().omit({ name: true, email: true });
    // @ts-expect-error
    expect(users[0].name).toBeUndefined();
    // @ts-expect-error
    expect(users[0].email).toBeUndefined();
    expect(users[0].age).toBe(17);
    expect(users[0].isVerified).toBe(true);
  });

  it("limits query results", async () => {
    await collections.users.insertMany(mockUsers);

    const limit = 2;
    const users = await collections.users.find().limit(limit);
    expect(users.length).toBe(limit);
  });

  it("skips query results", async () => {
    await collections.users.insertMany(mockUsers);

    const skip = 2;
    const users = await collections.users.find().skip(skip);
    expect(users.length).toBe(mockUsers.length - skip);
  });

  it("sorts by numeric field descending", async () => {
    await collections.users.insertMany(mockUsers);

    const users = await collections.users.find().sort({ age: -1 });
    expect(users[0].age).toBe(25);
    expect(users[1].age).toBe(20);
    expect(users[2].age).toBe(17);
  });

  it("sorts by string field ascending", async () => {
    await collections.users.insertMany(mockUsers);

    const users = await collections.users.find().sort({ email: "asc" });
    expect(users[0].email).toBe("anon1@gmail.com");
    expect(users[1].email).toBe("anon2@gmail.com");
    expect(users[2].email).toBe("anon@gmail.com");
  });

  it("projection passed to options() has no effect on find()", async () => {
    await collections.users.insertMany(mockUsers);

    const users = await collections.users.find().options({
      // @ts-expect-error
      projection: { name: 0, email: 0 },
    });
    expect(users[0].name).toBeDefined();
    expect(users[0].email).toBeDefined();
  });

  it("projection passed to options() has no effect on findOne()", async () => {
    await collections.users.insertMany(mockUsers);

    const user = await collections.users.findOne({ name: "anon" }).options({
      // @ts-expect-error
      projection: { name: 0, email: 0 },
    });
    expect(user?.name).toBe("anon");
  });

  describe("immutability", () => {
    describe("find()", () => {
      it("limit() returns a new instance and does not affect base query", async () => {
        await collections.users.insertMany(mockUsers);

        const base = collections.users.find();
        const limited = base.limit(1);

        expect(limited).not.toBe(base);
        expect((await base).length).toBe(mockUsers.length);
        expect((await limited).length).toBe(1);
      });

      it("skip() returns a new instance and does not affect base query", async () => {
        await collections.users.insertMany(mockUsers);

        const base = collections.users.find();
        const skipped = base.skip(2);

        expect(skipped).not.toBe(base);
        expect((await base).length).toBe(mockUsers.length);
        expect((await skipped).length).toBe(mockUsers.length - 2);
      });

      it("sort() returns a new instance and does not affect base query", async () => {
        await collections.users.insertMany(mockUsers);

        const base = collections.users.find().limit(1);
        const sorted = base.sort({ age: -1 });

        expect(sorted).not.toBe(base);
        expect((await sorted)[0].age).toBe(25);
        // base has no sort — insertion-order first, not 25
        expect((await base)[0].age).not.toBe(25);
      });

      it("select() returns a new instance and does not affect base query", async () => {
        await collections.users.insertMany(mockUsers);

        const base = collections.users.find();
        const selected = base.select({ name: true });

        expect(selected).not.toBe(base);
        expect((await base)[0].age).toBeDefined();
        // @ts-expect-error
        expect((await selected)[0].age).toBeUndefined();
      });

      it("omit() returns a new instance and does not affect base query", async () => {
        await collections.users.insertMany(mockUsers);

        const base = collections.users.find();
        const omitted = base.omit({ age: true });

        expect(omitted).not.toBe(base);
        expect((await base)[0].age).toBeDefined();
        // @ts-expect-error
        expect((await omitted)[0].age).toBeUndefined();
      });

      it("chained branching preserves independence", async () => {
        await collections.users.insertMany(mockUsers);

        const base = collections.users.find();
        const limited = base.limit(1);
        const skipped = base.skip(1);

        expect((await limited).length).toBe(1);
        expect((await skipped).length).toBe(mockUsers.length - 1);
        expect((await base).length).toBe(mockUsers.length);
      });
    });

    describe("findOne()", () => {
      it("select() returns a new instance and does not affect base query", async () => {
        await collections.users.insertMany(mockUsers);

        const base = collections.users.findOne({ name: "anon" });
        const selected = base.select({ name: true });

        expect(selected).not.toBe(base);
        expect((await base)?.age).toBeDefined();
        // @ts-expect-error
        expect((await selected)?.age).toBeUndefined();
      });

      it("omit() returns a new instance and does not affect base query", async () => {
        await collections.users.insertMany(mockUsers);

        const base = collections.users.findOne({ name: "anon" });
        const omitted = base.omit({ age: true });

        expect(omitted).not.toBe(base);
        expect((await base)?.age).toBeDefined();
        // @ts-expect-error
        expect((await omitted)?.age).toBeUndefined();
      });
    });

    describe("relation.options()", () => {
      it("does not affect the base relation when options() is called after defining it", async () => {
        const PostSchema = createSchema("posts", {
          title: string(),
          contents: string(),
          authorId: objectId().optional(),
        });

        const schemas = defineSchemas({ users: UserSchema, posts: PostSchema });
        const relations = schemas.withRelations((r) => {
          const baseRelation = r.many.posts({ from: r.users._id, to: r.posts.authorId });
          // Calling .options() must not mutate baseRelation
          baseRelation.options({ select: { title: true } });
          return { users: { posts: baseRelation } };
        });
        const db = createDatabase(client.db(), relations);

        const user = await db.collections.users.insertOne({ name: "Alice", email: "alice@example.com" });
        await db.collections.posts.insertOne({ title: "Post 1", contents: "Hello world", authorId: user._id });

        // The base relation has no options — both fields must be present
        const populated = await db.collections.users.findById(user._id).populate({ posts: true });
        expect(populated?.posts[0].title).toBe("Post 1");
        expect(populated?.posts[0].contents).toBe("Hello world");
      });
    });
  });
});
