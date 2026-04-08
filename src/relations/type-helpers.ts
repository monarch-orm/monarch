import type { Limit, Skip, Sort } from "../collection/types/pipeline-stage";
import type { BoolProjection, WithProjection } from "../collection/types/query-options";
import type { InferSchemaOmit, InferSchemaOutput } from "../schema/type-helpers";
import type { ExtractIfArray, Index, Merge, Pretty } from "../utils/type-helpers";
import type { AnyRelation, AnyRelationField, Relation } from "./relations";

export type PopulationBaseOptions<
  T,
  TRelations extends Record<string, Record<string, AnyRelation>>,
  TName extends keyof TRelations,
> =
  | {
      omit?: BoolProjection<T>;
      select?: never;
      populate?: Population<TRelations, TName>;
    }
  | {
      omit?: never;
      select?: BoolProjection<T>;
      populate?: Population<TRelations, TName>;
    };
export type PopulationOptions<
  T,
  TRelations extends Record<string, Record<string, AnyRelation>>,
  TName extends keyof TRelations,
> = PopulationBaseOptions<T, TRelations, TName> & {
  limit?: Limit["$limit"];
  skip?: Skip["$skip"];
  sort?: Sort["$sort"];
};
export type RelationPopulationOptions<
  TRelations extends Record<string, Record<string, AnyRelation>>,
  TRelation extends "one" | "many" | "refs",
  TTargetField extends AnyRelationField,
> = TRelation extends "one"
  ? PopulationBaseOptions<
      InferRelationPopulation<TRelations, TRelation, TTargetField, true>,
      TRelations,
      TTargetField["schema"]["name"]
    >
  : TRelation extends "many"
    ? PopulationOptions<
        ExtractIfArray<InferRelationPopulation<TRelations, TRelation, TTargetField, true>>,
        TRelations,
        TTargetField["schema"]["name"]
      >
    : TRelation extends "refs"
      ? PopulationOptions<
          ExtractIfArray<InferRelationPopulation<TRelations, TRelation, TTargetField, true>>,
          TRelations,
          TTargetField["schema"]["name"]
        >
      : never;
export type Population<
  TRelations extends Record<string, Record<string, AnyRelation>>,
  TName extends keyof TRelations,
> = {
  [K in keyof TRelations[TName]]?:
    | RelationPopulationOptions<TRelations, TRelations[TName][K]["relation"], TRelations[TName][K]["targetField"]>
    | true;
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
  TRelations extends Record<string, Record<string, AnyRelation>>,
  TName extends keyof TRelations,
  TPopulationOptions extends PopulationOptions<any, any, any> | true | undefined,
> =
  TPopulationOptions extends PopulationOptions<any, any, any>
    ? TPopulationOptions["populate"] extends Population<any, any>
      ? Pretty<Merge<T, InferRelationObjectPopulation<TRelations, TName, TPopulationOptions["populate"]>>>
      : T
    : T;

export type InferRelationPopulation<
  TRelations extends Record<string, Record<string, AnyRelation>>,
  TRelation extends "one" | "many" | "refs",
  TTargetField extends AnyRelationField,
  TPopulationOptions extends PopulationOptions<any, any, any> | true | undefined,
> = TRelation extends "one"
  ? WithNestedPopulate<
      WithRelationPopulation<
        InferSchemaOutput<TTargetField["schema"]>,
        TPopulationOptions,
        InferSchemaOmit<TTargetField["schema"]>
      >,
      TRelations,
      TTargetField["schema"]["name"],
      TPopulationOptions
    > | null
  : TRelation extends "many"
    ? WithNestedPopulate<
        WithRelationPopulation<
          InferSchemaOutput<TTargetField["schema"]>,
          TPopulationOptions,
          InferSchemaOmit<TTargetField["schema"]>
        >,
        TRelations,
        TTargetField["schema"]["name"],
        TPopulationOptions
      >[]
    : TRelation extends "refs"
      ? WithNestedPopulate<
          WithRelationPopulation<
            InferSchemaOutput<TTargetField["schema"]>,
            TPopulationOptions,
            InferSchemaOmit<TTargetField["schema"]>
          >,
          TRelations,
          TTargetField["schema"]["name"],
          TPopulationOptions
        >[]
      : never;

export type InferRelationObjectPopulation<
  TRelations extends Record<string, Record<string, AnyRelation>>,
  TName extends keyof TRelations,
  TPopulation extends Population<TRelations, TName>,
> = {
  [K in keyof TPopulation]: InferRelationPopulation<
    TRelations,
    Index<TRelations[TName], K>["relation"],
    Index<TRelations[TName], K>["targetField"],
    TPopulation[K] extends true
      ? Index<TRelations[TName], K> extends Relation<any, any, infer TOptions, any>
        ? TOptions
        : true
      : TPopulation[K]
  >;
};
