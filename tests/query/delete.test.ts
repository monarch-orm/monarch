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
    await collections.users.deleteMany({});
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  it("finds one and deletes", async () => {
    await collections.users.insertOne(mockUsers[0]);
    const deletedUser = await collections.users.findOneAndDelete({ email: "anon@gmail.com" });
    expect(deletedUser).not.toBe(null);
    expect(deletedUser?.email).toBe("anon@gmail.com");
  });

  it("deletes one document", async () => {
    await collections.users.insertOne(mockUsers[2]);
    const deleted = await collections.users.deleteOne({ email: "anon2@gmail.com" });
    expect(deleted.deletedCount).toBe(1);
  });

  it("finds and deletes one by ObjectId", async () => {
    const user = await collections.users.insertOne(mockUsers[0]);

    const deletedUser = await collections.users.findByIdAndDelete(user._id);

    expect(deletedUser).not.toBe(null);
    expect(deletedUser?._id).toStrictEqual(user._id);
    expect(deletedUser?.email).toBe(mockUsers[0].email);

    // Verify it was actually deleted
    const found = await collections.users.findById(user._id);
    expect(found).toBe(null);
  });

  it("finds and deletes one by ObjectId string", async () => {
    const user = await collections.users.insertOne(mockUsers[1]);

    const deletedUser = await collections.users.findByIdAndDelete(user._id.toString());

    expect(deletedUser).not.toBe(null);
    expect(deletedUser?._id).toStrictEqual(user._id);
    expect(deletedUser?.email).toBe(mockUsers[1].email);

    // Verify it was actually deleted
    const found = await collections.users.findById(user._id);
    expect(found).toBe(null);
  });

  it("findByIdAndDelete returns null when document not found", async () => {
    const { ObjectId } = await import("mongodb");
    const userId = new ObjectId();
    const deletedUser = await collections.users.findByIdAndDelete(userId);
    expect(deletedUser).toBe(null);
  });
});
