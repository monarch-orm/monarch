import { MonarchParseError } from "../errors";
import { type AnyMonarchType, type Parser, MonarchType, pipeParser } from "./type";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";

/**
 * Pipe type.
 *
 * @param pipeIn - Input type
 * @param pipeOut - Output type
 * @returns MonarchPipe instance
 */
export const pipe = <TPipeIn extends AnyMonarchType, TPipeOut extends AnyMonarchType<InferTypeOutput<TPipeIn>, any>>(
  pipeIn: TPipeIn,
  pipeOut: TPipeOut,
) => new MonarchPipe(pipeIn, pipeOut);

/**
 * Type for piped transformations.
 */
export class MonarchPipe<
  TPipeIn extends AnyMonarchType,
  TPipeOut extends AnyMonarchType<InferTypeOutput<TPipeIn>, any>,
> extends MonarchType<InferTypeInput<TPipeIn>, InferTypeOutput<TPipeOut>> {
  constructor(
    private pipeIn: TPipeIn,
    private pipeOut: TPipeOut,
  ) {
    super(
      pipeParser<
        InferTypeInput<TPipeIn>,
        InferTypeOutput<TPipeIn> & InferTypeInput<TPipeOut>,
        InferTypeOutput<TPipeOut>
      >(MonarchType.parser(pipeIn), MonarchType.parser(pipeOut)),
    );
  }

  protected parserAt(path: string[], index: number): Parser<any, any> {
    if (index === path.length - 1) return this.parser;
    throw new MonarchParseError(`updates must replace the entire pipe value`);
  }

  protected copy() {
    return new MonarchPipe(this.pipeIn, this.pipeOut);
  }
}
