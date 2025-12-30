import type { Filter } from "mongodb";
import type { AnySchema } from "../schema/schema";
import type { InferSchemaData } from "../schema/type-helpers";

export function and<T extends AnySchema>(...expressions: Filter<InferSchemaData<T>>[]) {
  return { $and: expressions };
}
export function or<T extends AnySchema>(...expressions: Filter<InferSchemaData<T>>[]) {
  return { $or: expressions };
}
export function nor<T extends AnySchema>(...expressions: Filter<InferSchemaData<T>>[]) {
  return { $nor: expressions };
}

// Does not exist on root selector
export function not<T extends AnySchema>(expression: Filter<InferSchemaData<T>>) {
  return { $not: expression };
}

export function eq<T>(value: T) {
  return { $eq: value };
}
export function neq<T>(value: T) {
  return { $ne: value };
}
export function gt<T>(value: T) {
  return { $gt: value };
}
export function lt<T>(value: T) {
  return { $lt: value };
}
export function gte<T>(value: T) {
  return { $gte: value };
}
export function lte<T>(value: T) {
  return { $lte: value };
}
export function inArray<T>(values: T[]) {
  return { $in: values };
}
export function notInArray<T>(values: T[]) {
  return { $nin: values };
}

export function exists() {
  return { $exists: true };
}
export function notExists() {
  return { $exists: false };
}

export function size(value: number) {
  return { $size: value };
}
