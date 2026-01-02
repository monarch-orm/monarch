/**
 * Base error class for Monarch ORM errors.
 */
export class MonarchError extends Error {}

/**
 * Error thrown during schema parsing and validation.
 */
export class MonarchParseError extends MonarchError {}
