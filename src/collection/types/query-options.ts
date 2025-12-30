import type { SortDirection } from "mongodb";

export type Projection<T> = {
  [K in keyof T]?: 1 | 0;
};
export type BoolProjection<T> = {
  [K in keyof T]?: true;
};
export type WithProjection<Type extends "omit" | "select", Keys extends keyof any, T> = [Keys] extends [never]
  ? T
  : Type extends "omit"
    ? {
        [K in keyof T as K extends Keys ? never : K]: T[K];
      }
    : {
        [K in keyof T as K extends Keys | "_id" ? K : never]: T[K];
      };

export type Sort<T> =
  | Exclude<
      SortDirection,
      {
        $meta: string;
      }
    >
  | Extract<keyof T, string>
  | Extract<keyof T, string>[]
  | {
      [K in Extract<keyof T, string>]?: SortDirection;
    }
  | [Extract<keyof T, string>, SortDirection][];
