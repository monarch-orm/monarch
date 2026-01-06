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
export function pipeParser<Input, InterOutput, Output>(
  prevParser: Parser<Input, InterOutput>,
  nextParser: Parser<InterOutput, Output>,
): Parser<Input, Output> {
  return (input) => nextParser(prevParser(input));
}

export type AnyMonarchType<TInput = any, TOutput = TInput> = MonarchType<TInput, TOutput>;

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
export abstract class MonarchType<TInput, TOutput = TInput> {
  constructor(
    protected parser: Parser<TInput, TOutput>,
    private updater?: Parser<void, TOutput>,
  ) {}

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
    copy.updater = type.updater;
    return copy as T;
  }

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
   * Gets updater function from type.
   *
   * @param type - Monarch type
   * @returns Updater function or undefined
   */
  public static updater<T extends AnyMonarchType>(type: T): (() => InferTypeOutput<T>) | undefined {
    return type.updater;
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

  protected isInstanceOf(target: new (...args: any) => AnyMonarchType) {
    return this instanceof target;
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
   * Transform input.
   *
   * Transform is applied after previous validations and transforms have been applied.
   * @param fn function that returns a transformed input.
   */
  public transform<TTransformOutput>(fn: Parser<TOutput, TTransformOutput>): MonarchType<TInput, TTransformOutput> {
    const transform = new CustomType(pipeParser(this.parser, fn));
    if (this.updater) transform.updater = pipeParser(this.updater, fn);
    return transform;
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
      if (!valid) throw new MonarchParseError(message);
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
    if (copy.updater) {
      copy.updater = pipeParser(copy.updater, fn);
    }
    return copy;
  }

  /**
   * Auto-update field on every update operation.
   *
   * NOTE: onUpdate only works on top-level schema fields. It does not work on nested fields within objects or array elements.
   *
   * @param updateFn function that returns the new value for this field on update operations.
   */
  public onUpdate(updateFn: () => TInput) {
    const copy = MonarchType.copy(this);
    copy.updater = pipeParser(updateFn, this.parser);
    return copy;
  }
}

/**
 * Creates a MonarchType with a custom parser function.
 *
 * @param parser - Parser function that transforms input to output
 * @returns MonarchType instance
 *
 * @example
 * ```ts
 * const positiveNumber = type((input: number) => {
 *   if (input <= 0) {
 *     throw new MonarchParseError('number must be positive');
 *   }
 *   return input;
 * });
 * ```
 */
export const type = <TInput, TOutput = TInput>(parser: Parser<TInput, TOutput>): MonarchType<TInput, TOutput> =>
  new CustomType(parser);

class CustomType<TInput, TOutput = TInput> extends MonarchType<TInput, TOutput> {
  constructor(protected parser: Parser<TInput, TOutput>) {
    super(parser);
  }

  protected copy() {
    return new CustomType<TInput, TOutput>(this.parser);
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
    const updater = MonarchType.updater(type);

    super((input) => {
      if (input === null) return null;
      return parser(input);
    }, updater);
  }

  protected copy() {
    return new MonarchNullable(this.type);
  }

  protected isInstanceOf(target: new (...args: any[]) => any) {
    return this instanceof target || MonarchType.isInstanceOf(this.type, target);
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
    const updater = MonarchType.updater(type);

    super((input) => {
      if (input === undefined) return undefined;
      return parser(input);
    }, updater);
  }

  protected copy() {
    return new MonarchOptional(this.type);
  }

  protected isInstanceOf(target: new (...args: any[]) => any) {
    return this instanceof target || MonarchType.isInstanceOf(this.type, target);
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
    const updater = MonarchType.updater(type);

    super((input) => {
      if (input === undefined) {
        const defaultValue = MonarchDefaulted.isDefaultFunction(defaultInput) ? defaultInput() : defaultInput;
        return parser(defaultValue);
      }
      return parser(input);
    }, updater);
  }

  protected copy() {
    return new MonarchDefaulted(this.type, this.defaultInput);
  }

  protected isInstanceOf(target: new (...args: any[]) => any) {
    return this instanceof target || MonarchType.isInstanceOf(this.type, target);
  }

  private static isDefaultFunction<T>(val: unknown): val is () => T {
    return typeof val === "function";
  }
}
