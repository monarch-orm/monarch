/**
 * Base error class for Monarch ORM errors.
 */
export class MonarchError extends Error {}

/**
 * Schema parsing and validation error.
 */
export class MonarchParseError extends MonarchError {
  private path: (string | number)[];
  private cause?: MonarchParseError;

  constructor(message: string);
  constructor(cause: { path: string | number; error: MonarchParseError });
  constructor(
    error:
      | string
      | {
          path: string | number;
          error: MonarchParseError;
        },
  ) {
    let message: string;
    let path: (string | number)[] = [];
    let cause: MonarchParseError | undefined;

    if (typeof error === "string") {
      message = error;
    } else {
      cause = error.error.cause ?? error.error;
      path = [error.path, ...error.error.path];

      const pathString = path.reduce((acc, p, i) => {
        if (typeof p === "number") {
          return `${acc}[${p}]`;
        }
        return i === 0 ? p : `${acc}.${p}`;
      }, "");
      message = `${pathString}: ${cause.message}`;
    }

    super(message);
    this.path = path;
    this.cause = cause;
  }
}
