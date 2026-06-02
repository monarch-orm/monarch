# Schemas

Monarch provides a rich set of schema builders to strictly enforce your MongoDB documents structure.

## Creating Schemas

Use `createSchema` to initialize a schema for a given collection name.

```typescript
import { createSchema } from "monarch-orm";
import { string, number } from "monarch-orm/types";

const UserSchema = createSchema("users", {
  name: string().required(),
  age: number().optional(),
});
```

## Virtuals

Virtuals let you dynamically create properties that don't persist to the MongoDB database but exist on the documents returned by Monarch. Use `virtual` to create a new field computed dynamically from one or more existing properties.

```typescript
import { createSchema, virtual } from "monarch-orm";
import { string, number, boolean } from "monarch-orm/types";

const UserSchema = createSchema("users", {
  name: string(),
  age: number(),
  isAdmin: boolean(),
}).virtuals({
  // The first argument denotes dependencies the virtual might need to compute
  role: virtual("isAdmin", ({ isAdmin }) => (isAdmin ? "admin" : "user")),
});

const schemas = defineSchemas({ users: UserSchema });
const db = createDatabase(client.db(), schemas);
const user = await db.collections.users.insertOne({ name: "Tom", age: 30, isAdmin: true });

console.log(user.role); // "admin"
```

## Omitting Fields

To hide fields from querying results or outputs permanently at a schema level, use the `.omit()` chainable mechanism. This lets you store sensitive fields (like passwords or logs) while guarding from exposing them directly or manually by default.

```typescript
const SafeUserSchema = createSchema("users", {
  name: string(),
  passwordHash: string(),
  isAdmin: boolean(),
}).omit({
  passwordHash: true,
  isAdmin: true,
});

// A query directly returning this User Schema drops passwordHash and isAdmin immediately
const doc = await db.collections.users.findOne({ name: "Alice" }); 
// Output: { _id: ..., name: "Alice" }
```

## Indexes

Automatically enforce database indexing configurations via your schema configurations. Simply call `.indexes()` using the provided `createIndex` or `unique` builders. 

```typescript
const UserSchema = createSchema("users", {
  firstname: string(),
  surname: string(),
  username: string(),
  age: number(),
}).indexes(({ createIndex, unique }) => ({
  // Single-key index with uniqueness constraint
  username: unique("username"),
  // Compound active index enforcing a unique pair
  fullname: createIndex({ firstname: 1, surname: 1 }, { unique: true }),
}));
```

Failure to satisfy unique combinations built up here will throw `E11000 duplicate key error` exceptions in production on the respective MongoDB cluster.

## Custom Base Types (_id)

You might configure custom types to the default global `_id` document specifier if you use an external ID generator. By default `_id` is an `ObjectId` standard.

```typescript
const CustomIDSBchema = createSchema("products", {
  _id: string(), // Using strings like UUIDs/ULIDs
  name: string(),
  price: number(),
});

await db.collections.products.insertOne({
  _id: "product-123", // Inserting ID manually
  name: "Laptop",
  price: 999,
});
```

## Schema Grouping & Merging 

In expansive, microservice-like or component-based setups, placing all schemas in one file becomes unsustainable. Instead, group them structurally using `defineSchemas` then merge them via the `mergeSchemas` method.

```typescript
import { defineSchemas, mergeSchemas } from "monarch-orm";

// 1. Module defined for Users
const userGroup = defineSchemas({ UserSchema }).withRelations((r) => ({
  users: { tutor: r.one.users({ from: r.users.tutorId, to: r.users._id }) },
}));

// 2. Module defined for Content 
const contentGroup = defineSchemas({ PostSchema, CategorySchema });

// 3. Merging
const mergedGroups = mergeSchemas(userGroup, contentGroup);

// Optionally attach relationships ACROSS the groups post-merge
const finalSchema = mergedGroups.withRelations((r) => ({
  users: {
    posts: r.many.posts({ from: r.users._id, to: r.posts.authorId }),
  },
  posts: {
    author: r.one.users({ from: r.posts.authorId, to: r.users._id }),
  },
}));

const db = createDatabase(client.db(), finalSchema);
```

## Rename output fields

`schema.rename()` changes field names in query output without changing how the field is stored in MongoDB.

```typescript
const userSchema = createSchema("users", {
  name: string(),
}).rename({
  _id: "id",
  name: "fullName",
});
```

## Collection validation

`schema.validation()` enables collection-level document validation using a JSON Schema generated from your Monarch schema. It is not enabled by default. Validation can also be set on the database, where it acts as a default for all schemas.

```typescript
const userSchema = createSchema("users", {
  email: string().lowercase(),
}).validation({
  validationLevel: "strict",
  validationAction: "error",
});
```

## Automatic update fields

`schema.onUpdate()` injects update operators into every update query for that schema. This is useful for fields like `updatedAt`.

```typescript
import { date } from "monarch-orm/types";

const userSchema = createSchema("users", {
  updatedAt: date().optional(),
}).onUpdate(() => ({
  $set: {
    updatedAt: new Date(),
  },
}));
```
