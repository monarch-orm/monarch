import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  afterAll,
  afterEach,
  assert,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import {
  createDatabase,
  createSchema,
  createdAt,
  date,
  dateString,
  updatedAt,
} from "../src";

const mongod = await MongoMemoryServer.create();

const uri = mongod.getUri();
const client = new MongoClient(uri);

const delay = (duration: number) =>
  new Promise((res) => setTimeout(res, duration));

describe("test for date", () => {
  beforeAll(async () => {
    await client.connect();
  });

  afterEach(async () => {
    await client.db().dropDatabase();
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  it("inserts date object and finds it", async () => {
    const UserSchema = createSchema("users", {
      currentDate: date(),
      currentDateString: dateString(),
    });
    const markedDate = new Date();
    const { db, collections } = createDatabase(client.db(), {
      users: UserSchema,
    });

    // collections query builder
    const newUser = await collections.users
      .insertOne({ currentDate: markedDate, currentDateString: markedDate })
      .exec();
    expect(newUser).not.toBe(null);
    expect(newUser).toStrictEqual(
      expect.objectContaining({
        currentDate: markedDate,
        currentDateString: markedDate.toISOString(),
      }),
    );

    // db query builder
    const users = await db(UserSchema)
      .find({
        currentDate: markedDate,
        currentDateString: markedDate.toISOString(),
      })
      .exec();

    expect(users.length).toBeGreaterThanOrEqual(1);

    const existingUser = users[0];
    expect(existingUser).toStrictEqual(
      expect.objectContaining({
        currentDate: markedDate,
        currentDateString: markedDate.toISOString(),
      }),
    );
  });

  it("createdAt date", async () => {
    const UserSchema = createSchema("users", {
      createdAt: createdAt(),
    });
    const beforeInsert = new Date();
    const { db, collections } = createDatabase(client.db(), {
      users: UserSchema,
    });

    // check inserted document date is in between beforeInsert and afterInsert
    await delay(10);
    const newUser = await collections.users.insertOne({}).exec();
    await delay(10);
    const afterInsert = new Date();
    expect(newUser).not.toBe(null);
    expect(new Date(newUser.createdAt).getTime()).toBeGreaterThan(
      beforeInsert.getTime(),
    );
    expect(new Date(newUser.createdAt).getTime()).toBeLessThan(
      afterInsert.getTime(),
    );

    // check existing document date is in between beforeInsert and afterInsert
    const existingUser = await db(UserSchema).findOne({}).exec();
    assert(existingUser);
    expect(new Date(existingUser.createdAt).getTime()).toBeGreaterThan(
      beforeInsert.getTime(),
    );
    expect(new Date(existingUser.createdAt).getTime()).toBeLessThan(
      afterInsert.getTime(),
    );
  });

  it("updatedAt date", async () => {
    const UserSchema = createSchema("users", {
      updatedAt: updatedAt(),
    });
    const { db, collections } = createDatabase(client.db(), {
      users: UserSchema,
    });

    // check inserted document date is in between beforeInsert and afterInsert
    const beforeInsert = new Date();
    await delay(10);
    const newUser = await collections.users.insertOne({}).exec();
    await delay(10);
    const afterInsert = new Date();
    expect(new Date(newUser.updatedAt).getTime()).toBeGreaterThan(
      beforeInsert.getTime(),
    );
    expect(new Date(newUser.updatedAt).getTime()).toBeLessThan(
      afterInsert.getTime(),
    );

    // check existing document date is in between beforeInsert and afterInsert
    const existingUser = await db(UserSchema).findOne({}).exec();
    assert(existingUser);
    expect(new Date(existingUser.updatedAt).getTime()).toBeGreaterThan(
      beforeInsert.getTime(),
    );
    expect(new Date(existingUser.updatedAt).getTime()).toBeLessThan(
      afterInsert.getTime(),
    );

    // update user
    const beforeUpdate = new Date();
    await delay(10);
    await db(UserSchema).updateOne({}, { $set: {} }).exec();
    await delay(10);
    const afterUpdate = new Date();

    // check updated document date is in between beforeInsert and afterInsert
    const updatedUser = await db(UserSchema).findOne({}).exec();
    assert(updatedUser);
    expect(new Date(updatedUser.updatedAt).getTime()).toBeGreaterThan(
      beforeInsert.getTime(),
    );
    expect(new Date(updatedUser.updatedAt).getTime()).toBeGreaterThan(
      afterInsert.getTime(),
    );
    expect(new Date(updatedUser.updatedAt).getTime()).toBeGreaterThan(
      beforeUpdate.getTime(),
    );
    expect(new Date(updatedUser.updatedAt).getTime()).toBeLessThan(
      afterUpdate.getTime(),
    );
  });
});
