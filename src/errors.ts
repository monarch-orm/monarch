/**
 * Base error class for Monarch ORM errors.
 */
export class MonarchError extends Error {
  public cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

/**
 * Schema parsing and validation error.
 */
export class MonarchParseError extends MonarchError {
  public path: (string | number)[];

  private constructor(message: string, path: (string | number)[], cause?: unknown) {
    super(message, cause);
    this.path = path;
  }

  static create({ path, message }: { path?: string | number; message: string }): MonarchParseError {
    if (!path) return new MonarchParseError(message, []);
    return new MonarchParseError(`${path}: ${message}`, [path]);
  }

  static fromCause({ path, cause }: { path?: string | number; cause: unknown }): MonarchParseError {
    let prevPath: (string | number)[] = [];
    let rootCause: unknown | undefined;

    if (cause instanceof MonarchParseError) {
      prevPath = cause.path;
      rootCause = cause.cause ?? cause;
    } else if (cause instanceof Error) {
      rootCause = cause;
    }

    const message = rootCause instanceof Error ? rootCause.message : String(rootCause);

    if (!path) return new MonarchParseError(message, prevPath, rootCause);

    const newPath = [path, ...prevPath];
    const pathString = newPath.reduce((acc, p, i) => (i === 0 ? `${p}` : `${acc}.${p}`), "");
    return new MonarchParseError(`${pathString}: ${message}`, newPath, rootCause);
  }
}
