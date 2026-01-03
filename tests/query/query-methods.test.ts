import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema } from "../../src";
import { boolean, number, string } from "../../src/types";
import { createMockDatabase, mockUsers } from "../mock";

describe("Query Methods", async () => {
  const { server, client } = await createMockDatabase();

  const UserSchema = createSchema("users", {
    name: string().optional(),
    email: string().lowercase().optional(),
    age: number().optional().default(10),
    isVerified: boolean().default(false),
  });

  const { collections } = createDatabase(client.db(), {
    users: UserSchema,
  });

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
});
