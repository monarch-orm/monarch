import { MonarchError, MonarchParseError } from "../errors";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";

/**
 * Parser function type.
 */
export type Parser<Input, Output> = (input: Input) => Output;

/**
 * Chains two parsers into a single parser.
 *
 * @param prevParser - First parser
 * @param nextParser - Second parser
 * @returns Chained parser
 */
function pipeParser<Input, InterOutput, Output>(
  prevParser: Parser<Input, InterOutput>,
  nextParser: Parser<InterOutput, Output>,
): Parser<Input, Output> {
  return (input) => nextParser(prevParser(input));
}

export type AnyMonarchType<TInput = any, TOutput extends TInput = TInput> = MonarchType<TInput, TOutput>;

/**
 * Base class for all Monarch types.
 *
 * ## Extending MonarchType
 *
 * When creating a new type by extending MonarchType, you must implement the `copy()` method.
 * The copy method should create a fresh instance in its default state with the same constructor
 * parameters. The static `MonarchType.copy()` method will then preserve the current parser and
 * optional updater from the original instance.
 *
 * @example Custom type with validation methods
 * ```ts
 * class EmailType extends MonarchType<string, string> {
 *   constructor() {
 *     super((input) => {
 *       if (typeof input !== 'string') throw new MonarchParseError('Expected string');
 *       return input;
 *     });
 *   }
 *
 *   protected copy() {
 *     return new EmailType();
 *   }
 *
 *   public domain(allowedDomain: string) {
 *     return this.parse((email) => {
 *       if (!email.endsWith(`@${allowedDomain}`)) {
 *         throw new MonarchParseError(`Email must be from ${allowedDomain}`);
 *       }
 *       return email;
 *     });
 *   }
 * }
 *
 * // Usage: email().domain('example.com') preserves EmailType
 * ```
 *
 * The `copy()` method enables sound copies - when you call methods like `preprocess()`, `parse()`,
 * or `validate()`, they use `MonarchType.copy()` to create a new instance with the modified parser
 * while preserving the type. This allows method chaining while maintaining type safety.
 */
export abstract class MonarchType<TInput, TOutput extends TInput = TInput> {
  constructor(protected parser: Parser<TInput, TOutput>) {}

  /**
   * Gets parser function from type.
   *
   * @param type - Monarch type
   * @returns Parser function
   */
  public static parser<T extends AnyMonarchType>(type: T): Parser<InferTypeInput<T>, InferTypeOutput<T>> {
    return type.parser;
  }

  /**
   * Returns the type at the given path.
   *
   * `path` is a dot-separated field path split into segments (e.g. `"a.b.c"` becomes `["a","b","c"]`),
   * and `depth` is the current depth. Compound types override this to walk their
   * shape and delegate into the appropriate inner type for deeper segments.
   *
   * The base implementation is the leaf behavior: returns itself only at
   * the final segment and throws for any deeper path.
   *
   * @param path - Dot-separated field path split into segments
   * @param depth - Current depth index into `path`
   * @returns Type at the current path segment
   * @throws If `depth` is not the last segment
   */
  protected index(path: string[], depth: number): AnyMonarchType {
    if (depth === path.length - 1) return this;
    throw MonarchParseError.create({ message: `path '${path[depth + 1]}' does not exist on type` });
  }

  /**
   * Returns the type at the given path on a type instance.
   *
   * @param type - Monarch type
   * @param path - Dot-separated field path split into segments
   * @param depth - Current depth index into `path`
   * @returns Type at the given path
   */
  public static index<T extends AnyMonarchType>(type: T, path: string[], depth: number): AnyMonarchType {
    return type.index(path, depth);
  }

  /**
   * Creates a fresh instance of this type in its default state.
   *
   * Subclasses must implement this method to create a new instance with the same
   * constructor parameters.
   *
   * @returns A fresh instance of the same type
   */
  protected abstract copy(): MonarchType<TInput, TOutput>;

  /**
   * Creates a sound copy of a type instance.
   *
   * This static method ensures that:
   * 1. The copy is the same instance type
   * 2. The parser is preserved from the original instance
   * 3. The updater is preserved from the original instance
   *
   * This enables method chaining while maintaining type safety - when you call methods
   * like `parse()`, `preprocess()`, or `validate()`, they use this method to create
   * a copy with the modified parser.
   *
   * @param type - The type instance to copy
   * @returns A new instance with the same type, parser, and updater
   *
   * @internal This method is used internally by instance methods like `parse()`, `preprocess()` and `validate()`
   */
  public static copy<T extends AnyMonarchType>(type: T): T {
    const copy = type.copy();
    if (copy.constructor !== type.constructor) {
      throw new MonarchError(
        `Expected copy() to return '${type.constructor.name}' but received '${copy.constructor.name}'`,
      );
    }
    copy.parser = type.parser;
    return copy as T;
  }

  protected isInstanceOf(target: new (...args: any) => AnyMonarchType) {
    return this instanceof target;
  }

  /**
   * Checks if type is instance of target class.
   *
   * @param type - Monarch type
   * @param target - Target class
   * @returns True if type is instance of target
   */
  public static isInstanceOf<T extends new (...args: any) => AnyMonarchType>(
    type: AnyMonarchType,
    target: T,
  ): type is InstanceType<T> {
    return type.isInstanceOf(target);
  }

  /**
   * Nullable type modifier.
   *
   * @returns MonarchNullable instance
   */
  public nullable() {
    return nullable(this);
  }

  /**
   * Optional type modifier.
   *
   * @returns MonarchOptional instance
   */
  public optional() {
    return optional(this);
  }

  /**
   * Default value type modifier.
   *
   * @param defaultInput - Default value or function
   * @returns MonarchDefaulted instance
   */
  public default(defaultInput: TInput | (() => TInput)) {
    return defaulted(this, defaultInput as InferTypeInput<this> | (() => InferTypeInput<this>));
  }

  /**
   * Validate input.
   *
   * Validation is applied after previous validations and transforms have been applied.
   * @param fn function that returns `true` for successful validation and `false` for failed validation.
   * @param message error message when validation fails.
   */
  public validate(fn: (input: TOutput) => boolean, message: string) {
    const copy = MonarchType.copy(this);
    copy.parser = pipeParser(copy.parser, (input) => {
      const valid = fn(input);
      if (!valid) throw MonarchParseError.create({ message });
      return input;
    });
    return copy;
  }

  /**
   * Preprocess input before parsing.
   *
   * Preprocessing is applied before the current parser.
   * @param fn function that preprocesses the input.
   */
  public preprocess(fn: Parser<TInput, TInput>) {
    const copy = MonarchType.copy(this);
    copy.parser = pipeParser(fn, copy.parser);
    return copy;
  }

  /**
   * Parse output after current parsing.
   *
   * Parsing is applied after the current parser.
   * @param fn function that parses the output.
   */
  public parse(fn: Parser<TOutput, TOutput>) {
    const copy = MonarchType.copy(this);
    copy.parser = pipeParser(copy.parser, fn);
    return copy;
  }
}

/**
 * Nullable type modifier.
 *
 * @param type - Monarch type
 * @returns MonarchNullable instance
 */
export const nullable = <T extends AnyMonarchType>(type: T) => new MonarchNullable<T>(type);

/**
 * Type for nullable fields.
 */
export class MonarchNullable<T extends AnyMonarchType> extends MonarchType<
  InferTypeInput<T> | null,
  InferTypeOutput<T> | null
> {
  constructor(private type: T) {
    const parser = MonarchType.parser(type);

    super((input) => {
      if (input === null) return null;
      return parser(input);
    });
  }

  protected index(path: string[], depth: number): AnyMonarchType {
    if (depth === path.length - 1) return this;
    return MonarchType.index(this.type, path, depth);
  }

  protected copy() {
    return new MonarchNullable(this.type);
  }

  protected isInstanceOf(target: new (...args: any[]) => any) {
    return this instanceof target || MonarchType.isInstanceOf(this.type, target);
  }

  public static type<T extends AnyMonarchType>(nullable: MonarchNullable<T>): T {
    return nullable.type;
  }
}

/**
 * Optional type modifier.
 *
 * @param type - Monarch type
 * @returns MonarchOptional instance
 */
export const optional = <T extends AnyMonarchType>(type: T) => new MonarchOptional<T>(type);

/**
 * Type for optional fields.
 */
export class MonarchOptional<T extends AnyMonarchType> extends MonarchType<
  InferTypeInput<T> | undefined,
  InferTypeOutput<T> | undefined
> {
  constructor(private type: T) {
    const parser = MonarchType.parser(type);

    super((input) => {
      if (input === undefined) return undefined;
      return parser(input);
    });
  }

  protected index(path: string[], depth: number): AnyMonarchType {
    if (depth === path.length - 1) return this;
    throw MonarchParseError.create({ message: `updates must replace the entire optional value` });
  }

  protected copy() {
    return new MonarchOptional(this.type);
  }

  protected isInstanceOf(target: new (...args: any[]) => any) {
    return this instanceof target || MonarchType.isInstanceOf(this.type, target);
  }

  public static type<T extends AnyMonarchType>(optional: MonarchOptional<T>): T {
    return optional.type;
  }
}

/**
 * Default value type modifier.
 *
 * @param type - Monarch type
 * @param defaultInput - Default value or function
 * @returns MonarchDefaulted instance
 */
export const defaulted = <T extends AnyMonarchType>(
  type: T,
  defaultInput: InferTypeInput<T> | (() => InferTypeInput<T>),
) => new MonarchDefaulted<T>(type, defaultInput);

/**
 * Type for fields with default values.
 */
export class MonarchDefaulted<T extends AnyMonarchType> extends MonarchType<
  InferTypeInput<T> | undefined,
  InferTypeOutput<T>
> {
  constructor(
    private type: T,
    private defaultInput: InferTypeInput<T> | (() => InferTypeInput<T>),
  ) {
    const parser = MonarchType.parser(type);

    super((input) => {
      if (input === undefined) {
        const defaultValue = MonarchDefaulted.isDefaultFunction(defaultInput) ? defaultInput() : defaultInput;
        return parser(defaultValue);
      }
      return parser(input);
    });
  }

  protected index(path: string[], depth: number): AnyMonarchType {
    if (depth === path.length - 1) return this;
    return MonarchType.index(this.type, path, depth);
  }

  protected copy() {
    return new MonarchDefaulted(this.type, this.defaultInput);
  }

  protected isInstanceOf(target: new (...args: any[]) => any) {
    return this instanceof target || MonarchType.isInstanceOf(this.type, target);
  }

  public static type<T extends AnyMonarchType>(defaulted: MonarchDefaulted<T>): T {
    return defaulted.type;
  }

  private static isDefaultFunction<T>(val: unknown): val is () => T {
    return typeof val === "function";
  }
}
