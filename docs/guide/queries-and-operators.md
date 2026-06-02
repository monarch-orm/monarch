# Queries & Operators

Monarch ORM provides a powerful, type-safe API for querying your MongoDB collections. By using the query builders and exported operators, you can construct complex filters without losing type safety.

## Query Modifiers

When you use `.find()` or `.findOne()`, Monarch returns a lazy query builder. The query is not executed until you `await` it. This allows you to chain modifiers to shape your results.

### Selecting & Omitting Fields

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

### Sorting, Limiting, and Skipping

Use these modifiers to paginate and order your results.

```typescript
const latestUsers = await db.collections.users
  .find({ isVerified: true })
  .sort({ createdAt: -1 }) // Sort descending by createdAt
  .limit(10)               // Return max 10 documents
  .skip(20);               // Skip the first 20 documents
```

### Cursors

For large datasets where you don't want to load everything into memory at once, you can use `.cursor()` to iterate over documents one by one.

```typescript
const cursor = await db.collections.users.find({ isVerified: true }).cursor();

for await (const user of cursor) {
  console.log(user.name);
}
```

## Operators

Monarch provides typed wrapper functions for standard MongoDB query operators. These functions enforce type safety and ensure your queries align with your schema.

You can import them from `monarch-orm/operators`.

```typescript
import { eq, gt, or, inArray } from "monarch-orm/operators";
```

### Comparison Operators

- **`eq(value)`**: Matches values equal to the specified value.
- **`neq(value)`**: Matches values not equal to the specified value.
- **`gt(value)`**: Matches values greater than the specified value.
- **`lt(value)`**: Matches values less than the specified value.
- **`gte(value)`**: Matches values greater than or equal to the specified value.
- **`lte(value)`**: Matches values less than or equal to the specified value.

```typescript
const adults = await db.collections.users.find({
  age: gte(18)
});
```

### Logical Operators

- **`and(...expressions)`**: Matches documents that satisfy all expressions.
- **`or(...expressions)`**: Matches documents that satisfy at least one expression.
- **`nor(...expressions)`**: Matches documents that fail all expressions.
- **`not(expression)`**: Inverts the effect of a filter expression.

```typescript
const specificUsers = await db.collections.users.find(
  or(
    { age: lt(18) },
    { isVerified: false }
  )
);
```

### Array Operators

- **`inArray(values)`**: Matches values that exist in the specified array.
- **`notInArray(values)`**: Matches values that do not exist in the specified array.
- **`size(value)`**: Matches arrays with the specified number of elements.

```typescript
const targetedUsers = await db.collections.users.find({
  role: inArray(["admin", "moderator"])
});
```

### Element Operators

- **`exists()`**: Matches documents where the field exists.
- **`notExists()`**: Matches documents where the field does not exist.

```typescript
const usersWithPhone = await db.collections.users.find({
  phoneNumber: exists()
});
```

## Native MongoDB Syntax

Because Monarch wraps the underlying MongoDB Node.js driver, you are still free to use native MongoDB query syntax if you prefer. The fields and operators are fully typed based on your schema.

```typescript
const activeUsers = await db.collections.users.find({
  age: { $gte: 18 },
  role: { $in: ["admin", "moderator"] }
});
```
