export class MonarchError extends Error {}

function formatParseErrorMessage<T>(args: [string] | [string, T]): string {
  if (args.length < 2) return args[0];
  return `${args[0]} — received ${typeof args[1]}: ${JSON.stringify(args[1])}.`;
}
export class MonarchParseError<T> extends MonarchError {
  constructor(...args: [string] | [string, T]) {
    super(formatParseErrorMessage(args));
    this.name = "Parse error";
  }
}

export class MonarchSchemaValidationError extends MonarchError {
  constructor({
    key,
    schemaName,
    message,
    implementationContext,
  }: {
    key: string;
    schemaName?: string;
    message: string;
    implementationContext?: Function;
  }) {
    super(`Schema Validation error: '${schemaName}.${key}' ${message}`);
    Error.captureStackTrace(this, implementationContext || this.constructor);
    this.name = "Schema Validation error";
  }
}
