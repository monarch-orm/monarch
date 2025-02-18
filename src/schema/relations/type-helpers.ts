import type { ObjectId } from "mongodb";
import type { Limit, Skip, Sort } from "../../collection/types/pipeline-stage";
import type {
  BoolProjection,
  WithProjection,
} from "../../collection/types/query-options";
import type { ExtractIfArray, Index } from "../../type-helpers";
import type { MonarchPhantom } from "../../types/type";
import type { AnySchema } from "../schema";
import type {
  InferSchemaOmit,
  InferSchemaOutput,
  InferSchemaRelations,
  SchemaInputWithId,
} from "../type-helpers";
import type {
  AnyMonarchRelation,
  MonarchNullableRelation,
  MonarchOptionalRelation,
  MonarchRelation,
} from "./base";
import type { MonarchMany } from "./many";
import type { MonarchOne } from "./one";
import type { MonarchRef } from "./ref";

export type RelationType =
  | MonarchOne<any, any, any>
  | MonarchMany<any, any, any>
  | MonarchRef<any, any, any, any>;

type ValidRelationFieldType = string | number | ObjectId;
export type SchemaRelatableField<T extends AnySchema> = keyof {
  [K in keyof SchemaInputWithId<T> as NonNullable<
    SchemaInputWithId<T>[K]
  > extends ValidRelationFieldType
    ? K
    : never]: unknown;
};

type RelationOmitOrSelect<T> =
  | {
      omit?: BoolProjection<T>;
      select?: never;
    }
  | {
      omit?: never;
      select?: BoolProjection<T>;
    };
export type RelationPopulationOptions<T, K extends AnySchema = any> = {
  limit?: Limit["$limit"];
  skip?: Skip["$skip"];
  sort?: Sort["$sort"];
  populate?: SchemaRelationPopulation<K>
} & RelationOmitOrSelect<T>;
type _RelationPopulationOptions<T extends AnyMonarchRelation> =
  T extends MonarchOne<any, any, any>
    ? RelationOmitOrSelect<InferRelationPopulation<T, true>>
    : RelationPopulationOptions<
        ExtractIfArray<InferRelationPopulation<T, true>>
      >;
export type SchemaRelationPopulation<T extends AnySchema> = {
  [K in keyof InferSchemaRelations<T>]?:
    | _RelationPopulationOptions<InferSchemaRelations<T>[K]>
    | true;
};

export type InferRelationInput<T> = T extends MonarchRelation<infer TInput, any>
  ? TInput
  : never;
export type InferRelationOutput<T> = T extends MonarchRelation<
  any,
  infer TOutput
>
  ? TOutput
  : never;

export type InferRelationObjectInput<
  T extends Record<string, AnyMonarchRelation>,
> = {
  [K in keyof T as undefined extends InferRelationInput<T[K]>
    ? never
    : K]: InferRelationInput<T[K]>; // required keys
} & {
  [K in keyof T as undefined extends InferRelationInput<T[K]>
    ? InferRelationOutput<T[K]> extends MonarchPhantom
      ? never
      : K
    : never]?: InferRelationInput<T[K]>; // optional keys
};
export type InferRelationObjectOutput<
  T extends Record<string, AnyMonarchRelation>,
> = {
  [K in keyof T as InferRelationOutput<T[K]> extends MonarchPhantom
    ? never
    : K]: InferRelationOutput<T[K]>;
};

type WithRelationPopulation<
  T,
  O extends RelationPopulationOptions<any> | true | undefined,
  DO extends keyof any,
> = O extends { omit: BoolProjection<any> }
  ? WithProjection<"omit", keyof O["omit"], T>
  : O extends { select: BoolProjection<any> }
    ? WithProjection<"select", keyof O["select"], T>
    : WithProjection<"omit", DO, T>;
export type InferRelationPopulation<
  T,
  O extends RelationPopulationOptions<any> | true | undefined,
> = T extends MonarchOne<any, infer TTarget, any>
  ? WithRelationPopulation<
      InferSchemaOutput<TTarget>,
      O,
      InferSchemaOmit<TTarget>
    > | null
  : T extends MonarchMany<any, infer TTarget, any>
    ? WithRelationPopulation<
        InferSchemaOutput<TTarget>,
        O,
        InferSchemaOmit<TTarget>
      >[]
    : T extends MonarchRef<any, infer TTarget, any, any>
      ? WithRelationPopulation<
          InferSchemaOutput<TTarget>,
          O,
          InferSchemaOmit<TTarget>
        >[]
      : T extends MonarchOptionalRelation<infer TRelation>
        ? InferRelationPopulation<TRelation, O>
        : T extends MonarchNullableRelation<infer TRelation>
          ? InferRelationPopulation<TRelation, O>
          : never;

export type InferRelationObjectPopulation<
  T extends AnySchema,
  P extends SchemaRelationPopulation<any>,
> = {
  [K in keyof P]: InferRelationPopulation<
    Index<InferSchemaRelations<T>, K>,
    P[K]
  >;
};
