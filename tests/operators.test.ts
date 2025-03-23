import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, createSchema } from "../src";
import {
  and,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  neq,
  nor,
  notInArray,
  or,
} from "../src/operators";
import { boolean, number, string } from "../src/types";
import { createMockDatabase, mockUsers } from "./mock";

describe("Query operators", async () => {
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
    await collections.users.raw().dropIndexes();
    await collections.users.deleteMany({}).exec();
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  it("and operator", async () => {
    await collections.users.insertMany(mockUsers).exec();
    const users = await collections.users
      .find(
        and(
          {
            name: "anon",
          },
          {
            age: 17,
          },
        ),
      )
      .exec();

    expect(users.length).toBe(
      mockUsers.filter((user) => user.name === "anon" && user.age === 17)
        .length,
    );
  });

  it("or operator", async () => {
    await collections.users.insertMany(mockUsers).exec();
    const users = await collections.users
      .find(
        or(
          {
            name: "anon",
          },
          {
            name: "anon1",
          },
        ),
      )
      .exec();

    expect(users.length).toBe(
      mockUsers.filter((user) => user.name === "anon" || user.name === "anon1")
        .length,
    );
  });

  it("nor operator", async () => {
    await collections.users.insertMany(mockUsers).exec();
    const users = await collections.users
      .find(
        nor(
          {
            name: "anon",
          },
          {
            name: "anon1",
          },
        ),
      )
      .exec();

    expect(users.length).toBe(mockUsers.length - 2);
  });

  it("eq operator", async () => {
    await collections.users.insertMany(mockUsers).exec();
    const users = await collections.users
      .find({
        name: eq("anon1"),
      })
      .exec();

    expect(users.length).toBe(1);
  });

  it("ne operator", async () => {
    await collections.users.insertMany(mockUsers).exec();
    const users = await collections.users
      .find({
        name: neq("anon1"),
      })
      .exec();

    expect(users.length).toBe(mockUsers.length - 1);
  });

  it("gt operator", async () => {
    await collections.users.insertMany(mockUsers).exec();
    const users = await collections.users
      .find({
        age: gt(17),
      })
      .exec();

    expect(users.length).toBe(mockUsers.filter((user) => user.age > 17).length);
  });

  it("gte operator", async () => {
    await collections.users.insertMany(mockUsers).exec();
    const users = await collections.users
      .find({
        age: gte(17),
      })
      .exec();

    expect(users.length).toBe(
      mockUsers.filter((user) => user.age >= 17).length,
    );
  });

  it("lt operator", async () => {
    await collections.users.insertMany(mockUsers).exec();
    const users = await collections.users
      .find({
        age: lt(17),
      })
      .exec();

    expect(users.length).toBe(mockUsers.filter((user) => user.age < 17).length);
  });

  it("lte operator", async () => {
    await collections.users.insertMany(mockUsers).exec();
    const users = await collections.users
      .find({
        age: lte(17),
      })
      .exec();

    expect(users.length).toBe(
      mockUsers.filter((user) => user.age <= 17).length,
    );
  });

  it("in operator", async () => {
    const ageArray = [17];

    await collections.users.insertMany(mockUsers).exec();
    const users = await collections.users
      .find({
        age: inArray(ageArray),
      })
      .exec();

    expect(users.length).toBe(
      mockUsers.filter((user) => ageArray.includes(user.age)).length,
    );
  });

  it("nin operator", async () => {
    const ageArray = [17, 20, 25];

    await collections.users.insertMany(mockUsers).exec();
    const users = await collections.users
      .find({
        age: notInArray([17, 20, 25]),
        // age: 3
      })
      .exec();

    expect(users.length).toBe(
      mockUsers.filter((user) => !ageArray.includes(user.age)).length,
    );
  });
});
