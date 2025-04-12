export class MonarchError extends Error {}

// must be a valid ObjectId — received number: 45.
function formatParseErrorMessage(...args: [string, any]): string {
  if (args.length < 2) return args[0];
  return `${args[0]} — received ${typeof args[1]}: ${args[1]}.`;
}
export class MonarchParseError extends MonarchError {
  constructor(message: string, receivedValue?: any) {
    super(formatParseErrorMessage(message, receivedValue));
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
