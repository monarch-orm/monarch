import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createDatabase, createSchema } from "../../src";
import { boolean, number, pipe, string, type } from "../../src/types";
import { createMockDatabase } from "../mock";

describe("Update Hooks", async () => {
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

  it("updates after initial save", async () => {
    const schema = createSchema("users", {
      name: string(),
      age: number().onUpdate(() => 100),
      isAdmin: boolean(),
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
    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      age: 100,
      isAdmin: true,
    });
  });

  it("updates with transform", async () => {
    let nonce = 1;
    const onUpdateTrap = vi.fn(() => nonce++);
    const transformTrap = vi.fn((val: number) => String(val));
    const schema = createSchema("users", {
      name: string(),
      nonce: number().onUpdate(onUpdateTrap).transform(transformTrap),
    });
    const db = createDatabase(client.db(), { users: schema });
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        nonce: 0,
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(transformTrap).toBeCalledTimes(1);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: "0" });

    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(transformTrap).toBeCalledTimes(2);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: "1",
    });
  });

  it("updates with validate", async () => {
    let nonce = 1;
    const onUpdateTrap = vi.fn(() => nonce++);
    const schema = createSchema("users", {
      name: string(),
      nonce: number()
        .onUpdate(onUpdateTrap)
        .validate(() => true, ""),
    });
    const db = createDatabase(client.db(), { users: schema });
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        nonce: 0,
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: 0 });

    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: 1,
    });
  });

  it("updates with optional", async () => {
    let nonce = 1;
    const onUpdateTrap = vi.fn(() => nonce++);
    const schema = createSchema("users", {
      name: string(),
      nonce: number().onUpdate(onUpdateTrap).optional(),
    });
    const db = createDatabase(client.db(), { users: schema });
    const res = await db.collections.users
      .insertOne({
        name: "tom",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(res).toStrictEqual({ _id: res._id, name: "tom" });

    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: 1,
    });
  });

  it("updates with nullable", async () => {
    let nonce = 1;
    const onUpdateTrap = vi.fn(() => nonce++);
    const schema = createSchema("users", {
      name: string(),
      nonce: number().onUpdate(onUpdateTrap).nullable(),
    });
    const db = createDatabase(client.db(), { users: schema });
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        nonce: null,
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: null });

    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: 1,
    });
  });

  it("updates with defaulted", async () => {
    let nonce = 1;
    const onUpdateTrap = vi.fn(() => nonce++);
    const schema = createSchema("users", {
      name: string(),
      nonce: number().onUpdate(onUpdateTrap).default(0),
    });
    const db = createDatabase(client.db(), { users: schema });
    const res = await db.collections.users
      .insertOne({
        name: "tom",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: 0 });

    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: 1,
    });
  });

  it("updates with pipe", async () => {
    let nonce = 1;
    const onUpdateTrap = vi.fn(() => nonce++);
    const schema = createSchema("users", {
      name: string(),
      nonce: pipe(
        type((input: number) => String(input)),
        string(),
      ).onUpdate(onUpdateTrap),
    });
    const db = createDatabase(client.db(), { users: schema });
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        nonce: 0,
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: "0" });

    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: "1",
    });
  });

  it("onUpdate chained before transform applies transform to updated value", async () => {
    let nonce = 100;
    const onUpdateTrap = vi.fn(() => nonce++);
    const transformTrap = vi.fn((val: number) => String(val));
    const schema = createSchema("users", {
      name: string(),
      nonce: number().onUpdate(onUpdateTrap).transform(transformTrap),
    });
    const db = createDatabase(client.db(), { users: schema });

    // Insert initial document
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        nonce: 50,
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(transformTrap).toBeCalledTimes(1);
    expect(transformTrap).toHaveBeenNthCalledWith(1, 50);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: "50" });

    // Update document - onUpdate should trigger and transform should be applied to the updated value
    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(onUpdateTrap).toHaveReturnedWith(100);
    expect(transformTrap).toBeCalledTimes(2);
    expect(transformTrap).toHaveBeenNthCalledWith(2, 100);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: "100",
    });
  });

  it("onUpdate chained after transform still applies transform to updated value", async () => {
    let nonce = 100;
    const onUpdateTrap = vi.fn(() => nonce++);
    const transformTrap = vi.fn((val: number) => String(val));
    const schema = createSchema("users", {
      name: string(),
      nonce: number().transform(transformTrap).onUpdate(onUpdateTrap),
    });
    const db = createDatabase(client.db(), { users: schema });

    // Insert initial document
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        nonce: 50,
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(transformTrap).toBeCalledTimes(1);
    expect(transformTrap).toHaveBeenNthCalledWith(1, 50);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: "50" });

    // Update document - onUpdate creates updater using transformed parser, so transform IS applied
    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(onUpdateTrap).toHaveReturnedWith(100);
    // Transform IS called because onUpdate uses the transformed parser
    expect(transformTrap).toBeCalledTimes(2);
    expect(transformTrap).toHaveBeenNthCalledWith(2, 100);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: "100", // Transformed to string
    });
  });

  it("onUpdate chained before validate does NOT apply validate to updated value", async () => {
    let nonce = 100;
    const onUpdateTrap = vi.fn(() => nonce++);
    const validateTrap = vi.fn((val: number) => val >= 0 && val <= 50);
    const schema = createSchema("users", {
      name: string(),
      nonce: number().onUpdate(onUpdateTrap).validate(validateTrap, "nonce must be between 0 and 50"),
    });
    const db = createDatabase(client.db(), { users: schema });

    // Insert initial document with valid value
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        nonce: 25,
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(validateTrap).toBeCalledTimes(1);
    expect(validateTrap).toHaveBeenNthCalledWith(1, 25);
    expect(validateTrap).toHaveReturnedWith(true);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: 25 });

    // Update document - onUpdate returns 100 which is > 50, but validation should NOT be applied
    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(onUpdateTrap).toHaveReturnedWith(100);
    // Validate should NOT be called on update value
    expect(validateTrap).toBeCalledTimes(1);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: 100, // Value that would fail validation if it were applied
    });
  });

  it("onUpdate chained after validate still applies validate to updated value", async () => {
    let nonce = 10;
    const onUpdateTrap = vi.fn(() => nonce++);
    const validateTrap = vi.fn((val: number) => val >= 0 && val <= 50);
    const schema = createSchema("users", {
      name: string(),
      nonce: number().validate(validateTrap, "nonce must be between 0 and 50").onUpdate(onUpdateTrap),
    });
    const db = createDatabase(client.db(), { users: schema });

    // Insert initial document with valid value
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        nonce: 25,
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(validateTrap).toBeCalledTimes(1);
    expect(validateTrap).toHaveBeenNthCalledWith(1, 25);
    expect(validateTrap).toHaveReturnedWith(true);
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: 25 });

    // Update document - onUpdate creates updater using validated parser, so validate IS applied
    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(onUpdateTrap).toHaveReturnedWith(10);
    // Validate IS called because onUpdate uses the validated parser
    expect(validateTrap).toBeCalledTimes(2);
    expect(validateTrap).toHaveBeenNthCalledWith(2, 10);
    expect(validateTrap).toHaveReturnedWith(true);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: 10, // Valid value that passed validation
    });
  });

  it("complex chaining: transform -> onUpdate -> validate applies transform but not validate to update", async () => {
    let nonce = 5;
    const onUpdateTrap = vi.fn(() => nonce++);
    const transformTrap = vi.fn((val: number) => String(val));
    const validateTrap = vi.fn((val: string) => val.length <= 2);
    const schema = createSchema("users", {
      name: string(),
      nonce: number()
        .transform(transformTrap)
        .onUpdate(onUpdateTrap)
        .validate(validateTrap, "transformed value must have length <= 2"),
    });
    const db = createDatabase(client.db(), { users: schema });

    // Insert initial document
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        nonce: 7,
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(transformTrap).toBeCalledTimes(1);
    expect(transformTrap).toHaveBeenNthCalledWith(1, 7);
    expect(validateTrap).toBeCalledTimes(1);
    expect(validateTrap).toHaveBeenNthCalledWith(1, "7");
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: "7" });

    // Update document - transform IS applied (from before onUpdate), validate is NOT (after onUpdate)
    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(onUpdateTrap).toHaveReturnedWith(5);
    // Transform IS called (onUpdate uses transformed parser)
    expect(transformTrap).toBeCalledTimes(2);
    expect(transformTrap).toHaveBeenNthCalledWith(2, 5);
    // Validate is NOT called (chained after onUpdate)
    expect(validateTrap).toBeCalledTimes(1);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: "5", // Transformed but not validated
    });
  });

  it("complex chaining: onUpdate -> transform -> validate applies both transform and validate to update", async () => {
    let nonce = 5;
    const onUpdateTrap = vi.fn(() => nonce++);
    const transformTrap = vi.fn((val: number) => String(val));
    const validateTrap = vi.fn((val: string) => val.length <= 2);
    const schema = createSchema("users", {
      name: string(),
      nonce: number()
        .onUpdate(onUpdateTrap)
        .transform(transformTrap)
        .validate(validateTrap, "transformed value must have length <= 2"),
    });
    const db = createDatabase(client.db(), { users: schema });

    // Insert initial document
    const res = await db.collections.users
      .insertOne({
        name: "tom",
        nonce: 7,
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(0);
    expect(transformTrap).toBeCalledTimes(1);
    expect(transformTrap).toHaveBeenNthCalledWith(1, 7);
    expect(validateTrap).toBeCalledTimes(1);
    expect(validateTrap).toHaveBeenNthCalledWith(1, "7");
    expect(res).toStrictEqual({ _id: res._id, name: "tom", nonce: "7" });

    // Update document - transform IS in update chain, validate is NOT
    const updatedDoc = await db.collections.users
      .findOneAndUpdate({ _id: res._id }, { $set: { name: "jerry" } })
      .options({
        returnDocument: "after",
      })
      .exec();
    expect(onUpdateTrap).toBeCalledTimes(1);
    expect(onUpdateTrap).toHaveReturnedWith(5);
    expect(transformTrap).toBeCalledTimes(2);
    expect(transformTrap).toHaveBeenNthCalledWith(2, 5);
    // Validate is NOT called on update value
    expect(validateTrap).toBeCalledTimes(1);
    expect(updatedDoc).toStrictEqual({
      _id: res._id,
      name: "jerry",
      nonce: "5", // Transformed but not validated
    });
  });
});
