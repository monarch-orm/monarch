import type { StrictUpdateFilter } from "mongodb";
import { MonarchParseError } from "../errors";
import {
  MonarchArray,
  MonarchDate,
  MonarchDecimal128,
  MonarchDouble,
  MonarchInt32,
  MonarchLong,
  MonarchNumber,
  MonarchOptional,
  MonarchType,
  type AnyMonarchType,
} from "../types";

export function updateParser<T extends AnyMonarchType>(
  schemaType: T,
  schemaUpdate: (() => StrictUpdateFilter<any>) | undefined,
  update: StrictUpdateFilter<any>,
) {
  let updates: Map<string, { op: string; value: any }> | undefined;
  const schemaUpdateObj = schemaUpdate?.();
  if (schemaUpdateObj) {
    updates = new Map();
    for (const [op, fields] of Object.entries(schemaUpdateObj)) {
      for (const [path, value] of Object.entries(fields)) {
        updates.set(path, { op, value });
      }
    }
  }
  const input: StrictUpdateFilter<any> = {};

  // Field update operators: parse value through field's type
  if (update.$set) input.$set = parseFieldsOperator(schemaType, update.$set, updates);
  if (update.$setOnInsert) input.$setOnInsert = parseFieldsOperator(schemaType, update.$setOnInsert, updates);
  if (update.$min) input.$min = parseFieldsOperator(schemaType, update.$min, updates);
  if (update.$max) input.$max = parseFieldsOperator(schemaType, update.$max, updates);

  // Array update operators: require array field, parse element value (supports $each modifier)
  if (update.$push) input.$push = parseArrayOperator("$push", schemaType, update.$push, updates);
  if (update.$addToSet) input.$addToSet = parseArrayOperator("$addToSet", schemaType, update.$addToSet, updates);

  // Array update operator: requires array field, parse each element
  if (update.$pullAll) input.$pullAll = parseArrayAllOperator(schemaType, update.$pullAll, updates);

  // Array update operators: require array field, pass through
  if (update.$pull) input.$pull = parseArrayPassThroughOperator("$pull", schemaType, update.$pull, updates);
  if (update.$pop) input.$pop = parseArrayPassThroughOperator("$pop", schemaType, update.$pop, updates);

  // Numeric update operators: require numeric field, pass through
  if (update.$inc) input.$inc = parseNumericPassThroughOperator("$inc", schemaType, update.$inc, updates);
  if (update.$mul) input.$mul = parseNumericPassThroughOperator("$mul", schemaType, update.$mul, updates);

  // Field removal: requires optional field, pass through
  if (update.$unset) input.$unset = parseUnsetOperator(schemaType, update.$unset, updates);

  // Date operator: requires date field, pass through
  if (update.$currentDate) input.$currentDate = parseDateOperator(schemaType, update.$currentDate, updates);

  // Bitwise operator: requires integer field, pass through
  if (update.$bit) input.$bit = parseBitOperator(schemaType, update.$bit, updates);

  // Rename operator: requires optional source, compatible destination
  if (update.$rename) input.$rename = parseRenameOperator(schemaType, update.$rename, updates);

  // Apply default schema updates
  if (schemaUpdateObj && updates?.size) {
    const defaultUpdates = updateParser(schemaType, undefined, schemaUpdateObj);
    for (const [op, fields] of Object.entries(defaultUpdates)) {
      if (!input[op]) input[op] = {};
      for (const [path, value] of Object.entries(fields)) {
        if (updates.has(path)) input[op][path] = value;
      }
    }
  }

  return input;
}

function parseFieldsOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  const parsed: Record<string, any> = {};
  for (const [path, value] of Object.entries(fields)) {
    const pathType = MonarchType.index(schemaType, path.split("."), -1);
    const parser = MonarchType.parser(pathType);
    parsed[path] = parser(value);
    if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
  }
  return parsed;
}

function parseArrayOperator(
  op: "$push" | "$addToSet",
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  const parsed: Record<string, any> = {};
  for (const [path, value] of Object.entries(fields)) {
    const pathType = MonarchType.index(schemaType, path.split("."), -1);
    if (!MonarchType.isInstanceOf(pathType, MonarchArray)) {
      throw MonarchParseError.create({ path, message: `operator '${op}' requires an array field` });
    }
    const elementType = MonarchArray.type(pathType);
    const parser = MonarchType.parser(elementType);
    if (typeof value === "object" && value !== null && "$each" in value) {
      const ops = value as { $each: unknown[] } & Record<string, unknown>;
      parsed[path] = { ...ops, $each: ops.$each.map(parser) };
    } else {
      parsed[path] = parser(value);
    }
    if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
  }
  return parsed;
}

function parseArrayAllOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, unknown[]>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  const parsed: Record<string, any> = {};
  for (const [path, value] of Object.entries(fields)) {
    const pathType = MonarchType.index(schemaType, path.split("."), -1);
    if (!MonarchType.isInstanceOf(pathType, MonarchArray)) {
      throw MonarchParseError.create({ path, message: `operator '$pullAll' requires an array field` });
    }
    const elementType = MonarchArray.type(pathType);
    const parser = MonarchType.parser(elementType);
    parsed[path] = value.map(parser);
    if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
  }
  return parsed;
}

function parseArrayPassThroughOperator(
  op: "$pull" | "$pop",
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  const parsed: Record<string, any> = {};
  for (const [path, value] of Object.entries(fields)) {
    const pathType = MonarchType.index(schemaType, path.split("."), -1);
    if (!MonarchType.isInstanceOf(pathType, MonarchArray)) {
      throw MonarchParseError.create({ path, message: `operator '${op}' requires an array field` });
    }
    parsed[path] = value;
    if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
  }
  return parsed;
}

function parseNumericPassThroughOperator(
  op: "$inc" | "$mul",
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  const parsed: Record<string, any> = {};
  for (const [path, value] of Object.entries(fields)) {
    const pathType = MonarchType.index(schemaType, path.split("."), -1);
    if (
      !MonarchType.isInstanceOf(pathType, MonarchNumber) &&
      !MonarchType.isInstanceOf(pathType, MonarchInt32) &&
      !MonarchType.isInstanceOf(pathType, MonarchDouble) &&
      !MonarchType.isInstanceOf(pathType, MonarchLong) &&
      !MonarchType.isInstanceOf(pathType, MonarchDecimal128)
    ) {
      throw MonarchParseError.create({ path, message: `operator '${op}' requires a numeric field` });
    }
    parsed[path] = value;
    if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
  }
  return parsed;
}

function parseUnsetOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  const parsed: Record<string, any> = {};
  for (const [path, value] of Object.entries(fields)) {
    const pathType = MonarchType.index(schemaType, path.split("."), -1);
    if (!MonarchType.isInstanceOf(pathType, MonarchOptional)) {
      throw MonarchParseError.create({ path, message: `operator '$unset' requires an optional field` });
    }
    parsed[path] = value;
    if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
  }
  return parsed;
}

function parseDateOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, true | { $type: "date" | "timestamp" }>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  const parsed: Record<string, any> = {};
  for (const [path, value] of Object.entries(fields)) {
    const pathType = MonarchType.index(schemaType, path.split("."), -1);
    if (!MonarchType.isInstanceOf(pathType, MonarchDate)) {
      throw MonarchParseError.create({ path, message: `operator '$currentDate' requires a date field` });
    }
    if (typeof value === "object" && value !== null && value.$type === "timestamp") {
      throw MonarchParseError.create({ path, message: `date type does not support $type 'timestamp'` });
    }
    parsed[path] = value;
    if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
  }
  return parsed;
}

function parseBitOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  const parsed: Record<string, any> = {};
  for (const [path, value] of Object.entries(fields)) {
    const pathType = MonarchType.index(schemaType, path.split("."), -1);
    if (
      !MonarchType.isInstanceOf(pathType, MonarchNumber) &&
      !MonarchType.isInstanceOf(pathType, MonarchInt32) &&
      !MonarchType.isInstanceOf(pathType, MonarchLong)
    ) {
      throw MonarchParseError.create({ path, message: `operator '$bit' requires an integer field` });
    }
    parsed[path] = value;
    if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
  }
  return parsed;
}

function parseRenameOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, string>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  const parsed: Record<string, any> = {};
  for (const [path, dest] of Object.entries(fields)) {
    const sourceType = MonarchType.index(schemaType, path.split("."), -1);
    if (!MonarchType.isInstanceOf(sourceType, MonarchOptional)) {
      throw MonarchParseError.create({
        path,
        message: `operator '$rename' requires an optional field`,
      });
    }
    const sourceInner = MonarchOptional.type(sourceType);
    const destType = MonarchType.index(schemaType, dest.split("."), -1);
    if (!MonarchType.isInstanceOf(destType, sourceInner.constructor as new (...args: any[]) => AnyMonarchType)) {
      throw MonarchParseError.create({
        path,
        message: `operator '$rename' destination field '${dest}' is not compatible with source field '${path}'`,
      });
    }
    parsed[path] = dest;
    if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
  }
  return parsed;
}

function removeUpdateConflict(updatePath: string, schemaUpdates: Map<string, { op: string; value: any }>) {
  for (const [schemaUpdatePath] of schemaUpdates) {
    if (
      schemaUpdatePath === updatePath ||
      schemaUpdatePath.startsWith(updatePath + ".") ||
      updatePath.startsWith(schemaUpdatePath + ".")
    ) {
      schemaUpdates.delete(schemaUpdatePath);
    }
  }
}
