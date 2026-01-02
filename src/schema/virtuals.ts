import type { AnyMonarchType } from "../types/type";
import type { InferTypeOutput } from "../types/type-helpers";

export type SchemaVirtuals<
  TTypes extends Record<string, AnyMonarchType>,
  TVirtuals extends Record<string, Virtual<TTypes, any, any>>,
> = TVirtuals;

export type InferVirtualOutput<T extends Record<string, Virtual<any, any, any>>> = {
  [K in keyof T]: T[K] extends Virtual<any, any, infer R> ? R : never;
};

type Props<T extends Record<string, AnyMonarchType>, P extends keyof T> = {
  [K in keyof T as K extends P ? K : never]: InferTypeOutput<T[K]>;
} & {};

/**
 * Defines a virtual computed field.
 *
 * @typeParam T - Schema field types
 * @typeParam P - Field names used as input
 * @typeParam R - Return type of the virtual field
 */
export type Virtual<T extends Record<string, AnyMonarchType>, P extends keyof T, R> = {
  input: P[];
  output(props: Props<T, P>): R;
};

/**
 * Creates a virtual computed field that derives its value from other schema fields.
 *
 * Virtual fields are computed on query results and are not stored in the database.
 *
 * @typeParam T - Schema field types
 * @typeParam P - Field names used as input
 * @typeParam R - Return type of the virtual field
 * @param input - Field name or array of field names used as input
 * @param output - Function that computes the virtual field value
 * @returns Virtual field definition
 */
export function virtual<T extends Record<string, AnyMonarchType>, const P extends keyof T, R>(
  input: P | P[],
  output: (props: Props<T, P>) => R,
): Virtual<T, P, R> {
  return {
    input: Array.isArray(input) ? input : [input],
    output,
  };
}
