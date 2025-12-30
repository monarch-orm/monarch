import type { ObjectId } from "mongodb";
import type { Limit, Skip, Sort } from "../collection/types/pipeline-stage";
import type { BoolProjection, WithProjection } from "../collection/types/query-options";
import type { AnySchema } from "../schema/schema";
import type { InferSchemaOmit, InferSchemaOutput, SchemaInputWithId } from "../schema/type-helpers";
import type { ExtractIfArray, Index, Merge, Pretty } from "../utils/type-helpers";
import type { AnyRelation, AnyRelations, Relation } from "./relations";

type ValidRelationFieldType<TRelation extends "one" | "many" | "ref" | undefined> = TRelation extends "many"
  ? Array<string | number | ObjectId>
  : string | number | ObjectId;
export type SchemaRelatableField<T extends AnySchema, TRelation extends "one" | "many" | "ref" | undefined> = keyof {
  [K in keyof SchemaInputWithId<T> as NonNullable<SchemaInputWithId<T>[K]> extends ValidRelationFieldType<TRelation>
    ? K
    : never]: unknown;
};

export type PopulationBaseOptions<
  T,
  TDbRelations extends Record<string, AnyRelations>,
  TName extends keyof TDbRelations,
> =
  | {
      omit?: BoolProjection<T>;
      select?: never;
      populate?: Population<TDbRelations, TName>;
    }
  | {
      omit?: never;
      select?: BoolProjection<T>;
      populate?: Population<TDbRelations, TName>;
    };
export type PopulationOptions<
  T,
  TDbRelations extends Record<string, AnyRelations>,
  TName extends keyof TDbRelations,
> = {
  limit?: Limit["$limit"];
  skip?: Skip["$skip"];
  sort?: Sort["$sort"];
} & PopulationBaseOptions<T, TDbRelations, TName>;
type _RelationPopulationOptions<TDbRelations extends Record<string, AnyRelations>, TRelation extends AnyRelation> =
  TRelation extends Relation<"one", any, any, infer TTarget, any>
    ? PopulationBaseOptions<InferRelationPopulation<TDbRelations, TRelation, true>, TDbRelations, TTarget["name"]>
    : TRelation extends Relation<"many", any, any, infer TTarget, any>
      ? PopulationOptions<
          ExtractIfArray<InferRelationPopulation<TDbRelations, TRelation, true>>,
          TDbRelations,
          TTarget["name"]
        >
      : TRelation extends Relation<"ref", any, any, infer TTarget, any>
        ? PopulationOptions<
            ExtractIfArray<InferRelationPopulation<TDbRelations, TRelation, true>>,
            TDbRelations,
            TTarget["name"]
          >
        : never;
export type Population<TDbRelations extends Record<string, AnyRelations>, TName extends keyof TDbRelations> = {
  [K in keyof TDbRelations[TName]]?: _RelationPopulationOptions<TDbRelations, TDbRelations[TName][K]> | true;
};

type WithRelationPopulation<
  T,
  TPopulationOptions extends PopulationOptions<any, any, any> | true | undefined,
  TDefaultOmit extends keyof any,
> = TPopulationOptions extends { omit: BoolProjection<any> }
  ? WithProjection<"omit", keyof TPopulationOptions["omit"], T>
  : TPopulationOptions extends { select: BoolProjection<any> }
    ? WithProjection<"select", keyof TPopulationOptions["select"], T>
    : WithProjection<"omit", TDefaultOmit, T>;
type WithNestedPopulate<
  T,
  TDbRelations extends Record<string, AnyRelations>,
  TName extends keyof TDbRelations,
  TPopulationOptions extends PopulationOptions<any, any, any> | true | undefined,
> =
  TPopulationOptions extends PopulationOptions<any, any, any>
    ? TPopulationOptions["populate"] extends Population<any, any>
      ? Pretty<Merge<T, InferRelationObjectPopulation<TDbRelations, TName, TPopulationOptions["populate"]>>>
      : T
    : T;

export type InferRelationPopulation<
  TDbRelations extends Record<string, AnyRelations>,
  TRelation extends AnyRelation,
  TPopulationOptions extends PopulationOptions<any, any, any> | true | undefined,
> =
  TRelation extends Relation<"one", any, any, infer TTarget, any>
    ? WithNestedPopulate<
        WithRelationPopulation<InferSchemaOutput<TTarget>, TPopulationOptions, InferSchemaOmit<TTarget>>,
        TDbRelations,
        TTarget["name"],
        TPopulationOptions
      > | null
    : TRelation extends Relation<"many", any, any, infer TTarget, any>
      ? WithNestedPopulate<
          WithRelationPopulation<InferSchemaOutput<TTarget>, TPopulationOptions, InferSchemaOmit<TTarget>>,
          TDbRelations,
          TTarget["name"],
          TPopulationOptions
        >[]
      : TRelation extends Relation<"ref", any, any, infer TTarget, any>
        ? WithNestedPopulate<
            WithRelationPopulation<InferSchemaOutput<TTarget>, TPopulationOptions, InferSchemaOmit<TTarget>>,
            TDbRelations,
            TTarget["name"],
            TPopulationOptions
          >[]
        : never;

export type InferRelationObjectPopulation<
  TDbRelations extends Record<string, AnyRelations>,
  TName extends keyof TDbRelations,
  TPopulation extends Population<TDbRelations, TName>,
> = {
  [K in keyof TPopulation]: InferRelationPopulation<TDbRelations, Index<TDbRelations[TName], K>, TPopulation[K]>;
};
