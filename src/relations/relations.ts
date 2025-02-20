import type { AnySchema } from "../schema/schema";
import type { SchemaRelatableField } from "./type-helpers";

export type AnyRelation = Relation<"one" | "many" | "ref", any, any, any, any>;

export type Relation<
  TRelation extends "one" | "many" | "ref",
  TSchema extends AnySchema,
  TSchemaField extends SchemaRelatableField<TSchema, TRelation>,
  TTarget extends AnySchema,
  TTargetField extends SchemaRelatableField<TTarget, undefined>,
> = {
  relation: TRelation;
  schema: TSchema;
  schemaField: TSchemaField;
  target: TTarget;
  targetField: TTargetField;
};

export type AnyRelations = Record<string, AnyRelation>;

export class Relations<TName extends string, TRelations extends AnyRelations> {
  constructor(
    public name: TName,
    public relations: TRelations,
  ) {}
}

export function createRelations<
  TSchema extends AnySchema,
  TRelations extends Record<string, AnyRelation>,
>(
  schema: TSchema,
  relations: (relation: CreateRelation<TSchema>) => TRelations,
) {
  return new Relations<TSchema["name"], TRelations>(
    schema.name,
    relations({
      one: (target, options) => ({
        relation: "one",
        schema,
        schemaField: options.field,
        target,
        targetField: options.references,
      }),
      many: (target, options) => ({
        relation: "many",
        schema,
        schemaField: options.field,
        target,
        targetField: options.references,
      }),
      ref: (target, options) => ({
        relation: "ref",
        schema,
        schemaField: options.field,
        target,
        targetField: options.references,
      }),
    }),
  );
}

type CreateRelation<TSchema extends AnySchema> = {
  one: One<TSchema>;
  many: Many<TSchema>;
  ref: Ref<TSchema>;
};
type One<TSchema extends AnySchema> = RelationFactory<"one", TSchema>;
type Many<TSchema extends AnySchema> = RelationFactory<"many", TSchema>;
type Ref<TSchema extends AnySchema> = RelationFactory<"ref", TSchema>;

type RelationFactory<
  TRelation extends "one" | "many" | "ref",
  TSchema extends AnySchema,
> = <
  TTarget extends AnySchema,
  TSchemaField extends SchemaRelatableField<TSchema, TRelation>,
  TTargetField extends SchemaRelatableField<TTarget, undefined>,
>(
  target: TTarget,
  options: {
    /**
     * The schema field
     */
    field: TSchemaField;
    /**
     * The target schema field
     */
    references: TTargetField;
  },
) => Relation<TRelation, TSchema, TSchemaField, TTarget, TTargetField>;
