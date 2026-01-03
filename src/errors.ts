/**
 * Base error class for Monarch ORM errors.
 */
export class MonarchError extends Error {}

/**
 * Schema parsing and validation error.
 */
export class MonarchParseError extends MonarchError {}
