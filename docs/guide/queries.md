# Queries

Monarch ORM provides a powerful, type-safe API for querying your MongoDB collections. By using the query builders, you can construct complex filters without losing type safety.

## Query Modifiers and Immutability

When you use `.find()` or `.findOne()`, Monarch returns a lazy query builder. The query is not executed until you `await` it. This allows you to chain modifiers to shape your results.

> [!IMPORTANT]
> Query modifier methods (`.select()`, `.sort()`, `.limit()`, etc.) **do not mutate** the original query instance. Instead, they return a **new** instance of the query builder. 

This immutability makes it incredibly safe to re-use base queries throughout your application without unintended side effects.

```typescript
// Define a base query
const activeUsersQuery = db.collections.users.find({ isVerified: true });

// Safely reuse the base query for different purposes
const allActiveUsers = await activeUsersQuery;

// This returns a NEW query instance, leaving `activeUsersQuery` untouched
const paginatedUsers = await activeUsersQuery.limit(10).skip(20);

// You can still use the original query without the limit/skip side effects
const activeUserCount = await activeUsersQuery.count();
```

## Nested Fields and Dot Notation

Because Monarch uses the official MongoDB driver's typings under the hood, you get full type safety when querying nested object fields using either dot notation or standard nested object structures. 

```typescript
import { createSchema } from "monarch-orm";
import { object, string } from "monarch-orm/types";

// Define a schema with a nested object
const UserSchema = createSchema("users", {
  name: string(),
  address: object({
    city: string(),
    zip: string()
  })
});

// Using a standard nested object structure
const usersInNewYorkNested = await db.collections.users.find({
  address: {
    city: "New York" // fully typed!
  }
});

// Or using dot notation
const usersInNewYorkDot = await db.collections.users.find({
  "address.city": "New York"
});

```

The TypeScript compiler will correctly enforce the types for both nested properties and nested objects, ensuring you don't query a nested number field with a string or misspell the path (e.g., `"address.town"` or `{ address: { town: "..." } }` will throw a type error).


## Selecting & Omitting Fields

You can control exactly which fields are returned from the database using `.select()` and `.omit()`.

```typescript
// Only return the name and email fields
const users = await db.collections.users
  .find()
  .select({ name: true, email: true });

// Return everything EXCEPT the age and password fields
const publicUsers = await db.collections.users
  .find()
  .omit({ age: true, password: true });
```

## Sorting, Limiting, and Skipping

Use these modifiers to paginate and order your results.

```typescript
const latestUsers = await db.collections.users
  .find({ isVerified: true })
  .sort({ createdAt: -1 }) // Sort descending by createdAt
  .limit(10)               // Return max 10 documents
  .skip(20);               // Skip the first 20 documents
```

## Cursors

For large datasets where you don't want to load everything into memory at once, you can use `.cursor()` to iterate over documents one by one.

```typescript
const cursor = await db.collections.users.find({ isVerified: true }).cursor();

for await (const user of cursor) {
  console.log(user.name);
}
```

## Native MongoDB Syntax

Because Monarch wraps the underlying MongoDB Node.js driver, you are still free to use native MongoDB query syntax if you prefer. The fields and operators are fully typed based on your schema.

> [!TIP]
> Alternatively, you can use our built-in [Helper Operators](/guide/operators) which provide even stronger type safety and schema inference.

```typescript
const activeUsers = await db.collections.users.find({
  age: { $gte: 18 },
  role: { $in: ["admin", "moderator"] }
});
```

## Aggregation

Monarch's aggregation pipeline simplifies MongoDB aggregations by strictly typing operators and offering both a chained `addStage` interface and an array-based initializer.

### Building Pipelines

You can initialize an aggregation with an array of stages, and dynamically append to it using `.addStage()`. Both methods are strictly typed against your schema.

```typescript
// Initializing with an array
const baseAggregation = db.collections.users.aggregate([
  { $match: { isVerified: true } }
]);

// Extending via the chained interface
const result = await baseAggregation
  .addStage({ $group: { _id: "$isVerified", count: { $sum: 1 } } });
  
console.log(result); // [{ _id: true, count: 5 }]
```

### Typing the Output

When you perform complex aggregations involving `$group`, `$project`, or other reshaping stages, the resulting documents will no longer match your base schema. You can explicitly provide the expected output type to the `.aggregate()` method.

```typescript
type GroupedResult = {
  _id: boolean;
  count: number;
};

// By passing the expected type, `result` is correctly inferred as `GroupedResult[]`
const result = await db.collections.users
  .aggregate<GroupedResult>()
  .addStage({ $match: { isVerified: true } })
  .addStage({ $group: { _id: "$isVerified", count: { $sum: 1 } } });
```

### Immutability and Promises

Just like standard query builders, the aggregation pipeline is **immutable**. Calling `.addStage()` returns a new instance of the pipeline, leaving the base pipeline completely untouched. 

Furthermore, the pipeline instance itself is "Thenable"—it implements `.then()`, `.catch()`, and `.finally()`. This means you can `await` the pipeline instance directly to execute the aggregation and receive the resulting array, without needing a separate `.exec()` method.

```typescript
const base = db.collections.users.aggregate();

// These two pipelines branch off independently!
const verifiedPipeline = base.addStage({ $match: { isVerified: true } });
const unverifiedPipeline = base.addStage({ $match: { isVerified: false } });

// Await them directly
const verifiedUsers = await verifiedPipeline;
```

### Pipeline Options

To provide custom options such as `.allowDiskUse()`, you can call `.options()` directly in the pipeline sequence:

```typescript
const largeResult = await db.collections.posts
  .aggregate()
  .options({ allowDiskUse: true })
  .addStage({ $match: { likes: { $gt: 100 } } })
  .addStage({ $sort: { likes: -1 } });
```

### Aggregation Cursors

For extremely large aggregations, you can request an `AggregationCursor` instead of pulling all results into memory. Simply call `.cursor()` instead of `await`ing the pipeline directly.

```typescript
const cursor = await db.collections.users
  .aggregate([{ $match: { isVerified: true } }])
  .cursor();

for await (const doc of cursor) {
  // process each document iteratively
}
```

### Raw Driver Fallback

If you need to bypass Monarch's typing completely for a complex aggregation, you can always drop down to the raw MongoDB driver collection using `.raw()`.

```typescript
const rawResult = await db.collections.users
  .raw()
  .aggregate([{ $match: { isVerified: true } }])
  .toArray();
```
