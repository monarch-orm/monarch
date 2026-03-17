# Getting Started

**Monarch ORM** is a type-safe ORM for MongoDB, designed to provide a seamless and efficient way to interact with your MongoDB database in a type-safe manner. Monarch ensures that your data models are strictly enforced, reducing the risk of runtime errors and enhancing code maintainability.

## Installation

NPM:
```bash
npm install monarch-orm
```

Or Yarn:
```bash
yarn add monarch-orm
```

Or PNPM:
```bash
pnpm add monarch-orm
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

const client = createClient(/** db uri **/)
const { collections } = createDatabase(client.db(), {
  users: UserSchema,
});

const newUser = await collections.users
  .insertOne({
    name: "anon",
    email: "anon@gmail.com",
    age: 0,
    isVerified: true,
  });

const users = await collections.users.find({});
```

## Quick Start

### Defining Schemas and connecting to the database

Use the `createSchema` function to define the structure of your model. Specify the fields and their types, using the available types and modifiers.

```typescript
const UserSchema = createSchema("users", {
  name: string(),
  isVerified: boolean(),
});
```

Create a database instance using any client you deem fit and drop it into the `createDatabase` function. Or you can use the built-in `createClient` function. Then you pass your schemas to the second argument.

```typescript
const { collections } = createDatabase(client.db(), {
  users: UserSchema,
});
```

### Inserting Documents

You can insert new documents into your collection using the `insert` method. Ensure that the data conforms to the defined schema.

Example: Inserting a new user

```typescript
const newUser = await collections.users
  .insertOne({
    name: "Alice",
    email: "alice@example.com",
    age: 25,
    isVerified: true,
  });
```

### Querying Documents

Retrieve documents from your collection using the `find` or `findOne` methods.

Example: Querying all users

```typescript
const users = await collections.users.find({});
console.log(users);

// Or just...
const allUsers = await collections.users.find({});
console.log(allUsers);


// For finding one
const user = await collections.users.findOne({
  name: "Alice"
});
console.log(user);

// Or...
const specificUser = await collections.users.findOne({
  name: "Alice"
});
console.log(specificUser);
```

### Updating Documents

Update documents in your collection using the `updateOne` or `updateMany` methods. You can update a single document or multiple documents based on a filter.

Example: Updating a single user's email

```typescript
const updatedUser = await collections.users
  .updateOne()
  .set({
    email: "alice.updated@example.com",
  })
  .where({
    name: "Alice",
  });
console.log(updatedUser);
```

Example: Updating multiple users' `isVerified` field

```typescript
const updatedUsers = await collections.users
  .updateMany()
  .set({
    isVerified: true,
  })
  .where({
    isVerified: false,
  });
console.log(updatedUsers);
```

Note: The update method returns the number of documents updated.

### Alternative setup

You can also decentralize the models:

```typescript
const { db } = createDatabase(client.db());

const UserSchema = createSchema("users", {
  name: string(),
  isVerified: boolean(),
});

const UserModel = db(UserSchema);
export default UserModel;
```

And use it like this:

```typescript
const user = await UserModel.findOne({
  name: "Alice"
});
console.log(user);
```
