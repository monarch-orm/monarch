export enum ErrorCodes {
  MONARCH_ERROR = "MONARCH_ERROR",
  PARSE_ERROR = "PARSE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}

export class MonarchError extends Error {
  public code: (typeof ErrorCodes)[keyof typeof ErrorCodes];
  public originalError?: Error;

  constructor(
    message: string,
    code: (typeof ErrorCodes)[keyof typeof ErrorCodes] = ErrorCodes.MONARCH_ERROR,
    originalError?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.originalError = originalError;

    if (!!originalError && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class MonarchParseError extends MonarchError {
  public fieldPath?: (string | number)[];
  constructor(
    message: string,
    fieldPath?: (string | number)[],
    originalError?: Error,
  ) {
    super(message, ErrorCodes.PARSE_ERROR, originalError);
    this.fieldPath = normalizeFieldPath(fieldPath);
  }
}

export class MonarchValidationError extends MonarchError {
  constructor(
    message: string,
    public fieldPath: string,
    originalError?: Error,
  ) {
    super(
      formatValidationMessage(fieldPath, message),
      ErrorCodes.VALIDATION_ERROR,
      originalError,
    );
  }
}

export function normalizeFieldPath(
  fieldPath?: string | (string | number)[],
): (string | number)[] {
  if (typeof fieldPath === "string") {
    return fieldPath.split(".");
  }
  if (Array.isArray(fieldPath)) {
    return fieldPath;
  }
  return [];
}

export function formatErrorPath(
  path: string | number | (string | number)[],
): string {
  return Array.isArray(path) ? path.join(".") : String(path);
}

export function formatValidationPath(pathSegment: {
  schema: string;
  field: string;
  path?: (string | number)[];
}): string {
  const { schema, field, path = [] } = pathSegment;
  return formatErrorPath([schema, field, ...path]);
}

export function formatValidationMessage(
  fieldPath: string,
  message: string,
): string {
  return `Validation error: '${fieldPath}' ${message}`;
}
