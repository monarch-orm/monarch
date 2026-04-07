import { ObjectId } from "mongodb";

/**
 * Safely converts a value to a MongoDB ObjectId.
 * If the value is not a valid ObjectId, returns null.
 *
 * @param id - The value to convert to ObjectId.
 * @returns A valid ObjectId or null if the input is invalid.
 */
export const toObjectId = (input: string | ObjectId): ObjectId | null => {
  if (!ObjectId.isValid(input)) return null;
  return new ObjectId(input);
};

/**
 * Maps a single value or array of values
 * @param input value or array of values
 * @param fn map function
 * @returns transformed single value or array of values
 */
export function mapOneOrArray<T extends Record<string, any>, U>(input: T | T[], fn: (input: T) => U) {
  if (Array.isArray(input)) return input.map(fn);
  return fn(input);
}

/**
 * Generates a hash string from input string.
 *
 * @param input - String to hash
 * @returns Base-36 hash string
 */
export function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export type AsyncResolver = {
  promise: Promise<void>;
  resolve: () => void;
  reject: () => void;
};

/**
 * Promise with resolvers
 */
export function createAsyncResolver(): AsyncResolver {
  let resolve = () => {};
  let reject = () => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Simple concurrency limiter
 */
export function createAsyncLimiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }

    try {
      active++;
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}
