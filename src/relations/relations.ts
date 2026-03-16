import { type AnySchema } from "../schema/schema";
import type { MergeN1 } from "../utils/type-helpers";
import type { SchemaRelatableField } from "./type-helpers";

export type AnyRelation = Relation<any, { from: RelationField<any, AnySchema>; to: RelationField<any, AnySchema> }>;

/**
 * Defines a relationship between two schemas.
 *
 */
export type Relation<
  TRelation extends "one" | "many" | "refs",
  TOptions extends { from: RelationField<any, any>; to: RelationField<any, any> },
> = {
  relation: TRelation;
  schema: TOptions["from"];
  target: TOptions["to"];
};

export class RelationField<TField extends keyof any, TSchema extends AnySchema> {
  constructor(
    public schema: TSchema,
    public field: TField,
  ) {}
}

export type SchemasRelations<TSchemas extends Record<string, AnySchema>> = {
  [K in keyof TSchemas]?: Record<string, Relation<any, any>>;
};

export type AnyRelations = Record<string, AnyRelation>;

export function mergeRelations<
  TSchemas extends Record<string, AnySchema>,
  TRelations extends Record<string, Record<string, AnyRelation> | undefined>,
  T extends SchemasRelations<TSchemas>,
>(schemas: TSchemas, relations: TRelations, fn: RelationsFn<TSchemas, T>) {
  const input = new Proxy({} as SchemaRelations<TSchemas>, {
    get: (_target, schemaKey: string) => {
      return new Proxy({} as SchemaRelations<TSchemas>[string], {
        get: (_target, relation: "$one" | "$many" | "$refs") => {
          return new Proxy({} as Record<string, RelationFn<any, any, any>>, {
            get: (_target, targetKey: string) => {
              return (options: Parameters<RelationFn<any, any, any>>[0]): AnyRelation => ({
                relation: relation.slice(1),
                schema: new RelationField(schemas[schemaKey]!, options.from),
                target: new RelationField(schemas[targetKey]!, options.to),
              });
            },
          });
        },
      });
    },
  });
  const output = fn(input);

  const mergedRelations: Record<string, any> = { ...relations };
  for (const [key, relations] of Object.entries(output)) {
    if (key in mergedRelations) {
      mergedRelations[key] = { ...mergedRelations[key], ...relations };
    } else {
      mergedRelations[key] = relations;
    }
  }

  return mergedRelations as MergeN1<TRelations, T>;
}

export type RelationsFn<
  TSchemas extends Record<string, AnySchema>,
  TRelations extends Record<string, Record<string, AnyRelation> | undefined>,
> = (s: SchemaRelations<TSchemas>) => keyof TRelations extends keyof TSchemas ? TRelations : never;

type SchemaRelations<TSchemas extends Record<string, AnySchema>> = {
  [SchemaKey in keyof TSchemas]: {
    /** Defines a one-to-one relationship. */
    $one: SchemaOne<SchemaKey, TSchemas>;
    /** Defines a one-to-many relationship. */
    $many: SchemaMany<SchemaKey, TSchemas>;
    /** Defines an embedded relationship. */
    $refs: SchemaRefs<SchemaKey, TSchemas>;
  };
};

type SchemaOne<TSchemaKey extends keyof TSchemas, TSchemas extends Record<string, AnySchema>> = {
  [TargetK in keyof TSchemas]: One<TSchemas[TSchemaKey], TSchemas[TargetK]>;
};
type SchemaMany<TSchemaKey extends keyof TSchemas, TSchemas extends Record<string, AnySchema>> = {
  [TargetK in keyof TSchemas]: Many<TSchemas[TSchemaKey], TSchemas[TargetK]>;
};
type SchemaRefs<TSchemaKey extends keyof TSchemas, TSchemas extends Record<string, AnySchema>> = {
  [TargetK in keyof TSchemas]: Refs<TSchemas[TSchemaKey], TSchemas[TargetK]>;
};

type One<TSchema extends AnySchema, TTarget extends AnySchema> = RelationFn<"one", TSchema, TTarget>;
type Many<TSchema extends AnySchema, TTarget extends AnySchema> = RelationFn<"many", TSchema, TTarget>;
type Refs<TSchema extends AnySchema, TTarget extends AnySchema> = RelationFn<"refs", TSchema, TTarget>;

type RelationFn<TRelation extends "one" | "many" | "refs", TSchema extends AnySchema, TTarget extends AnySchema> = <
  const TSchemaField extends SchemaRelatableField<TRelation, TSchema>,
  const TTargetField extends SchemaRelatableField<undefined, TTarget>,
>(options: {
  /** Local field defined in source schema */
  from: TSchemaField;
  /** Foreign field defined in target schema */
  to: TTargetField;
}) => Relation<TRelation, { from: RelationField<TSchemaField, TSchema>; to: RelationField<TTargetField, TTarget> }>;
