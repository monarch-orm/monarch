import type { Parser } from "../../types/type";
import type { InferRelationInput, InferRelationOutput } from "./type-helpers";

export type AnyMonarchRelation = MonarchRelation<any, any>;

export abstract class MonarchRelation<TInput, TOutput> {
  constructor(public parser: Parser<TInput, TOutput>) {}

  public static getRelation(relation: AnyMonarchRelation) {
    return relation?.getRelation();
  }

  protected getRelation(): AnyMonarchRelation {
    return this;
  }

  public nullable() {
    return new MonarchNullableRelation(this);
  }

  public optional() {
    return new MonarchOptionalRelation(this);
  }
}

export class MonarchNullableRelation<
  T extends AnyMonarchRelation,
> extends MonarchRelation<
  InferRelationInput<T> | undefined,
  InferRelationOutput<T> | undefined
> {
  constructor(protected type: T) {
    super((input) => {
      if (input === null) return null;
      return type.parser(input);
    });
  }
  protected getRelation() {
    return MonarchRelation.getRelation(this.type) || this.type;
  }
}

export class MonarchOptionalRelation<
  T extends AnyMonarchRelation,
> extends MonarchRelation<
  InferRelationInput<T> | undefined,
  InferRelationOutput<T> | undefined
> {
  constructor(protected type: T) {
    super((input) => {
      if (input === undefined) return undefined;
      return type.parser(input);
    });
  }

  protected getRelation() {
    return MonarchRelation.getRelation(this.type) || this.type;
  }
}
