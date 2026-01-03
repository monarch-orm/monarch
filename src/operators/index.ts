import type { Filter } from "mongodb";
import type { AnySchema } from "../schema/schema";
import type { InferSchemaData } from "../schema/type-helpers";

/**
 * Logical AND operator - matches documents that satisfy all expressions.
 *
 * @param expressions - Array of filter expressions
 * @returns MongoDB $and operator
 */
export function and<T extends AnySchema>(...expressions: Filter<InferSchemaData<T>>[]) {
  return { $and: expressions };
}

/**
 * Logical OR operator - matches documents that satisfy at least one expression.
 *
 * @param expressions - Array of filter expressions
 * @returns MongoDB $or operator
 */
export function or<T extends AnySchema>(...expressions: Filter<InferSchemaData<T>>[]) {
  return { $or: expressions };
}

/**
 * Logical NOR operator - matches documents that fail all expressions.
 *
 * @param expressions - Array of filter expressions
 * @returns MongoDB $nor operator
 */
export function nor<T extends AnySchema>(...expressions: Filter<InferSchemaData<T>>[]) {
  return { $nor: expressions };
}

/**
 * Logical NOT operator - inverts the effect of a filter expression.
 *
 * @param expression - Filter expression to negate
 * @returns MongoDB $not operator
 */
export function not<T extends AnySchema>(expression: Filter<InferSchemaData<T>>) {
  return { $not: expression };
}

/**
 * Equality operator - matches values equal to a specified value.
 *
 * @param value - Value to match
 * @returns MongoDB $eq operator
 */
export function eq<T>(value: T) {
  return { $eq: value };
}

/**
 * Inequality operator - matches values not equal to a specified value.
 *
 * @param value - Value to exclude
 * @returns MongoDB $ne operator
 */
export function neq<T>(value: T) {
  return { $ne: value };
}

/**
 * Greater than operator - matches values greater than a specified value.
 *
 * @param value - Comparison value
 * @returns MongoDB $gt operator
 */
export function gt<T>(value: T) {
  return { $gt: value };
}

/**
 * Less than operator - matches values less than a specified value.
 *
 * @param value - Comparison value
 * @returns MongoDB $lt operator
 */
export function lt<T>(value: T) {
  return { $lt: value };
}

/**
 * Greater than or equal operator - matches values greater than or equal to a specified value.
 *
 * @param value - Comparison value
 * @returns MongoDB $gte operator
 */
export function gte<T>(value: T) {
  return { $gte: value };
}

/**
 * Less than or equal operator - matches values less than or equal to a specified value.
 *
 * @param value - Comparison value
 * @returns MongoDB $lte operator
 */
export function lte<T>(value: T) {
  return { $lte: value };
}

/**
 * In array operator - matches values that exist in a specified array.
 *
 * @param values - Array of values to match
 * @returns MongoDB $in operator
 */
export function inArray<T>(values: T[]) {
  return { $in: values };
}

/**
 * Not in array operator - matches values that do not exist in a specified array.
 *
 * @param values - Array of values to exclude
 * @returns MongoDB $nin operator
 */
export function notInArray<T>(values: T[]) {
  return { $nin: values };
}

/**
 * Exists operator - matches documents where the field exists.
 *
 * @returns MongoDB $exists operator with true
 */
export function exists() {
  return { $exists: true };
}

/**
 * Not exists operator - matches documents where the field does not exist.
 *
 * @returns MongoDB $exists operator with false
 */
export function notExists() {
  return { $exists: false };
}

/**
 * Size operator - matches arrays with a specified number of elements.
 *
 * @param value - Required array size
 * @returns MongoDB $size operator
 */
export function size(value: number) {
  return { $size: value };
}
