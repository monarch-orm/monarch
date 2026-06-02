import { Collection } from "./collection/collection";
import type { BoolProjection, WithProjection } from "./collection/types/query-options";
import type { Database } from "./database";
import { type AnyRelation } from "./relations/relations";
import type { InferRelationObjectPopulation, Population, PopulationBaseOptions } from "./relations/type-helpers";
import type { AnySchema } from "./schema/schema";
import type { InferSchemaInput, InferSchemaOmit, InferSchemaOutput } from "./schema/type-helpers";
import type { IdFirst, Merge, Pretty } from "./utils/type-helpers";

export type DbCollections<
  TSchemas extends Record<string, AnySchema>,
  TRelations extends Record<string, Record<string, AnyRelation>>,
> = {
  [K in keyof TSchemas]: Collection<TSchemas[K], TRelations>;
} & {};

type DbSchemas<T> = T extends Database<infer U> ? U : never;

/**
 * Infers the input type for a collection in a database.
 */
export type InferInput<
  TDatabase extends Database<any>,
  TCollection extends keyof TDatabase["collections"],
> = InferSchemaInput<TDatabase["collections"][TCollection]["schema"]>;

/**
 * Infers the output type for a collection query with projection and population options.
 */
export type InferOutput<
  TDatabase extends Database<any>,
  TCollection extends keyof TDatabase["collections"],
  TOptions extends PopulationBaseOptions<
    InferSchemaOutput<TDatabase["collections"][TCollection]["schema"]>,
    DbSchemas<TDatabase>["relations"],
    TCollection
  > = {},
> = Pretty<
  IdFirst<
    Merge<
      WithProjection<
        TOptions["select"] extends BoolProjection<any> ? "select" : "omit",
        TOptions["select"] extends BoolProjection<any>
          ? keyof TOptions["select"]
          : unknown extends TOptions["omit"]
            ? InferSchemaOmit<TDatabase["collections"][TCollection]["schema"]>
            : keyof TOptions["omit"],
        InferSchemaOutput<TDatabase["collections"][TCollection]["schema"]>
      >,
      TOptions["populate"] extends Population<any, any>
        ? InferRelationObjectPopulation<DbSchemas<TDatabase>["relations"], TCollection, TOptions["populate"]>
        : {}
    >
  >
>;
