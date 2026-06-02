# Aggregations & Relations

Monarch ORM provides powerful ways to connect collections through relations and deeply populate documents. Additionally, it offers a wrapper around the native MongoDB aggregation pipeline framework.

## Relations

You can establish relations between collections after defining your schemas. Use the `defineSchemas` higher-order function to bundle schemas and the `.withRelations` method to establish `$one` and `$many` connections between them.

### Defining Relations

```typescript
import { createSchema, defineSchemas, createDatabase } from "monarch-orm";
import { string, boolean, objectId } from "monarch-orm/types";

const UserSchema = createSchema("users", {
  name: string(),
  isAdmin: boolean(),
  tutorId: objectId().optional(),
});

const PostSchema = createSchema("posts", {
  title: string(),
  authorId: objectId().optional(),
});

const schemas = defineSchemas({
  users: UserSchema,
  posts: PostSchema,
});

// Configure the relationships
const relations = schemas.withRelations((s) => ({
  users: {
    tutor: s.users.$one.users({ from: "tutorId", to: "_id" }),
    posts: s.users.$many.posts({ from: "_id", to: "authorId" }),
  },
  posts: {
    author: s.posts.$one.users({ from: "authorId", to: "_id" }),
  },
}));

// Initialize the database with relations
const db = createDatabase(client.db(), relations);
```

### Populating Relations

Once relations are defined, use `.populate()` on queried results to fetch the referenced documents automatically. Population can grab single references or deeply nested relations.

```typescript
// Insert related records
const tutor = await db.collections.users.insertOne({ name: "Professor", isAdmin: true });
const student = await db.collections.users.insertOne({ name: "Bob", isAdmin: false, tutorId: tutor._id });

await db.collections.posts.insertOne({ title: "My First Post", authorId: student._id });

// Populate a standard single relationship:
const userWithTutor = await db.collections.users
  .findOne({ name: "Bob" })
  .populate({ tutor: true });
  
console.log(userWithTutor?.tutor?.name); // "Professor"

// Populate multiple relationships:
const userWithPosts = await db.collections.users
  .findById(student._id)
  .populate({ tutor: true, posts: true });

console.log(userWithPosts?.posts[0].title); // "My First Post"
```

#### Deep Population and Omission

You can populate nested relationships and conditionally omit fields when populating:

```typescript
const populatedPost = await db.collections.posts
  .findOne({ title: "My First Post" })
  .populate({
    author: {
      omit: {
        isAdmin: true, // Do not load the isAdmin field on the populated author
      },
      populate: {
        tutor: true, // Deeply populate the author's tutor!
      },
    },
  });

console.log(populatedPost?.author?.tutor?.name);
```

## Aggregation

Monarch's aggregation pipeline simplifies MongoDB aggregations with a chained `addStage` interface. Each stage can accept a standard MongoDB aggregation command.

```typescript
const result = await db.collections.users
  .aggregate()
  .addStage({ $match: { isVerified: true } })
  .addStage({ $group: { _id: "$isVerified", count: { $sum: 1 } } });
  
console.log(result); // [{ _id: true, count: 5 }]
```

To provide custom options such as `.allowDiskUse()`, you can call `.options()` directly in the pipeline sequence:

```typescript
const largeResult = await db.collections.posts
  .aggregate()
  .options({ allowDiskUse: true })
  .addStage({ $match: { likes: { $gt: 100 } } })
  .addStage({ $sort: { likes: -1 } });
```
