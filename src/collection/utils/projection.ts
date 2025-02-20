import type {
  Population,
  PopulationOptions,
} from "../../relations/type-helpers";
import type { Virtual } from "../../schema/virtuals";
import type { BoolProjection, Projection } from "../types/query-options";

export function makeProjection<T>(
  type: "omit" | "select",
  projection: BoolProjection<T>,
) {
  const _projection: Projection<T> = {};
  for (const key of Object.keys(projection) as (keyof T)[]) {
    if (projection[key]) _projection[key] = type === "omit" ? 0 : 1;
  }
  return _projection;
}

export function makePopulationProjection<T>(
  options: PopulationOptions<T, any, any>,
) {
  if (options.omit) return makeProjection("omit", options.omit);
  if (options.select) return makeProjection("select", options.select);
  return null;
}

export function detectProjection<T>(projection: Projection<T>) {
  const values = Object.values(projection);
  let type: "omit" | "select" | null;
  if (!values.length) type = null;
  else type = values[0] === 0 ? "omit" : "select";

  return {
    type,
    isProjected(key: string) {
      if (type === "omit") return !(key in projection);
      if (type === "select") return key in projection;
      return true;
    },
  };
}

export function addExtraInputsToProjection<T>(
  projection: Projection<T>,
  virtuals: Record<string, Virtual<any, any, any>> | undefined,
  populations: Population<any, any> | undefined,
): string[] | null {
  const { isProjected, type } = detectProjection(projection);

  // add populated keys to projection even if they are not projected
  if (populations) {
    for (const [key, population] of Object.entries(populations)) {
      if (!population) continue;
      if (type === "omit" && key in projection) {
        delete projection[key as keyof T];
      }
      if (type === "select" && !(key in projection)) {
        projection[key as keyof T] = 1;
      }
    }
  }

  // add dependencies of virtuals to projection
  // also add them to extras so they can be removed
  if (!virtuals) return null;
  const extras = new Set<string>();

  for (const [key, virtual] of Object.entries(virtuals)) {
    if (!isProjected(key)) continue;
    for (const input of virtual.input) {
      if (type === "omit" && input in projection) {
        delete projection[input as keyof T];
        extras.add(input);
      }
      if (type === "select" && !(input in projection)) {
        projection[input as keyof T] = 1;
        extras.add(input);
      }
    }
  }
  return Array.from(extras);
}
