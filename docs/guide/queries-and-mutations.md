# Queries & Mutations

Once your database is initialized, every collection becomes available under `db.collections`. This object provides a fully type-safe gateway to interact with your MongoDB database.

This page serves as an API reference for the core methods you can call directly on a collection instance to insert, update, delete, or retrieve data.

## Accessing Collections

You don't need to manually instantiate or wrap collections. Just access them directly off the `db.collections` object. Because of your schemas, Monarch knows exactly what data shapes are valid.

```typescript
// Access your "users" collection
// The collection is strictly typed!
await db.collections.users.insertOne({ name: "Alice" });
```

---

## Mutations

Mutations allow you to add, modify, or delete documents. All mutations immediately execute against the database.

### `insertOne(data)`

Inserts one document after parsing it through the schema.

```ts
const user = await db.collections.users.insertOne({
  name: "Alice",
  email: "alice@example.com",
});
```

### `insertMany(data[])`

Inserts multiple documents after parsing each one through the schema.

```ts
await db.collections.users.insertMany([
  { name: "Grace", email: "grace@example.com" },
  { name: "Linus", email: "linus@example.com" },
]);
```

---

## Queries

Queries retrieve data from the database. Unlike mutations, queries like `.find()` return a lazy builder that isn't executed until you `await` it.

### `find(filter?)`

Returns a query for multiple documents. It supports `select()`, `omit()`, `sort()`, `limit()`, `skip()`, `options()`, `cursor()`, and `populate()`.

```ts
const allUsers = await db.collections.users.find();

const verifiedUsers = await db.collections.users
  .find({ isVerified: true })
  .omit({ age: true })
  .limit(20)
  .skip(10)
  .sort({ email: "asc" });

const cursor = await db.collections.users.find({ isVerified: true }).cursor();
for await (const item of cursor) {
  console.log(item.email);
}
```

If your schema has relations, `find()` can populate them:

```ts
const posts = await db.collections.posts.find().populate({
  author: true,
  contributors: true,
});
```

Populate options support nested `populate`, plus `select`, `omit`, `sort`, `skip`, and `limit` on the populated query.

```ts
const users = await db.collections.users.find().populate({
  posts: {
    sort: { title: -1 },
    limit: 5,
    populate: {
      author: true,
    },
  },
});
```

### `findOne(filter)`

Returns a query for a single document. It supports `select()`, `omit()`, `options()`, and `populate()`.

```ts
const user = await db.collections.users.findOne({ email: "alice@example.com" });
```

### `findById(id)`

Returns a query for a single document by `_id`. For `objectId()` schemas, it accepts either an `ObjectId` or a valid ObjectId string.

```ts
const byId = await db.collections.users.findById("67f0123456789abcdef0123");
```

### `updateOne(filter, update)`

Updates one matching document. It supports `options()`.

```ts
await db.collections.users.updateOne(
  { email: "alice@example.com" },
  { $set: { isVerified: true } },
);
```

### `updateMany(filter, update)`

Updates all matching documents. It supports `options()`.

```ts
await db.collections.users.updateMany(
  { isVerified: false },
  { $set: { age: 18 } },
);
```

### `findOneAndUpdate(filter, update)`

Updates one document and returns the matched document by default, or the updated one when configured with `options({ returnDocument: "after" })`. It also supports `select()`, `omit()`, and `options()`.

```ts
const updated = await db.collections.users
  .findOneAndUpdate(
    { email: "alice@example.com" },
    { $set: { isVerified: true } },
  )
  .options({ returnDocument: "after" });
```

### `findByIdAndUpdate(id, update)`

Like `findOneAndUpdate()`, but matches by `_id`.

```ts
const updated = await db.collections.users
  .findByIdAndUpdate("67f0123456789abcdef0123", {
    $set: { isVerified: true },
  })
  .options({ returnDocument: "after" });
```

Schema parsing still runs for update input, so transforms like `.lowercase()` and validators still apply inside `$set`.

### `replaceOne(filter, replacement)`

Replaces one matching document. It supports `options()`.

```ts
await db.collections.users.replaceOne(
  { email: "alice@example.com" },
  { name: "Alice Lovelace", email: "alice@example.com" },
);
```

### `findOneAndReplace(filter, replacement)`

Replaces one document and returns the matched document by default, or the replacement when configured with `options({ returnDocument: "after" })`. It also supports `select()`, `omit()`, and `options()`.

```ts
const replaced = await db.collections.users
  .findOneAndReplace(
    { email: "alice@example.com" },
    { name: "Alice", email: "alice@example.com" },
  )
  .options({ returnDocument: "after" });
```

### `deleteOne(filter)`

Deletes one matching document.

```ts
await db.collections.users.deleteOne({ email: "alice@example.com" });
```

### `deleteMany(filter)`

Deletes all matching documents.

```ts
await db.collections.users.deleteMany({ isVerified: false });
```

### `findOneAndDelete(filter)`

Deletes one matching document and returns it.

```ts
const deleted = await db.collections.users.findOneAndDelete({
  email: "alice@example.com",
});
```

### `findByIdAndDelete(id)`

Deletes one document by `_id` and returns it.

```ts
const deleted = await db.collections.users.findByIdAndDelete("67f0123456789abcdef0123");
```

### Other Collection Methods

### `distinct(key, filter?)`

Returns a query for the distinct values of a field.

```ts
const emails = await db.collections.users.distinct("email", { isVerified: true });
```

### `bulkWrite(operations)`

Runs multiple MongoDB bulk write operations.

```ts
await db.collections.users.bulkWrite([
  {
    insertOne: {
      document: {
        name: "Alice",
        email: "alice@example.com",
      },
    },
  },
  {
    updateOne: {
      filter: { email: "alice@example.com" },
      update: { $set: { isVerified: true } },
    },
  },
]);
```

### `countDocuments(filter?, options?)`

Counts matching documents.

```ts
const verifiedCount = await db.collections.users.countDocuments({ isVerified: true });
```

### `estimatedDocumentCount(options?)`

Returns MongoDB's estimated document count for the collection.

```ts
const totalCount = await db.collections.users.estimatedDocumentCount();
```

### `aggregate()`

Builds an aggregation pipeline. It supports `options()`.

```ts
const result = await db.collections.users
  .aggregate()
  .addStage({ $match: { isVerified: true } })
  .addStage({ $group: { _id: "$isVerified", count: { $sum: 1 } } });
```

### `raw()`

Returns the underlying MongoDB collection.

```ts
const rawUsers = await db.collections.users.raw().find().toArray();
```

Queries are lazy, so you can build and reuse them before execution. They run only when you `await` them or call a promise method like `.then()`, `.catch()`, or `.finally()`.

```ts
let verifiedUsersQuery = db.collections.users
  .find({ isVerified: true })
  .omit({ age: true })
  .sort({ email: "asc" });

if (limitResults) {
  verifiedUsersQuery = verifiedUsersQuery.limit(10);
}

const verifiedUsers = await verifiedUsersQuery;
```
