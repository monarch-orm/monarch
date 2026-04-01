import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas, virtual } from "../../src";
import { getValidator } from "../../src/schema/validation";
import { boolean, number, string } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("Schema", async () => {
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

  it("omits fields", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number(),
      isAdmin: boolean(),
    }).omit({
      isAdmin: true,
    });
    const schemas = defineSchemas({ users: schema });
    const db = createDatabase(client.db(), schemas);
    const res = await db.collections.users.insertOne({
      name: "tom",
      age: 0,
      isAdmin: true,
    });
    expect(res).toStrictEqual({ _id: res._id, name: "tom", age: 0 });
    const doc = await db.collections.users.findOne({ _id: res._id });
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
    const schemas = defineSchemas({ users: schema });
    const db = createDatabase(client.db(), schemas);
    const res = await db.collections.users.insertOne({
      name: "tom cruise",
      age: 0,
      isAdmin: true,
    });
    const doc = await db.collections.users.findOne({ _id: res._id });
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
    const schemas = defineSchemas({ users: schema });
    const db = createDatabase(client.db(), schemas);
    const res = await db.collections.users.insertOne({
      name: "tom",
      age: 0,
      isAdmin: true,
    });
    const doc = await db.collections.users.findOne({ _id: res._id });
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
        role: virtual("isAdmin", ({ isAdmin }) => (isAdmin !== undefined ? "known" : "unknown")),
      });
    const schemas = defineSchemas({ users: schema });
    const db = createDatabase(client.db(), schemas);
    const res = await db.collections.users.insertOne({
      name: "tom",
      age: 0,
      isAdmin: true,
    });
    expect(res).toStrictEqual({
      _id: res._id,
      name: "tom",
      age: 0,
      role: "known",
    });
    const doc1 = await db.collections.users.findOne({ _id: res._id });
    expect(doc1).toStrictEqual({
      _id: res._id,
      name: "tom",
      age: 0,
      role: "known",
    });
    const doc2 = await db.collections.users.findOne({ _id: res._id }).omit({ age: true, isAdmin: true });
    expect(doc2).toStrictEqual({
      _id: res._id,
      name: "tom",
      role: "known",
    });
    const doc3 = await db.collections.users.findOne({ _id: res._id }).select({ role: true });
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
    const schemas = defineSchemas({ users: schema });
    const db = createDatabase(client.db(), schemas);
    const res = await db.collections.users.insertOne({
      name: "tom",
      age: 0,
      isAdmin: true,
      role: 1,
    });
    const doc = await db.collections.users.findOne({ _id: res._id });
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
    const schemas = defineSchemas({ users: schema });
    const db = createDatabase(client.db(), schemas);

    // duplicate username
    await db.collections.users.insertOne({
      firstname: "bob",
      surname: "paul",
      username: "bobpaul",
      age: 0,
    });
    await expect(async () => {
      await db.collections.users.insertOne({
        firstname: "bobby",
        surname: "paul",
        username: "bobpaul",
        age: 0,
      });
    }).rejects.toThrowError("E11000 duplicate key error");

    // duplicate firstname and lastname pair
    await db.collections.users.insertOne({
      firstname: "alice",
      surname: "wonder",
      username: "alicewonder",
      age: 0,
    });
    await expect(async () => {
      await db.collections.users.insertOne({
        firstname: "alice",
        surname: "wonder",
        username: "allywon",
        age: 0,
      });
    }).rejects.toThrowError("E11000 duplicate key error");
  });

  it("builds mongodb validator json schema", () => {
    const schema = createSchema("users", {
      name: string(),
      age: number().optional(),
      nickname: string().nullable(),
    });

    const validator = getValidator(schema);
    expect(validator).toStrictEqual({
      $jsonSchema: {
        bsonType: "object",
        additionalProperties: false,
        properties: {
          _id: { bsonType: "objectId" },
          name: { bsonType: "string" },
          age: { type: "number" },
          nickname: { bsonType: ["string", "null"] },
        },
        required: ["name", "nickname"],
      },
    });
  });

  it("enforces schema validation at database level", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number().optional(),
      nickname: string().nullable(),
    }).validation({
      validationLevel: "strict",
      validationAction: "error",
    });

    const db = createDatabase(client.db(), defineSchemas({ users: schema }));
    await db.isReady;

    const rawCollection = client.db().collection("users");

    await expect(
      rawCollection.insertOne({
        name: "tom",
        nickname: "tc",
      }),
    ).resolves.toMatchObject({
      acknowledged: true,
    });

    await expect(
      rawCollection.insertOne({
        name: "tom",
        age: "not-a-number",
        nickname: "tc",
      }),
    ).rejects.toThrowError("Document failed validation");

    await expect(
      rawCollection.insertOne({
        name: "tom",
      }),
    ).rejects.toThrowError("Document failed validation");

    await expect(
      rawCollection.insertOne({
        name: "tom",
        nickname: "tc",
        extra: true,
      }),
    ).rejects.toThrowError("Document failed validation");
  });

  describe("createDatabase options", () => {
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
      ).rejects.toThrowError("Document failed validation");
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
      ).rejects.toThrowError("Document failed validation");
    });
  });

  it("supports custom _id type with string", async () => {
    const schema = createSchema("products", {
      _id: string(),
      name: string(),
      price: number(),
    });
    const schemas = defineSchemas({ products: schema });
    const db = createDatabase(client.db(), schemas);

    const product = await db.collections.products.insertOne({
      _id: "product-123",
      name: "Laptop",
      price: 999,
    });
    expect(product).toStrictEqual({
      _id: "product-123",
      name: "Laptop",
      price: 999,
    });

    const foundProduct = await db.collections.products.findById("product-123");
    expect(foundProduct).toStrictEqual({
      _id: "product-123",
      name: "Laptop",
      price: 999,
    });
  });

  it("supports custom _id type with number", async () => {
    const schema = createSchema("orders", {
      _id: number(),
      customerId: string(),
      total: number(),
    });
    const schemas = defineSchemas({ orders: schema });
    const db = createDatabase(client.db(), schemas);

    const order = await db.collections.orders.insertOne({
      _id: 12345,
      customerId: "cust-001",
      total: 150.5,
    });
    expect(order).toStrictEqual({
      _id: 12345,
      customerId: "cust-001",
      total: 150.5,
    });

    const foundOrder = await db.collections.orders.findById(12345);
    expect(foundOrder).toStrictEqual({
      _id: 12345,
      customerId: "cust-001",
      total: 150.5,
    });
  });

  it("throws error when multiple collections use the same schema name", () => {
    const UserSchema = createSchema("users", {
      name: string(),
      age: number(),
    });

    const AnotherUserSchema = createSchema("users", {
      name: string(),
      email: string(),
    });

    expect(() => {
      const schemas = defineSchemas({ users: UserSchema, users2: AnotherUserSchema });
      createDatabase(client.db(), schemas);
    }).toThrowError("Schema with name 'users' already exists.");
  });
});
