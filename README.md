
# Monarch ORM

<!-- ![Logo](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/th5xamgrr6se0x5ro4g6.png) -->

**Monarch ORM** is a type-safe ORM for MongoDB, designed to provide a seamless and efficient way to interact with your MongoDB database in a type-safe manner. Monarch ensures that your data models are strictly enforced, reducing the risk of runtime errors and enhancing code maintainability.


<!-- > Inspired by Drizzle and Mongoose. -->


## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Quick Start](#quick-start)
  - [Defining Schemas](#defining-schemas)
  - [Connecting to the Database](#connecting-to-the-database)
  - [Inserting Documents](#inserting-documents)
  - [Querying Documents](#querying-documents)
  - [Updating Documents](#updating-documents)
  - [Deleting Documents](#deleting-documents)
- [Types](#types)
  - [Primitives](#primitives)
  - [Literals](#literals)
  - [Objects](#objects)
  - [Records](#records)
  - [Arrays](#arrays)
  - [Tuples](#tuples)
  - [Tagged Union](#tagged-union)
<!-- - [Type Safety](#type-safety) -->
<!-- - [Configuration](#configuration) -->
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Authors](#authors)
- [License](#license)

## Features

- **Strongly Typed:** Ensures type safety across your MongoDB operations.
- **Easy Integration:** Simple setup and configuration.
- **Powerful Schema Modifiers:** Define schemas with optional and required fields.
- **Intuitive API:** Designed to be easy to use and understand.



## Installation

NPM:
```bash
  npm install monarch-orm
```

Or Yarn:
```bash
  yarn add monarch-orm
```
    
## Basic Usage

```typescript
import { boolean, createClient, createDatabase, createSchema, number, string } from "monarch-orm";

    const UserSchema = createSchema("users", {
      name: string().nullable(),
      email: string().lowercase().optional(),
      age: number().optional().default(10),
      isVerified: boolean(),
    });

    const client = createClient(/** db uri **//)
    const { collections } = createDatabase(client.db(), {
      users: UserSchema,
    });

    const newUser = await collections.users
      .insert()
      .values({
        name: "anon",
        email: "anon@gmail.com",
        age: 0,
        isVerified: true,
      })
      ;

    const users = await collections.users.find().where({});
```

## Quick Start

### Defining Schemas and connecting to the database

Use the createSchema function to define the structure of your model. Specify the fields and their types, using the available types and modifiers.

```typescript
const UserSchema = createSchema("users", {
  name: string(),
  isVerified: boolean(),
});
```

Create a database instance using any client you deem fit and drop it into the createDatabase function

Or you can use the built-in createClient function.

Then you pass your schemas to the second arguement

```typescript
const { collections } = createDatabase(client.db(), {
  users: UserSchema,
});
```

### Inserting Documents
You can insert new documents into your collection using the insert method. Ensure that the data conforms to the defined schema.

Example: Inserting a new user

```typescript
const newUser = await collections.users
  .insert()
  .values({
    name: "Alice",
    email: "alice@example.com",
    age: 25,
    isVerified: true,
  })
  ;
```

### Querying Documents
Retrieve documents from your collection using the find or findOne methods.

Example: Querying all users

```typescript
const users = await collections.users.find().where({});
console.log(users);

// Or just...
const users = await collections.users.find({});
console.log(users);


// For finding one

const user = await collections.users.find().where({
  name: "Alice"
});
console.log(users);

// Or...
const user = await collections.users.findOne({
  name: "Alice"
});
console.log(users);

```

### Updating Documents
Update documents in your collection using the update method. You can update a single document or multiple documents based on a filter.

Example: Updating a single user's email

```typescript
const updatedUser = await collections.users
  .updateOne()
  .set({
    email: "alice.updated@example.com",
  })
  .where({
    name: "Alice",
  })
  ;
console.log(updatedUser);
```

Example: Updating multiple users' isVerified field

```typescript
const updatedUsers = await collections.users
  .updateMany()
  .set({
    isVerified: true,
  })
  .where({
    isVerified: false,
  })
  ;
console.log(updatedUsers);
```

Note: The update method returns the number of documents updated.

### Alternative setup
You can also decentralize the models

```typescript
const { db } = createDatabase(client);

const UserSchema = createSchema("users", {
  name: string(),
  isVerified: boolean(),
});

const UserModel = db(UserSchema);
export default UserModel;
```

And use it like this

```typescript
const user = await UserModel.findOne({
  name: "Alice"
});
console.log(users);
```


## Types

### Primitives

#### String - string()

Defines a field that accepts string values.

```typescript
const UserSchema = createSchema("users", {
  name: string().required(),
});
```

 - `.lowercase()`: Transforms the value to lowercase before storing.
 - `.uppercase()`: Transforms the value to uppercase before storing.

```typescript
const UserSchema = createSchema("users", {
  name: string().lowercase(),
});
```

#### Number - number()

Defines a field that accepts numeric values.

```typescript
const UserSchema = createSchema("users", {
  age: number().optional(),
});
```

#### Boolean - boolean()

Defines a field that accepts boolean values (true or false).

```typescript
const UserSchema = createSchema("users", {
  isVerified: boolean(),
});
```

#### Date - date()

Defines a field that accepts JavaScript Date objects.

```typescript
const UserSchema = createSchema("users", {
  birthDate: date(),
});
```

#### Date String - dateString()
Defines a field that accepts date strings in ISO format.

```typescript
const UserSchema = createSchema("users", {
  registrationDate: dateString(),
});
```

#### General Modifiers

 - `.nullable()`: Allows the field to accept null values.
 - `.default()`: Sets a default value if none is provided.
 - `.optional()`: Makes the field optional, allowing it to be omitted.

### Literals


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

### Objects

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


### Records

A `record()` allows you to define a flexible schema where each user can have a varying number of subjects and grades without needing to define a fixed schema for each subject.

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
  .insert()
  .values({
    name: "Alice",
    email: "alice@example.com",
    grades: {
      math: 90,
      science: 85,
      history: 88,
    },
  })
  ;

// Querying the user to retrieve grades
const user = await collections.users.findOne().where({ email: "alice@example.com" });
console.log(user.grades); 
// Output: { math: 90, science: 85, history: 88 }
```

### Arrays

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

### Tuples

Unlike arrays, A `tuple()` has a fixed number of elements but each element can have a different type.

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

### Tagged Union

The `taggedUnion()` allows you to define a schema for related types, each with its own structure, distinguished by a common "tag" field. This is useful for representing variable types in a type-safe manner.

```typescript - taggedUnion()

// You need:
// - a tag: A string identifying the type
// value: An object containing specific fields for that type.

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

const notification = ;
await collections.notifications.insert().values({ notification: {
  tag: "email",
  value: {
    subject: "Welcome!",
    body: "Thank you for joining us.",
  },
} });
```


### Union

The `union()` type allows you to define a field that can accept multiple different types. It's useful when a field can legitimately contain values of different types. Each type provided to `union()` acts as a possible variant for the field.

```typescript - union()

const MilfSchema = createSchema("milf", {
  phoneOrEmail: union(string(), number()),
});

// Output Type : { 
//   phoneOrEmail: string | number
// }
```


### Mixed

### Mixed

The `mixed()` type allows you to define a field that can accept any type of value. This is useful when you need maximum flexibility for a field's contents. However, use it sparingly as it bypasses TypeScript's type checking.

```typescript - mixed()

const AnythingSchema = createSchema("help", {
  anything: mixed(),
});
```