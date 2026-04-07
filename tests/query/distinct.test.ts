import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema, defineSchemas } from "../../src";
import { array, boolean, literal, mixed, number, object, string, tuple, union } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("Distinct Operations", async () => {
  const { server, client } = await createMockDatabase();

  const UserSchema = createSchema("users", {
    name: string(),
    email: string().lowercase(),
    age: number().optional(),
    isVerified: boolean().default(false),
    address: object({ city: string(), country: string() }).optional(),
    roles: array(string()).optional(),
    permissions: array(object({ resource: string(), action: string() })).optional(),
    tags: array(string()).nullable().optional(),
    badge: tuple([literal("role"), literal("scope"), union(literal("read"), literal("write"))]).optional(),
    meta: mixed().optional(),
  });

  const { collections } = createDatabase(client.db(), defineSchemas({ UserSchema }));

  const mockUsers = [
    {
      name: "anon",
      email: "anon@gmail.com",
      age: 17,
      isVerified: true,
      address: { city: "Lagos", country: "NG" },
      roles: ["viewer", "editor"],
      permissions: [
        { resource: "posts", action: "read" },
        { resource: "posts", action: "write" },
      ],
    },
    {
      name: "anon1",
      email: "anon1@gmail.com",
      age: 20,
      isVerified: false,
      address: { city: "Accra", country: "GH" },
      roles: ["viewer"],
      permissions: [{ resource: "posts", action: "read" }],
    },
    {
      name: "anon2",
      email: "anon2@gmail.com",
      age: 25,
      isVerified: true,
      address: { city: "Lagos", country: "NG" },
      roles: ["admin", "editor"],
      permissions: [
        { resource: "users", action: "read" },
        { resource: "users", action: "write" },
      ],
    },
    {
      name: "anon3",
      email: "anon3@gmail.com",
      age: undefined,
      isVerified: false,
      address: undefined,
      roles: undefined,
      permissions: undefined,
    },
  ];

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

  it("returns distinct values for a field", async () => {
    await collections.users.insertMany(mockUsers);
    const ages = await collections.users.distinct("age");
    expect(ages).toEqual(expect.arrayContaining([17, 20, 25]));
    expect(ages).toHaveLength(3);
  });

  it("deduplicates repeated values", async () => {
    await collections.users.insertMany([mockUsers[0], mockUsers[0], mockUsers[1]]);
    const ages = await collections.users.distinct("age");
    expect(ages).toEqual(expect.arrayContaining([17, 20]));
    expect(ages).toHaveLength(2);
  });

  it("returns empty array when collection is empty", async () => {
    const ages = await collections.users.distinct("age");
    expect(ages).toEqual([]);
  });

  it("returns empty array when no document has a value for the optional field", async () => {
    await collections.users.insertMany([mockUsers[3]]); // anon3 has age: undefined
    const ages = await collections.users.distinct("age");
    expect(ages).toEqual([]);
  });

  describe("filters", () => {
    it("filters with a scalar field query", async () => {
      await collections.users.insertMany(mockUsers);
      const names = await collections.users.distinct("name", { isVerified: true });
      expect(names).toEqual(expect.arrayContaining(["anon", "anon2"]));
      expect(names).toHaveLength(2);
    });

    it("filters by exact nested object match", async () => {
      await collections.users.insertMany(mockUsers);
      const names = await collections.users.distinct("name", {
        address: { city: "Lagos", country: "NG" },
      });
      expect(names).toEqual(expect.arrayContaining(["anon", "anon2"]));
      expect(names).toHaveLength(2);
    });

    it("filters by nested object field using dot-notation", async () => {
      await collections.users.insertMany(mockUsers);
      const names = await collections.users.distinct("name", {
        "address.city": "Accra",
      });
      expect(names).toEqual(["anon1"]);
    });

    it("filters where array field contains a value", async () => {
      await collections.users.insertMany(mockUsers);
      const names = await collections.users.distinct("name", { roles: "editor" });
      expect(names).toEqual(expect.arrayContaining(["anon", "anon2"]));
      expect(names).toHaveLength(2);
    });

    it("filters with $all operator on array field", async () => {
      await collections.users.insertMany(mockUsers);
      const names = await collections.users.distinct("name", {
        roles: { $all: ["viewer", "editor"] },
      });
      expect(names).toEqual(["anon"]);
    });

    it("returns empty array when no documents match filter", async () => {
      await collections.users.insertMany(mockUsers);
      const ages = await collections.users.distinct("age", { name: "nobody" });
      expect(ages).toEqual([]);
    });
  });

  describe("object and array keys", () => {
    it("returns distinct values for a key inside an object field", async () => {
      await collections.users.insertMany(mockUsers);
      const cities = await collections.users.distinct("address.city");
      // anon and anon2 share "Lagos", anon1 has "Accra", anon3 has no address
      expect(cities).toEqual(expect.arrayContaining(["Lagos", "Accra"]));
      expect(cities).toHaveLength(2);
    });

    it("returns distinct elements for an array key", async () => {
      await collections.users.insertMany(mockUsers);
      const roles = await collections.users.distinct("roles");
      // MongoDB unwinds arrays: viewer, editor, admin are the unique role strings
      expect(roles).toEqual(expect.arrayContaining(["viewer", "editor", "admin"]));
      expect(roles).toHaveLength(3);
    });

    it("returns distinct values for a key inside an array of objects field", async () => {
      await collections.users.insertMany(mockUsers);
      const resources = await collections.users.distinct("permissions.resource");
      // anon/anon1 have "posts", anon2 has "users"
      expect(resources).toEqual(expect.arrayContaining(["posts", "users"]));
      expect(resources).toHaveLength(2);
    });

    it("includes null alongside array elements for a nullable array field", async () => {
      await collections.users.insertMany([
        { name: "a", email: "a@example.com", isVerified: false, tags: ["x", "y"] },
        { name: "b", email: "b@example.com", isVerified: false, tags: ["y", "z"] },
        { name: "c", email: "c@example.com", isVerified: false, tags: null },
        { name: "d", email: "d@example.com", isVerified: false, tags: null },
      ]);
      const tags = await collections.users.distinct("tags");
      // MongoDB unwinds array elements and includes null once from all docs with a null value
      expect(tags).toEqual(expect.arrayContaining(["x", "y", "z", null]));
      expect(tags).toHaveLength(4);
    });

    it("unwinds tuple elements across documents", async () => {
      await collections.users.insertMany([
        { name: "a", email: "a@example.com", isVerified: false, badge: ["role", "scope", "read"] },
        { name: "b", email: "b@example.com", isVerified: false, badge: ["role", "scope", "write"] },
        { name: "c", email: "c@example.com", isVerified: false, badge: ["role", "scope", "read"] },
        { name: "d", email: "d@example.com", isVerified: false },
      ]);
      const values = await collections.users.distinct("badge");
      // MongoDB unwinds tuple (stored as array): "role" and "scope" appear in all, "read"/"write" differ
      expect(values).toEqual(expect.arrayContaining(["role", "scope", "read", "write"]));
      expect(values).toHaveLength(4);
    });

    it("returns distinct values for a specific tuple index", async () => {
      await collections.users.insertMany([
        { name: "a", email: "a@example.com", isVerified: false, badge: ["role", "scope", "read"] },
        { name: "b", email: "b@example.com", isVerified: false, badge: ["role", "scope", "write"] },
        { name: "c", email: "c@example.com", isVerified: false, badge: ["role", "scope", "read"] },
        { name: "d", email: "d@example.com", isVerified: false },
      ]);
      // Index selects the third tuple element
      const tiers = await collections.users.distinct("badge.2");
      expect(tiers).toEqual(expect.arrayContaining(["read", "write"]));
      expect(tiers).toHaveLength(2);
    });

    it("uses dot notation on a mixed field with a valid nested value", async () => {
      await collections.users.insertMany([
        { name: "a", email: "a@example.com", isVerified: false, meta: { region: "EU" } },
        { name: "b", email: "b@example.com", isVerified: false, meta: { region: "US" } },
        { name: "c", email: "c@example.com", isVerified: false, meta: { region: "EU" } },
        { name: "d", email: "d@example.com", isVerified: false },
      ]);
      const regions = await collections.users.distinct("meta.region");
      expect(regions).toEqual(expect.arrayContaining(["EU", "US"]));
      expect(regions).toHaveLength(2);
    });
  });
});
