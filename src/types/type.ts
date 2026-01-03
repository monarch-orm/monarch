import { MonarchParseError } from "../errors";
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

/**
 * Creates a MonarchType with custom parser.
 *
 * @param parser - Parser function
 * @returns MonarchType instance
 */
export const type = <TInput, TOutput = TInput>(parser: Parser<TInput, TOutput>) => new MonarchType(parser);

export type AnyMonarchType<TInput = any, TOutput = TInput> = MonarchType<TInput, TOutput>;

/**
 * Base class for all Monarch types.
 */
export class MonarchType<TInput, TOutput = TInput> {
  constructor(
    protected parser: Parser<TInput, TOutput>,
    protected updater?: Parser<void, TOutput>,
  ) {}

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
  public static updater<T extends AnyMonarchType>(type: T): Parser<void, InferTypeOutput<T>> | undefined {
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
   * Auto-update field on every update operation.
   *
   * NOTE: onUpdate only works on top-level schema fields. It does not work on nested fields within objects or array elements.
   *
   * @param updateFn function that returns the new value for this field on update operations.
   */
  public onUpdate(updateFn: () => TInput) {
    return new MonarchType(this.parser, pipeParser(updateFn, this.parser));
  }

  /**
   * Transform input.
   *
   * Transform is applied after previous validations and transforms have been applied.
   * @param fn function that returns a transformed input.
   */
  public transform<TTransformOutput>(fn: (input: TOutput) => TTransformOutput) {
    return new MonarchType(pipeParser(this.parser, fn), this.updater && pipeParser(this.updater, fn));
  }

  /**
   * Validate input.
   *
   * Validation is applied after previous validations and transforms have been applied.
   * @param fn function that returns `true` for successful validation and `false` for failed validation.
   * @param message error message when validation fails.
   */
  public validate(fn: (input: TOutput) => boolean, message: string) {
    return new MonarchType(
      pipeParser(this.parser, (input) => {
        const valid = fn(input);
        if (!valid) throw new MonarchParseError(message);
        return input;
      }),
      this.updater,
    );
  }

  /**
   * Extends the parser and updater of this type from that of the base type.
   *
   * Extends should be called on a new instance of the type as it always mutates the type.
   *
   * @param base type to copy parser and updater from.
   * @param options options to optionally modify the copied parser or replace the copied updater.
   * @returns
   */
  public extend<T extends MonarchType<TInput, TOutput>>(
    base: T,
    options: {
      preprocess?: Parser<TInput, TInput>;
      parse?: Parser<TOutput, TOutput>;
      onUpdate?: Parser<void, TInput>;
    },
  ) {
    let parser = options.preprocess ? pipeParser(options.preprocess, base.parser) : base.parser;
    if (options.parse) parser = pipeParser(parser, options.parse);
    this.parser = parser;
    this.updater = options.onUpdate ? pipeParser(options.onUpdate, parser) : base.updater;
    return this;
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
    defaultInput: InferTypeInput<T> | (() => InferTypeInput<T>),
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

  protected isInstanceOf(target: new (...args: any[]) => any) {
    return this instanceof target || MonarchType.isInstanceOf(this.type, target);
  }

  private static isDefaultFunction<T>(val: unknown): val is () => T {
    return typeof val === "function";
  }
}
