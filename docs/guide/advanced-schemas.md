# Advanced Schemas

Monarch ORM provides advanced capabilities to shape the data returned by your queries, add indexes reliably to records, and group schema structures effectively in large applications.

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

const db = createDatabase(client.db(), defineSchemas({ users: UserSchema }));
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
const userGroup = defineSchemas({ UserSchema }).withRelations((s) => ({
  users: { tutor: s.users.$one.users({ from: "tutorId", to: "_id" }) },
}));

// 2. Module defined for Content 
const contentGroup = defineSchemas({ PostSchema, CategorySchema });

// 3. Merging
const mergedGroups = mergeSchemas(userGroup, contentGroup);

// Optionally attach relationships ACROSS the groups post-merge
const finalSchema = mergedGroups.withRelations((s) => ({
  users: {
    posts: s.users.$many.posts({ from: "_id", to: "authorId" }),
  },
  posts: {
    author: s.posts.$one.users({ from: "authorId", to: "_id" }),
  },
}));

const db = createDatabase(client.db(), finalSchema);
```
