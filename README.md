# Monarch ORM

Type-safe MongoDB collections, schema parsing, relations, and query helpers for TypeScript.

## Features

- **Strongly Typed:** Infer schema inputs and outputs for queries and collection methods.
- **Flexible Schemas:** Use transforms, defaults, validation, virtuals, renames, and default omit rules.
- **Typed Relations:** Define one, many, and refs relations with typed population support.
- **Familiar MongoDB Access:** Use typed query methods, operators, aggregation, and raw collection access.
- **Collection Initialization:** Automatically initialize collections with indexes and JSON Schema validation, or do it manually.

## Installation

```bash
npm install monarch-orm
```

## Quick Start

```ts
import {
  createClient,
  createDatabase,
  createSchema,
  defineSchemas,
} from "monarch-orm";
import { boolean, number, string } from "monarch-orm/types";

// Define collection schema.
const userSchema = createSchema("users", {
  name: string().trim(),
  email: string().lowercase(),
  age: number().integer().min(13).optional(),
  isVerified: boolean().default(false),
});

const schemas = defineSchemas({ userSchema });

// Create and connect the MongoDB client.
const client = createClient(process.env.MONGODB_URI!);
await client.connect();

// Create a database instance.
const db = createDatabase(client.db("app"), schemas);

// Insert one document.
const user = await db.collections.users.insertOne({
  name: "Alice",
  email: "alice@example.com",
});

// Query documents.
const users = await db.collections.users
  .find({ isVerified: false })
  .select({ name: true, email: true })
  .sort({ email: "asc" });
```

## Schemas

`createSchema()` defines a collection's shape. If you do not define `_id`, it defaults to `objectId()`. When a schema uses `ObjectId` for `_id`, Monarch makes the input optional for inserts.

```ts
import { createSchema } from "monarch-orm";
import { array, date, object, objectId, string } from "monarch-orm/types";

const postSchema = createSchema("posts", {
  title: string().trim().nonempty(),
  body: string(),
  authorId: objectId(),
  contributorIds: array(objectId()).default([]),
  metadata: object({
    slug: string().lowercase(),
  }),
  publishedAt: date().optional(),
});
```

`defineSchemas()` normalizes schemas keyed by collection name. It also holds schema relations.

```ts
const schemas = defineSchemas({ userSchema, postSchema });
```

### Relations

Use `withRelations()` on a schemas object to define typed relations.

```ts
const schemas = defineSchemas({ userSchema, postSchema });

const schemasWithRelations = schemas.withRelations((s) => ({
  users: {
    posts: s.users.$many.posts({ from: "_id", to: "authorId" }),
  },
  posts: {
    author: s.posts.$one.users({ from: "authorId", to: "_id" }),
    contributors: s.posts.$refs.users({ from: "contributorIds", to: "_id" }),
  },
}));
```

#### One relations

Use `$one` when a local field points to a single document in another collection.

```ts
author: s.posts.$one.users({ from: "authorId", to: "_id" })
```

#### Many relations

Use `$many` when one document relates to many documents in another collection by matching a local field against a foreign field.

```ts
posts: s.users.$many.posts({ from: "_id", to: "authorId" })
```

#### Refs relations

Use `$refs` when a local array field stores multiple references to another collection.

```ts
contributors: s.posts.$refs.users({ from: "contributorIds", to: "_id" })
```

### Schema Groups

You can split schemas by concern or by file, define relations inside each group, then merge them together. This works well when different modules own different parts of your data model.

```ts
import { createSchema, defineSchemas, mergeSchemas } from "monarch-orm";
import { objectId, string } from "monarch-orm/types";

const userSchema = createSchema("users", {
  name: string(),
  tutorId: objectId().optional(),
});

const userGroup = defineSchemas({ userSchema }).withRelations((s) => ({
  users: {
    tutor: s.users.$one.users({ from: "tutorId", to: "_id" }),
  },
}));

const postSchema = createSchema("posts", {
  title: string(),
  authorId: objectId(),
});

const categorySchema = createSchema("categories", {
  name: string(),
  parentId: objectId().optional(),
});

const contentGroup = defineSchemas({ postSchema, categorySchema }).withRelations((s) => ({
  categories: {
    parent: s.categories.$one.categories({ from: "parentId", to: "_id" }),
  },
}));

const schemas = mergeSchemas(userGroup, contentGroup);
```

You can also add cross-group relations after merging:

```ts
const schemasWithCrossGroupRelations = schemas.withRelations((s) => ({
  users: {
    posts: s.users.$many.posts({ from: "_id", to: "authorId" }),
  },
  posts: {
    author: s.posts.$one.users({ from: "authorId", to: "_id" }),
  },
}));
```

### Databases

Pass schemas object into `createDatabase()` to create db with typed collections.

```ts
const schemas = defineSchemas({ userSchema, postSchema });

const db = createDatabase(client.db("app"), schemas);
await db.isReady;
```

By default, `createDatabase()` initializes all collections. If you want to do that manually, disable initialization and call `db.initialize()` yourself. `initialize()` can be configured and can target only selected schemas.

```ts
const db = createDatabase(client.db("app"), schemas, {
  initialize: false,
});

await db.initialize({
  indexes: true,
  validation: true,
  collections: {
    users: true,
  },
});
```

`db.isReady` resolves when database initialization has finished. Each collection also has its own `isReady`, for example `db.collections.users.isReady`.

## Queries

Collections expose typed query methods.

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

Builds an aggregation pipeline.

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

### Schema features

These schema methods control default output behavior, initialization behavior, and automatic write-time behavior.

#### Omit fields from output

`schema.omit()` defines the default output projection for that schema. Query-level `.select()` or `.omit()` overrides that default for the current query.

```ts
const userSchema = createSchema("users", {
  name: string(),
  passwordHash: string(),
}).omit({
  passwordHash: true,
});
```

#### Virtual fields

`schema.virtuals()` adds computed output fields. Virtuals are not stored in MongoDB, but they are available in query results and can depend on omitted source fields.

```ts
import { createSchema, virtual } from "monarch-orm";
import { boolean, string } from "monarch-orm/types";

const userSchema = createSchema("users", {
  isAdmin: boolean(),
  firstName: string(),
  lastName: string(),
}).virtuals({
  role: virtual("isAdmin", ({ isAdmin }) => (isAdmin ? "admin" : "user")),
  fullName: virtual(["firstName", "lastName"], ({ firstName, lastName }) => `${firstName} ${lastName}`),
});
```

#### Rename output fields

`schema.rename()` changes field names in query output without changing how the field is stored in MongoDB.

```ts
const userSchema = createSchema("users", {
  name: string(),
}).rename({
  _id: "id",
  name: "fullName",
});
```

#### Indexes

`schema.indexes()` declares the indexes Monarch should keep in sync during collection initialization.

```ts
const userSchema = createSchema("users", {
  email: string().lowercase(),
  name: string(),
}).indexes(({ createIndex, unique }) => ({
  email: unique("email"),
  name: createIndex({ name: 1 }),
}));
```

#### Collection validation

`schema.validation()` defines validation settings for the schema. Validation can also be set on the database, where it acts as a default for all schemas.

```ts
const userSchema = createSchema("users", {
  email: string().lowercase(),
}).validation({
  validationLevel: "strict",
  validationAction: "error",
});
```

You can also set the default validation policy at the database level:

```ts
const schemas = defineSchemas({ userSchema });

const db = createDatabase(client.db("app"), schemas, {
  validation: {
    validationLevel: "strict",
    validationAction: "error",
  },
});
```

#### Automatic update fields

`schema.onUpdate()` injects update operators into every update query for that schema. This is useful for fields like `updatedAt`.

```ts
import { date } from "monarch-orm/types";

const userSchema = createSchema("users", {
  updatedAt: date().optional(),
}).onUpdate(() => ({
  $set: {
    updatedAt: new Date(),
  },
}));
```

## Types

Monarch ships many ready-made types, but those are not the only possible types. The type system is extensible, and users can create custom types by extending `MonarchType`.

### `string()`

Parses strings and supports helpers like `.trim()`, `.lowercase()`, `.uppercase()`, `.nonempty()`, `.minLength()`, `.maxLength()`, and `.pattern()`.

```ts
const username = string().trim().lowercase().minLength(3);
```

### `number()`

Parses JavaScript numbers and supports `.min()`, `.max()`, and `.integer()`.

```ts
const age = number().integer().min(0);
```

### `boolean()`

Parses booleans.

```ts
const isVerified = boolean();
```

### `date()`

Parses `Date` values and supports `.before()`, `.after()`, and `.auto()`.

Note: `.auto()` sets the default value for the type to `new Date()`.

```ts
const createdAt = date().auto();
```

### `objectId()`

Parses MongoDB `ObjectId` values and valid `ObjectId` strings.

```ts
const authorId = objectId();
```

### `uuid()`

Parses MongoDB `UUID` values and UUID strings, and supports `.auto()`.

Note: `.auto()` sets the default value for the type to `crypto.randomUUID()`.

```ts
const sessionId = uuid().auto();
```

### `regex()`

Parses `RegExp` and BSON regex values.

```ts
const pattern = regex();
```

### `binary()`

Parses MongoDB binary values.

```ts
const fileData = binary();
```

### `int32()`

Parses BSON `Int32` values.

```ts
const version = int32();
```

### `double()`

Parses BSON `Double` values.

```ts
const score = double();
```

### `long()`

Parses BSON `Long` values.

```ts
const totalViews = long();
```

### `decimal128()`

Parses BSON `Decimal128` values.

```ts
const amount = decimal128();
```

### `object(shape)`

Creates nested typed objects and rejects unknown fields.

```ts
const profile = object({
  bio: string(),
  website: string(),
});
```

### `array(type)`

Creates a typed array of values.

```ts
const tags = array(string());
```

### `tuple([...types])`

Creates a fixed-length array with positional types.

```ts
const coordinates = tuple([number(), number()]);
```

### `record(type)`

Creates a string-keyed object whose values all share the same type.

```ts
const scores = record(number());
```

### `literal(...values)`

Limits a field to an exact set of primitive values.

```ts
const role = literal("admin", "editor", "member");
```

### `union(...types)`

Accepts multiple unrelated type variants.

```ts
const phoneOrEmail = union(string(), number());
```

### `taggedUnion({ ...variants })`

Creates discriminated unions using a `{ tag, value }` object shape.

```ts
const notification = taggedUnion({
  email: object({
    subject: string(),
    body: string(),
  }),
  sms: object({
    message: string(),
  }),
});
```

### `mixed()`

Accepts arbitrary values when you need to opt out of strict typing for a field.

```ts
const metadata = mixed();
```

## Modifiers

Modifiers let you adapt any type to the exact input and output behavior you want.

### `.optional()`

Allows a field to be omitted.

```ts
import { optional } from "monarch-orm/types";

const nickname = string().optional();
// or functional style
const nickname2 = optional(string());
```

### `.nullable()`

Allows `null`.

```ts
import { nullable } from "monarch-orm/types";

const middleName = string().nullable();
// or functional style
const middleName2 = nullable(string());
```

### `.default(value | fn)`

Provides a fallback when the input is `undefined`.

```ts
import { defaulted } from "monarch-orm/types";

const isVerified = boolean().default(false);
// or functional style
const isVerified2 = defaulted(boolean(), false);
```

### `.validate(fn, message)`

Adds validation after the base type has parsed successfully.

```ts
const username = string().validate((value) => value !== "admin", "username is reserved");
```

You can also use the exported namespace object if you prefer `m.string()` style:

```ts
import { createSchema, m } from "monarch-orm";

const userSchema = createSchema("users", {
  name: m.string(),
  age: m.number().optional(),
});
```

## Operators

Monarch exports typed operator helpers from `monarch-orm/operators`.

```ts
import { and, eq, gt, inArray } from "monarch-orm/operators";

const users = await db.collections.users.find(
  and(
    { isVerified: eq(true) },
    { age: gt(18) },
    { email: inArray(["alice@example.com", "grace@example.com"]) },
  ),
);
```

Available helpers:

- `and`
- `or`
- `nor`
- `not`
- `eq`
- `neq`
- `gt`
- `gte`
- `lt`
- `lte`
- `inArray`
- `notInArray`
- `exists`
- `notExists`
- `size`

## Aggregation and Raw Access

Use `aggregate()` for pipeline-based reads:

```ts
const result = await db.collections.users
  .aggregate()
  .addStage({ $match: { isVerified: true } })
  .addStage({ $group: { _id: "$isVerified", count: { $sum: 1 } } });
```

Use `raw()` when you need the underlying MongoDB collection:

```ts
const rawUsers = await db.collections.users.raw().find().toArray();
```

## Type Helpers

Monarch exports helper types for inferring collection-level input and output types from a database instance.

### `InferInput<typeof db, "collectionName">`

Infers the input type for a collection from a database instance.

```ts
import type { InferInput } from "monarch-orm";

type UserInsert = InferInput<typeof db, "users">;
```

### `InferOutput<typeof db, "collectionName">`

Infers the default output type for a collection from a database instance.

```ts
import type { InferOutput } from "monarch-orm";

type UserResult = InferOutput<typeof db, "users">;
```

### `InferOutput<typeof db, "collectionName", options>`

You can also model projected or populated output shapes by passing options as the third type argument.

```ts
import type { InferOutput } from "monarch-orm";

type UserWithPosts = InferOutput<
  typeof db,
  "users",
  {
    populate: {
      posts: {
        populate: {
          author: true;
        };
      };
    };
  }
>;
```

## Utilities

- `ObjectId` is re-exported from `mongodb`
- `toObjectId()` converts values to `ObjectId`
- `createClient(uri, options?)` creates a MongoDB client
- `getValidator(schema)` returns the generated `$jsonSchema` validator

## License

MIT
