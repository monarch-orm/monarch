import { type AnyMonarchType, MonarchType, pipeParser } from "./type";
import type { InferTypeInput, InferTypeOutput } from "./type-helpers";

export const pipe = <
  TPipeIn extends AnyMonarchType,
  TPipeOut extends AnyMonarchType<InferTypeOutput<TPipeIn>, any>,
>(
  pipeIn: TPipeIn,
  pipeOut: TPipeOut,
) => new MonarchPipe(pipeIn, pipeOut);

export class MonarchPipe<
  TPipeIn extends AnyMonarchType,
  TPipeOut extends AnyMonarchType<InferTypeOutput<TPipeIn>, any>,
> extends MonarchType<InferTypeInput<TPipeIn>, InferTypeOutput<TPipeOut>> {
  constructor(pipeIn: TPipeIn, pipeOut: TPipeOut) {
    super(
      pipeParser<
        InferTypeInput<TPipeIn>,
        InferTypeOutput<TPipeIn> & InferTypeInput<TPipeOut>,
        InferTypeOutput<TPipeOut>
      >(MonarchType.parser(pipeIn), MonarchType.parser(pipeOut)),
    );
  }
}
