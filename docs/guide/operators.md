# Operators

Monarch provides typed wrapper functions for standard MongoDB query operators. These functions enforce strict type safety and ensure your queries align with your inferred schemas seamlessly.

You can import them from `monarch-orm/operators`.

```typescript
import { eq, gt, or, inArray } from "monarch-orm/operators";
```

## Comparison Operators

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

## Logical Operators

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

## Array Operators

- **`inArray(values)`**: Matches values that exist in the specified array.
- **`notInArray(values)`**: Matches values that do not exist in the specified array.
- **`size(value)`**: Matches arrays with the specified number of elements.

```typescript
const targetedUsers = await db.collections.users.find({
  role: inArray(["admin", "moderator"])
});
```

## Element Operators

- **`exists()`**: Matches documents where the field exists.
- **`notExists()`**: Matches documents where the field does not exist.

```typescript
const usersWithPhone = await db.collections.users.find({
  phoneNumber: exists()
});
```
