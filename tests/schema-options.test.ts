import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, virtual } from "../src";
import { boolean, number, string } from "../src/types";

const server = await MongoMemoryServer.create();
const client = new MongoClient(server.getUri());

describe("Schema options", () => {
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

  it("omits fields", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number(),
      isAdmin: boolean(),
    }).omit({
      isAdmin: true,
    });
    const db = createDatabase(client.db(), { users: schema });
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        age: 0,
        isAdmin: true,
      })
      .exec();
    expect(res).toStrictEqual({ _id: res._id, name: "tom", age: 0 });
    const doc = await db.collections.users.findOne({ _id: res._id }).exec();
    expect(doc).toStrictEqual({ _id: res._id, name: "tom", age: 0 });
  });

  it("adds virtuals fields", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number(),
      isAdmin: boolean(),
    }).virtuals({
      role: virtual("isAdmin", ({ isAdmin }) => (isAdmin ? "admin" : "user")),
    });
    const db = createDatabase(client.db(), { users: schema });
    const res = await db.collections.users
      .insertOne({
        name: "tom cruise",
        age: 0,
        isAdmin: true,
      })
      .exec();
    const doc = await db.collections.users.findOne({ _id: res._id }).exec();
    expect(doc).toStrictEqual({
      _id: res._id,
      name: "tom cruise",
      age: 0,
      isAdmin: true,
      role: "admin",
    });
  });

  it("omits virtual fields", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number(),
      isAdmin: boolean(),
    })
      .omit({
        // @ts-expect-error
        role: true,
      })
      .virtuals({
        role: virtual("isAdmin", ({ isAdmin }) => (isAdmin ? "admin" : "user")),
      });
    const db = createDatabase(client.db(), { users: schema });
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        age: 0,
        isAdmin: true,
      })
      .exec();
    const doc = await db.collections.users.findOne({ _id: res._id }).exec();
    expect(doc).toStrictEqual({
      _id: res._id,
      name: "tom",
      age: 0,
      isAdmin: true,
    });
  });

  it("can access omitted fields in virtuals", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number(),
      isAdmin: boolean(),
    })
      .omit({
        isAdmin: true,
      })
      .virtuals({
        role: virtual("isAdmin", ({ isAdmin }) =>
          isAdmin !== undefined ? "known" : "unknown",
        ),
      });
    const db = createDatabase(client.db(), { users: schema });
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        age: 0,
        isAdmin: true,
      })
      .exec();
    expect(res).toStrictEqual({
      _id: res._id,
      name: "tom",
      age: 0,
      role: "known",
    });
    const doc1 = await db.collections.users.findOne({ _id: res._id }).exec();
    expect(doc1).toStrictEqual({
      _id: res._id,
      name: "tom",
      age: 0,
      role: "known",
    });
    const doc2 = await db.collections.users
      .findOne({ _id: res._id })
      .omit({ age: true, isAdmin: true })
      .exec();
    expect(doc2).toStrictEqual({
      _id: res._id,
      name: "tom",
      role: "known",
    });
    const doc3 = await db.collections.users
      .findOne({ _id: res._id })
      .select({ role: true })
      .exec();
    expect(doc3).toStrictEqual({
      _id: res._id,
      role: "known",
    });
  });

  it("replaces fields with virtuals", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number(),
      isAdmin: boolean(),
      role: number(), // manually added field to replace
    }).virtuals({
      role: virtual("isAdmin", ({ isAdmin }) => (isAdmin ? "admin" : "user")),
    });
    const db = createDatabase(client.db(), { users: schema });
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        age: 0,
        isAdmin: true,
        role: 1,
      })
      .exec();
    const doc = await db.collections.users.findOne({ _id: res._id }).exec();
    expect(doc).toStrictEqual({
      _id: res._id,
      name: "tom",
      age: 0,
      isAdmin: true,
      role: "admin",
    });
  });

  it("creates index", async () => {
    const schema = createSchema("users", {
      firstname: string(),
      surname: string(),
      username: string(),
      age: number(),
    }).indexes(({ createIndex, unique }) => ({
      username: unique("username"),
      fullname: createIndex({ firstname: 1, surname: 1 }, { unique: true }),
    }));
    const db = createDatabase(client.db(), { users: schema });

    // duplicate username
    await db.collections.users
      .insertOne({
        firstname: "bob",
        surname: "paul",
        username: "bobpaul",
        age: 0,
      })
      .exec();
    await expect(async () => {
      await db.collections.users
        .insertOne({
          firstname: "bobby",
          surname: "paul",
          username: "bobpaul",
          age: 0,
        })
        .exec();
    }).rejects.toThrow("E11000 duplicate key error");

    // duplicate firstname and lastname pair
    await db.collections.users
      .insertOne({
        firstname: "alice",
        surname: "wonder",
        username: "alicewonder",
        age: 0,
      })
      .exec();
    await expect(async () => {
      await db.collections.users
        .insertOne({
          firstname: "alice",
          surname: "wonder",
          username: "allywon",
          age: 0,
        })
        .exec();
    }).rejects.toThrow("E11000 duplicate key error");
  });
});
