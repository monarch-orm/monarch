import type { AnyMonarchType } from "../types/type";
import type { InferTypeOutput } from "../types/type-helpers";

export type SchemaVirtuals<
  TTypes extends Record<string, AnyMonarchType>,
  TVirtuals extends Record<string, Virtual<TTypes, any, any>>,
> = TVirtuals;

export type InferVirtualOutput<
  T extends Record<string, Virtual<any, any, any>>,
> = {
  [K in keyof T]: T[K] extends Virtual<any, any, infer R> ? R : never;
};

type Props<T extends Record<string, AnyMonarchType>, P extends keyof T> = {
  [K in keyof T as K extends P ? K : never]: InferTypeOutput<T[K]>;
} & {};

export type Virtual<
  T extends Record<string, AnyMonarchType>,
  P extends keyof T,
  R,
> = {
  input: P[];
  output(props: Props<T, P>): R;
};

export function virtual<
  T extends Record<string, AnyMonarchType>,
  const P extends keyof T,
  R,
>(input: P | P[], output: (props: Props<T, P>) => R): Virtual<T, P, R> {
  return {
    input: Array.isArray(input) ? input : [input],
    output,
  };
}
