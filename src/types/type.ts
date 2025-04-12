import { MonarchParseError } from "../errors";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";

export type Parser<Input, Output> = (input: Input) => Output;

export function pipeParser<Input, InterOutput, Output>(
  prevParser: Parser<Input, InterOutput>,
  nextParser: Parser<InterOutput, Output>,
): Parser<Input, Output> {
  return (input) => nextParser(prevParser(input));
}

export const type = <TInput, TOutput = TInput>(
  parser: Parser<TInput, TOutput>,
  updater?: Parser<void, TOutput>,
) => new MonarchType(parser, updater);

export type AnyMonarchType<TInput = any, TOutput = TInput> = MonarchType<
  TInput,
  TOutput
>;

export class MonarchType<TInput, TOutput> {
  constructor(
    private _parser: Parser<TInput, TOutput>,
    private _updater?: Parser<void, TOutput>,
  ) {}

  public static parser<T extends AnyMonarchType>(
    type: T,
  ): Parser<InferTypeInput<T>, InferTypeOutput<T>> {
    return type._parser;
  }

  public static updater<T extends AnyMonarchType>(
    type: T,
  ): Parser<void, InferTypeOutput<T>> | undefined {
    return type._updater;
  }

  public static isInstanceOf<T extends new (...args: any[]) => AnyMonarchType>(
    type: AnyMonarchType,
    target: T,
  ): type is InstanceType<T> {
    return type.isInstanceOf(target);
  }

  protected isInstanceOf(target: new (...args: any[]) => any) {
    return this instanceof target;
  }

  public nullable() {
    return nullable(this);
  }

  public optional() {
    return optional(this);
  }

  public default(defaultInput: TInput | (() => TInput)) {
    return defaulted(
      this,
      defaultInput as InferTypeInput<this> | (() => InferTypeInput<this>),
    );
  }

  public onUpdate(updateFn: () => TInput) {
    return type(this._parser, pipeParser(updateFn, this._parser));
  }

  /**
   * Transform input.
   *
   * Transform is applied after previous validations and transforms have been applied.
   * @param fn function that returns a transformed input.
   */
  public transform<TTransformOutput>(fn: (input: TOutput) => TTransformOutput) {
    return type(
      pipeParser(this._parser, fn),
      this._updater && pipeParser(this._updater, fn),
    );
  }

  /**
   * Validate input.
   *
   * Validation is applied after previous validations and transforms have been applied.
   * @param fn function that returns `true` for successful validation and `false` for failed validation.
   * @param message error message when validation fails.
   */
  public validate(fn: (input: TOutput) => boolean, message: string) {
    return type(
      pipeParser(this._parser, (input) => {
        const valid = fn(input);
        if (!valid) throw new MonarchParseError(message);
        return input;
      }),
      this._updater,
    );
  }

  /**
   * Extends the parser and updater of this type from that of the base type.
   *
   * Calling extend always mutates the type and changes it's parser and updater.
   *
   * @param base type to copy parser and updater from.
   * @param options options to optionally modify the copied parser or replace the copied updater.
   * @returns
   */
  public extend<T extends MonarchType<TInput, TOutput>>(
    base: T,
    options: {
      preParse?: Parser<TInput, TInput>;
      postParse?: Parser<TOutput, TOutput>;
      onUpdate?: Parser<void, TInput>;
    },
  ) {
    let parser = options.preParse
      ? pipeParser(options.preParse, base._parser)
      : base._parser;
    if (options.postParse) parser = pipeParser(parser, options.postParse);
    this._parser = parser;
    this._updater = options.onUpdate
      ? pipeParser(options.onUpdate, parser)
      : base._updater;
    return this;
  }

  public typeName(): string {
    return this.constructor.name.replace("Monarch", "").toLowerCase();
  }
}

export const nullable = <T extends AnyMonarchType>(type: T) =>
  new MonarchNullable<T>(type);

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
    return (
      this instanceof target || MonarchType.isInstanceOf(this.type, target)
    );
  }
}

export const optional = <T extends AnyMonarchType>(type: T) =>
  new MonarchOptional<T>(type);

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
    return (
      this instanceof target || MonarchType.isInstanceOf(this.type, target)
    );
  }
}

export const defaulted = <T extends AnyMonarchType>(
  type: T,
  defaultInput: InferTypeInput<T> | (() => InferTypeInput<T>),
) => new MonarchDefaulted<T>(type, defaultInput);

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
        const defaultValue = MonarchDefaulted.isDefaultFunction(defaultInput)
          ? defaultInput()
          : defaultInput;
        return parser(defaultValue);
      }
      return parser(input);
    }, updater);
  }

  protected isInstanceOf(target: new (...args: any[]) => any) {
    return (
      this instanceof target || MonarchType.isInstanceOf(this.type, target)
    );
  }

  private static isDefaultFunction<T>(val: unknown): val is () => T {
    return typeof val === "function";
  }
}
