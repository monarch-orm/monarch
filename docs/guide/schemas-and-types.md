# Schemas & Types

Monarch provides a rich set of schema builders to strictly enforce your MongoDB documents structure.

## Primitives

### String `string()`

Defines a field that accepts string values.

```typescript
const UserSchema = createSchema("users", {
  name: string().required(),
});
```

Modifiers:
- `.lowercase()`: Transforms the value to lowercase before storing.
- `.uppercase()`: Transforms the value to uppercase before storing.

```typescript
const UserSchema = createSchema("users", {
  name: string().lowercase(),
});
```

### Number `number()`

Defines a field that accepts numeric values.

```typescript
const UserSchema = createSchema("users", {
  age: number().optional(),
});
```

### Boolean `boolean()`

Defines a field that accepts boolean values (`true` or `false`).

```typescript
const UserSchema = createSchema("users", {
  isVerified: boolean(),
});
```

### Date `date()`

Defines a field that accepts JavaScript `Date` objects.

```typescript
const UserSchema = createSchema("users", {
  birthDate: date(),
});
```

### Date String `dateString()`

Defines a field that accepts date strings in ISO format.

```typescript
const UserSchema = createSchema("users", {
  registrationDate: dateString(),
});
```

### General Modifiers

- `.nullable()`: Allows the field to accept `null` values.
- `.default()`: Sets a default value if none is provided.
- `.optional()`: Makes the field optional, allowing it to be omitted.

## Literals

The `literal()` type allows you to define a schema with fixed possible values, similar to enums in TypeScript. This is useful for enforcing specific, predefined values for a field.

```typescript
  const UserRoleSchema = createSchema("userRoles", {
  role: literal("admin", "moderator", "customer"),
});

const user = {
  role: "admin", // Valid
};

// Invalid example will throw a type error
const invalidUser = {
  role: "guest", // Error: Type '"guest"' is not assignable to type '"admin" | "moderator" | "customer"'
};
```

## Objects

Complex nested objects can be defined up to infinite depth using `object()`.

```typescript
// all properties are required by default
const UserSchema = object({
  name: string(),
  age: number(),
});

// extract the inferred type like this
type User = InferSchemaInput<typeof UserSchema>;

// equivalent to:
type User = {
  name: string;
  age: number;
};
```

## Records

A `record()` allows you to define a flexible schema where keys are strings and the values conform to a specific schema instead of statically defining a fixed schema for every possible key.

```typescript
// Define the User schema with a record for grades
const UserSchema = createSchema("users", {
  name: string().required(),
  email: string().required(),
  grades: record(number()), // Each subject will have a numeric grade
});

// Example of inserting a user with grades
const { collections } = createDatabase(client.db(), {
  users: UserSchema,
});

// Inserting a new user with grades for different subjects
const newUser = await collections.users
  .insertOne({
    name: "Alice",
    email: "alice@example.com",
    grades: {
      math: 90,
      science: 85,
      history: 88,
    },
  });

// Querying the user to retrieve grades
const user = await collections.users.findOne({ email: "alice@example.com" });
console.log(user.grades); 
// Output: { math: 90, science: 85, history: 88 }
```

## Arrays

Defines an array whose bounds are typed to an element schema.

```typescript
// For Example
const ResultSchema = object({
  name: string(),
  scores: array(number()),
});

// extract the inferred type like this
type Result = InferSchemaInput<typeof ResultSchema>;

// equivalent to:
type Result = {
  name: string;
  scores: number[];
};
```

## Tuples

Unlike arrays, a `tuple()` has a fixed number of elements but each element can have a different type.

```typescript
// all properties are required by default
const ControlSchema = object({
  location: tuple([number(), number()]),
});

// extract the inferred type like this
type Control = InferSchemaInput<typeof ControlSchema>;

// equivalent to:
type Control = {
  location: [number, number];
};
```

## Tagged Union

The `taggedUnion()` allows you to define a schema for related types, each with its own structure, distinguished by a common "tag" field. This is useful for representing variable types in a type-safe manner.

```typescript
// You need:
// - a tag: A string identifying the type
// - value: An object containing specific fields for that type.

const NotificationSchema = createSchema("notifications", {
  notification: taggedUnion({
    email: object({
      subject: string(),
      body: string(),
    }),
    sms: object({
      phoneNumber: string(),
      message: string(),
    }),
    push: object({
      title: string(),
      content: string(),
    }),
  }),
});

await collections.notifications.insertOne({ 
  notification: {
    tag: "email",
    value: {
      subject: "Welcome!",
      body: "Thank you for joining us.",
    },
  } 
});
```

## Union

The `union()` type allows you to define a field that can accept multiple different types. It's useful when a field can legitimately contain values of different types. Each type provided to `union()` acts as a possible variant for the field.

```typescript
const ContactSchema = createSchema("contacts", {
  phoneOrEmail: union(string(), number()),
});

// Output Type : { 
//   phoneOrEmail: string | number
// }
```

## Mixed

The `mixed()` type allows you to define a field that can accept any type of value. This is useful when you need maximum flexibility for a field's contents. However, use it sparingly as it bypasses TypeScript's type checking.

```typescript
const AnythingSchema = createSchema("help", {
  anything: mixed(),
});
```
