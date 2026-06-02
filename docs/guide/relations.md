# Relations

Monarch ORM provides powerful ways to connect collections through relations and deeply populate documents.

You can establish relations between collections after defining your schemas. Use the `defineSchemas` higher-order function to bundle schemas and the `.withRelations` method to establish `one` and `many` connections between them.

## Defining Relations

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
  UserSchema,
  PostSchema,
});

// Configure the relationships
const relations = schemas.withRelations((r) => ({
  users: {
    tutor: r.one.users({ from: r.users.tutorId, to: r.users._id }),
    posts: r.many.posts({ from: r.users._id, to: r.posts.authorId }),
  },
  posts: {
    author: r.one.users({ from: r.posts.authorId, to: r.users._id }),
  },
}));

// Initialize the database with relations
const db = createDatabase(client.db(), relations);
```

## Indexing Recommendations

Relations use field lookups to join documents across collections. To ensure fast population queries, **you must create indexes on the fields used in each relation**.

For every relation, MongoDB queries the target collection by the `to` field using the values collected from the `from` field. Without an index on the `to` field, MongoDB performs a full collection scan for each population.

> [!IMPORTANT]
> - If the `to` field is `_id`, it is already indexed — no action is needed.
> - For any other `to` field, create an **ascending index** (`{ field: 1 }`) on the target schema using `.indexes()`.
> - A `from` field does not technically need an index for the population join, but you should index it on the source schema if you plan to filter or sort by it in your own queries.

### Indexing Example

```typescript
// 1. We want users to have many posts (users._id -> posts.authorId)
const userSchema = createSchema("users", {
  name: string(),
});

// 2. Since the `to` field in this relation is `posts.authorId` and NOT `_id`, 
//    we MUST index it on the Post collection for fast joins.
const postSchema = createSchema("posts", {
  title: string(),
  authorId: objectId(),
}).indexes(({ createIndex }) => ({
  authorId: createIndex({ authorId: 1 }),
}));
```

## Populating Relations

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

### Deep Population and Omission

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
