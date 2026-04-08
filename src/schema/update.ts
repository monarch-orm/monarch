import { type StrictUpdateFilter } from "mongodb";
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
import type { UpdateFilter } from "./type-helpers";

export function updateParser<T extends AnyMonarchType>(
  schemaType: T,
  schemaUpdate: (() => UpdateFilter<any>) | undefined,
  update: UpdateFilter<any>,
  upsert: boolean,
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

  let setOnInsertSkipSet: Set<string> | undefined;
  if (upsert || update.$setOnInsert) setOnInsertSkipSet = new Set();

  const input: StrictUpdateFilter<any> = {};

  // Field update operators: parse value through field's type
  if (update.$set) input.$set = parseFieldsOperator("$set", schemaType, update.$set, updates, setOnInsertSkipSet);
  if (update.$min) input.$min = parseFieldsOperator("$min", schemaType, update.$min, updates);
  if (update.$max) input.$max = parseFieldsOperator("$max", schemaType, update.$max, updates);

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
  if (update.$unset) input.$unset = parseUnsetOperator(schemaType, update.$unset, updates, setOnInsertSkipSet);

  // Date operator: requires date field, pass through
  if (update.$currentDate) input.$currentDate = parseDateOperator(schemaType, update.$currentDate, updates);

  // Bitwise operator: requires integer field, pass through
  if (update.$bit) input.$bit = parseBitOperator(schemaType, update.$bit, updates);

  // Rename operator: requires optional source, compatible destination
  if (update.$rename) input.$rename = parseRenameOperator(schemaType, update.$rename, updates, setOnInsertSkipSet);

  // Apply default schema updates
  if (schemaUpdateObj && updates?.size) {
    const defaultUpdates = updateParser(schemaType, undefined, schemaUpdateObj, false);
    for (const [op, fields] of Object.entries(defaultUpdates)) {
      if (!input[op]) input[op] = {};
      for (const [path, value] of Object.entries(fields)) {
        if (updates.has(path)) input[op][path] = value;
      }
    }
  }

  // Upsert update: parse and flatten full document
  if (setOnInsertSkipSet) {
    input.$setOnInsert = parseSetOnInsertOperator(schemaType, update.$setOnInsert ?? {}, setOnInsertSkipSet);
  }

  return input;
}

function parseFieldsOperator(
  op: "$set" | "$min" | "$max",
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
  setOnInsertSkipSet?: Set<string>,
) {
  try {
    const parsed: Record<string, any> = {};
    for (const [path, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const pathType = MonarchType.index(schemaType, path.split("."), -1);
      const parser = MonarchType.parser(pathType, path);
      parsed[path] = parser(value);
      if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
      setOnInsertSkipSet?.add(path);
    }
    return parsed;
  } catch (error) {
    throw MonarchParseError.fromCause({ path: op, cause: error });
  }
}

function parseArrayOperator(
  op: "$push" | "$addToSet",
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  try {
    const parsed: Record<string, any> = {};
    for (const [path, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const pathType = MonarchType.index(schemaType, path.split("."), -1);
      if (!MonarchType.isInstanceOf(pathType, MonarchArray)) {
        throw MonarchParseError.fromCause({ path, cause: MonarchParseError.create(`operator '${op}' requires an array field`) });
      }
      const elementType = MonarchArray.type(pathType);
      const parser = MonarchType.parser(elementType, path);
      if (typeof value === "object" && value !== null && "$each" in value) {
        const ops = value as { $each: unknown[]; [k: string]: unknown };
        parsed[path] = { ...ops, $each: ops.$each.map(parser) };
      } else {
        parsed[path] = parser(value);
      }
      if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
    }
    return parsed;
  } catch (error) {
    throw MonarchParseError.fromCause({ path: op, cause: error });
  }
}

function parseArrayAllOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, unknown[]>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  try {
    const parsed: Record<string, any> = {};
    for (const [path, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const pathType = MonarchType.index(schemaType, path.split("."), -1);
      if (!MonarchType.isInstanceOf(pathType, MonarchArray)) {
        throw MonarchParseError.fromCause({ path, cause: MonarchParseError.create(`operator '$pullAll' requires an array field`) });
      }
      const elementType = MonarchArray.type(pathType);
      const parser = MonarchType.parser(elementType, path);
      parsed[path] = value.map(parser);
      if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
    }
    return parsed;
  } catch (error) {
    throw MonarchParseError.fromCause({ path: "$pullAll", cause: error });
  }
}

function parseArrayPassThroughOperator(
  op: "$pull" | "$pop",
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  try {
    const parsed: Record<string, any> = {};
    for (const [path, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const pathType = MonarchType.index(schemaType, path.split("."), -1);
      if (!MonarchType.isInstanceOf(pathType, MonarchArray)) {
        throw MonarchParseError.fromCause({ path, cause: MonarchParseError.create(`operator '${op}' requires an array field`) });
      }
      parsed[path] = value;
      if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
    }
    return parsed;
  } catch (error) {
    throw MonarchParseError.fromCause({ path: op, cause: error });
  }
}

function parseNumericPassThroughOperator(
  op: "$inc" | "$mul",
  schemaType: AnyMonarchType,
  fields: Record<string, any>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  try {
    const parsed: Record<string, any> = {};
    for (const [path, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const pathType = MonarchType.index(schemaType, path.split("."), -1);
      if (
        !MonarchType.isInstanceOf(pathType, MonarchNumber) &&
        !MonarchType.isInstanceOf(pathType, MonarchInt32) &&
        !MonarchType.isInstanceOf(pathType, MonarchDouble) &&
        !MonarchType.isInstanceOf(pathType, MonarchLong) &&
        !MonarchType.isInstanceOf(pathType, MonarchDecimal128)
      ) {
        throw MonarchParseError.fromCause({ path, cause: MonarchParseError.create(`operator '${op}' requires a numeric field`) });
      }
      const parser = MonarchType.parser(pathType, path);
      parsed[path] = parser(value);
      if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
    }
    return parsed;
  } catch (error) {
    throw MonarchParseError.fromCause({ path: op, cause: error });
  }
}

function parseUnsetOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
  setOnInsertSkipSet?: Set<string>,
) {
  try {
    const parsed: Record<string, any> = {};
    for (const [path, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const pathType = MonarchType.index(schemaType, path.split("."), -1);
      if (!MonarchType.isInstanceOf(pathType, MonarchOptional)) {
        throw MonarchParseError.fromCause({ path, cause: MonarchParseError.create(`operator '$unset' requires an optional field`) });
      }
      parsed[path] = value;
      if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
      setOnInsertSkipSet?.add(path);
    }
    return parsed;
  } catch (error) {
    throw MonarchParseError.fromCause({ path: "$unset", cause: error });
  }
}

function parseDateOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, true | { $type: "date" | "timestamp" }>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  try {
    const parsed: Record<string, any> = {};
    for (const [path, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const pathType = MonarchType.index(schemaType, path.split("."), -1);
      if (!MonarchType.isInstanceOf(pathType, MonarchDate)) {
        throw MonarchParseError.fromCause({
          path,
          cause: MonarchParseError.create(`operator '$currentDate' requires a date field`),
        });
      }
      if (typeof value === "object" && value !== null && value.$type === "timestamp") {
        throw MonarchParseError.fromCause({ path, cause: MonarchParseError.create(`date type does not support $type 'timestamp'`) });
      }
      parsed[path] = value;
      if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
    }
    return parsed;
  } catch (error) {
    throw MonarchParseError.fromCause({ path: "$currentDate", cause: error });
  }
}

function parseBitOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
) {
  try {
    const parsed: Record<string, any> = {};
    for (const [path, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const pathType = MonarchType.index(schemaType, path.split("."), -1);
      if (
        !MonarchType.isInstanceOf(pathType, MonarchNumber) &&
        !MonarchType.isInstanceOf(pathType, MonarchInt32) &&
        !MonarchType.isInstanceOf(pathType, MonarchLong)
      ) {
        throw MonarchParseError.fromCause({ path, cause: MonarchParseError.create(`operator '$bit' requires an integer field`) });
      }
      parsed[path] = value;
      if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
    }
    return parsed;
  } catch (error) {
    throw MonarchParseError.fromCause({ path: "$bit", cause: error });
  }
}

function parseRenameOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, string>,
  schemaUpdates?: Map<string, { op: string; value: any }>,
  setOnInsertSkipSet?: Set<string>,
) {
  try {
    const parsed: Record<string, any> = {};
    for (const [path, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const sourceType = MonarchType.index(schemaType, path.split("."), -1);
      if (!MonarchType.isInstanceOf(sourceType, MonarchOptional)) {
        throw MonarchParseError.fromCause({ path, cause: MonarchParseError.create(`operator '$rename' requires an optional field`) });
      }
      const sourceInner = MonarchOptional.type(sourceType);
      const destType = MonarchType.index(schemaType, value.split("."), -1);
      if (!MonarchType.isInstanceOf(destType, sourceInner.constructor as new (...args: any[]) => AnyMonarchType)) {
        throw MonarchParseError.fromCause({ path, cause: MonarchParseError.create(`operator '$rename' destination field '${value}' is not compatible with source field '${path}'`) });
      }
      parsed[path] = value;
      if (schemaUpdates) removeUpdateConflict(path, schemaUpdates);
      setOnInsertSkipSet?.add(path);
    }
    return parsed;
  } catch (error) {
    throw MonarchParseError.fromCause({ path: "$rename", cause: error });
  }
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

function parseSetOnInsertOperator(
  schemaType: AnyMonarchType,
  fields: Record<string, unknown>,
  setOnInsertSkipSet: Set<string>,
) {
  try {
    const parser = MonarchType.parser(schemaType);
    return flattenObject(parser(fields), setOnInsertSkipSet);
  } catch (error) {
    throw MonarchParseError.fromCause({ path: "$setOnInsert", cause: error });
  }
}

function flattenObject(obj: Record<string, any>, skipSet: Set<string>) {
  const out: Record<string, any> = {};
  const stack = [{ obj, path: "" }];

  while (stack.length) {
    const { obj, path } = stack.pop()!;

    for (const [key, value] of Object.entries(obj)) {
      const nextPath = path ? `${path}.${key}` : key;

      if (skipSet.has(nextPath)) continue;

      if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
        stack.push({ obj: value, path: nextPath });
      } else {
        out[nextPath] = value;
      }
    }
  }
  return out;
}
