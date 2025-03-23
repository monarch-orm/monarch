import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";

export async function createMockDatabase() {
  const server = await MongoMemoryServer.create();
  const client = new MongoClient(server.getUri());
  return { server, client };
}

export const mockUsers = [
  {
    name: "anon",
    email: "anon@gmail.com",
    age: 17,
    isVerified: true,
  },
  {
    name: "anon1",
    email: "anon1@gmail.com",
    age: 20,
    isVerified: false,
  },
  {
    name: "anon2",
    email: "anon2@gmail.com",
    age: 25,
    isVerified: true,
  },
];
