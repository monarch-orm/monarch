export enum ErrorCodes {
  MONARCH_ERROR = "MONARCH_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}

export class MonarchError extends Error {
  constructor(
    message: string,
    public code: ErrorCodes = ErrorCodes.MONARCH_ERROR,
    public cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.cause = cause;

    if (!!cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class FieldError extends Error {
  constructor(
    message: string,
    public fieldPath?: (string | number)[],
  ) {
    super(message);
    this.fieldPath = fieldPath ?? [];
  }
}

export class MonarchValidationError extends MonarchError {
  constructor(
    message: string,
    public fieldPath: string,
    cause?: Error,
  ) {
    super(
      `Validation error: '${fieldPath}' ${message}`,
      ErrorCodes.VALIDATION_ERROR,
      cause,
    );
  }
}

export function formatValidationPath(pathSegment: {
  schema: string;
  field: string;
  path?: (string | number)[];
}): string {
  const { schema, field, path = [] } = pathSegment;
  return [schema, field, ...path].join(".");
}
