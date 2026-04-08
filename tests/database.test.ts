import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas } from "../src";
import { number, string } from "../src/types";
import { createMockDatabase } from "./mock";

describe("Database options", async () => {
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

  it("applies validation option from createDatabase", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number().optional(),
      nickname: string().nullable(),
    });

    const db = createDatabase(client.db(), defineSchemas({ users: schema }), {
      validation: {
        validationLevel: "strict",
        validationAction: "error",
      },
    });
    await db.isReady;

    const rawCollection = client.db().collection("users");
    await expect(
      rawCollection.insertOne({
        name: "tom",
        age: "not-a-number",
        nickname: "tc",
      }),
    ).rejects.toThrow("Document failed validation");
  });

  it("supports initialize false after a prior initialize call", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number().optional(),
      nickname: string().nullable(),
    });

    const bootDb = createDatabase(client.db(), defineSchemas({ users: schema }), {
      initialize: false,
      validation: {
        validationLevel: "strict",
        validationAction: "error",
      },
    });
    await bootDb.initialize();

    const appDb = createDatabase(client.db(), defineSchemas({ users: schema }), { initialize: false });
    await appDb.isReady;

    const rawCollection = client.db().collection("users");
    await expect(
      rawCollection.insertOne({
        name: "tom",
        age: "not-a-number",
        nickname: "tc",
      }),
    ).rejects.toThrow("Document failed validation");
  });

  it("initialize validation false skips applying validators", async () => {
    const schema = createSchema("users", {
      name: string(),
      nickname: string(),
    });

    const db = createDatabase(client.db(), defineSchemas({ users: schema }), {
      initialize: false,
      validation: {
        validationLevel: "strict",
        validationAction: "error",
      },
    });
    await db.initialize({ validation: false });

    const rawCollection = client.db().collection("users");
    await expect(rawCollection.insertOne({})).resolves.toMatchObject({ acknowledged: true });
  });

  it("initialize indexes false skips schema index creation", async () => {
    const schema = createSchema("users", {
      username: string(),
    }).indexes(({ unique }) => ({
      username: unique("username"),
    }));

    const db = createDatabase(client.db(), defineSchemas({ users: schema }), { initialize: false });
    await db.initialize({ indexes: false });

    const rawCollection = client.db().collection("users");
    await rawCollection.insertOne({ username: "same-user" });
    await expect(rawCollection.insertOne({ username: "same-user" })).resolves.toMatchObject({ acknowledged: true });
  });

  it("initialize collections option initializes only selected schemas", async () => {
    const users = createSchema("users", {
      name: string(),
      nickname: string(),
    });
    const posts = createSchema("posts", {
      title: string(),
    });

    const db = createDatabase(client.db(), defineSchemas({ users, posts }), {
      initialize: false,
      validation: {
        validationLevel: "strict",
        validationAction: "error",
      },
    });
    await db.initialize({ collections: { users: true } });

    const existing = await client.db().listCollections({}, { nameOnly: true }).toArray();
    const existingNames = new Set(existing.map((collection) => collection.name));
    expect(existingNames.has("users")).toBe(true);
    expect(existingNames.has("posts")).toBe(false);

    const usersRaw = client.db().collection("users");
    await expect(usersRaw.insertOne({})).rejects.toThrow("Document failed validation");

    // posts collection wasn't initialized, so it is created lazily by MongoDB without schema validator.
    const postsRaw = client.db().collection("posts");
    await expect(postsRaw.insertOne({})).resolves.toMatchObject({ acknowledged: true });
  });

  it("schema validation option takes precedence over createDatabase validation option", async () => {
    const schema = createSchema("users", {
      name: string(),
    }).validation({
      validationLevel: "off",
    });

    const db = createDatabase(client.db(), defineSchemas({ users: schema }), {
      validation: {
        validationLevel: "strict",
        validationAction: "error",
      },
    });
    await db.isReady;

    const rawCollection = client.db().collection("users");
    await expect(rawCollection.insertOne({})).resolves.toMatchObject({ acknowledged: true });
  });

  it("applies validator to existing collection via collMod on reinitialize", async () => {
    const schema = createSchema("users", {
      name: string(),
      nickname: string(),
    });

    const firstDb = createDatabase(client.db(), defineSchemas({ users: schema }), { initialize: false });
    await firstDb.initialize({ validation: false });

    const rawCollection = client.db().collection("users");
    await expect(rawCollection.insertOne({})).resolves.toMatchObject({ acknowledged: true });

    const secondDb = createDatabase(client.db(), defineSchemas({ users: schema }), {
      initialize: false,
      validation: {
        validationLevel: "strict",
        validationAction: "error",
      },
    });
    await secondDb.initialize();

    await expect(rawCollection.insertOne({})).rejects.toThrow("Document failed validation");
  });
});
