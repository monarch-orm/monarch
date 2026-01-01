import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema } from "../../src";
import { boolean, number, string } from "../../src/types";
import { createMockDatabase, mockUsers } from "../mock";

describe("Delete Operations", async () => {
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
    await collections.users.deleteMany({}).exec();
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  it("finds one and deletes", async () => {
    await collections.users.insertOne(mockUsers[0]).exec();
    const deletedUser = await collections.users.findOneAndDelete({ email: "anon@gmail.com" }).exec();
    expect(deletedUser).not.toBe(null);
    expect(deletedUser?.email).toBe("anon@gmail.com");
  });

  it("deletes one document", async () => {
    await collections.users.insertOne(mockUsers[2]).exec();
    const deleted = await collections.users.deleteOne({ email: "anon2@gmail.com" }).exec();
    expect(deleted.deletedCount).toBe(1);
  });
});
