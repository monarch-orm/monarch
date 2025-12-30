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

export function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
