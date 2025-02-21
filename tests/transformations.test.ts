import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema } from "../src";
import { string } from "../src/types";

const mongod = await MongoMemoryServer.create();

const uri = mongod.getUri();
const client = new MongoClient(uri);

describe("test for transformations", () => {
  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  it("returns value in lowercase", async () => {
    const UserSchema = createSchema("users", {
      name: string().lowercase(),
    });

    const { collections } = createDatabase(client.db(), {
      users: UserSchema,
    });

    const newUser = await collections.users
      .insertOne({
        name: "PRINCE",
      })
      .exec();
    expect(newUser).not.toBe(null);
    expect(newUser).toStrictEqual(
      expect.objectContaining({
        name: "prince",
      }),
    );

    const users = await collections.users.find({ _id: newUser?._id }).exec();
    expect(users.length).toBeGreaterThanOrEqual(1);

    const existingUser = users[0];
    expect(existingUser).toStrictEqual(
      expect.objectContaining({
        name: "prince",
      }),
    );
  });

  it("returns value in uppercase", async () => {
    const UserSchema = createSchema("userUpper", {
      name: string().uppercase(),
    });

    const { collections } = createDatabase(client.db(), {
      users: UserSchema,
    });

    const newUser = await collections.users
      .insertOne({
        name: "EriiC",
      })
      .exec();
    expect(newUser).not.toBe(null);
    expect(newUser).toStrictEqual(
      expect.objectContaining({
        name: "ERIIC",
      }),
    );

    const users = await collections.users.find({ _id: newUser?._id }).exec();
    expect(users.length).toBeGreaterThanOrEqual(1);

    const existingUser = users[0];
    expect(existingUser).toStrictEqual(
      expect.objectContaining({
        name: "ERIIC",
      }),
    );
  });

  it("returns value with '-go' at the end", async () => {
    const UserSchema = createSchema("userWithGo", {
      name: string().transform((value) => `${value}-go`),
    });
    const { collections } = createDatabase(client.db(), {
      users: UserSchema,
    });
    const newUser = await collections.users
      .insertOne({
        name: "mon",
      })
      .exec();

    expect(newUser).not.toBe(null);
    expect(newUser).toStrictEqual(
      expect.objectContaining({
        name: "mon-go",
      }),
    );

    const users = await collections.users.find({}).exec();
    expect(users.length).toBeGreaterThanOrEqual(1);

    const existingUser = users[0];
    expect(existingUser).toStrictEqual(
      expect.objectContaining({
        name: "mon-go",
      }),
    );
  });
});
