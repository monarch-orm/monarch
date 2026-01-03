import type { AnySchema } from "../schema/schema";
import type { SchemaRelatableField } from "./type-helpers";

export type AnyRelation = Relation<"one" | "many" | "ref", any, any, any, any>;

/**
 * Defines a relationship between two schemas.
 *
 */
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

/**
 * Container for schema relationships.
 *
 */
export class Relations<TName extends string, TRelations extends AnyRelations> {
  /**
   * Creates a Relations instance.
   *
   * @param name - Schema name
   * @param relations - Relation definitions
   */
  constructor(
    public name: TName,
    public relations: TRelations,
  ) {}
}

/**
 * Creates relationship definitions for a schema.
 *
 * Provides three relation types:
 * - `one`: One-to-one relationship
 * - `many`: One-to-many relationship
 * - `ref`: Reference relationship
 *
 * @param schema - Source schema
 * @param relations - Function that defines relations using relation builders
 * @returns Relations instance for the schema
 */
export function createRelations<TSchema extends AnySchema, TRelations extends Record<string, AnyRelation>>(
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

/**
 * Relation builder interface with one, many, and ref methods.
 *
 */
type CreateRelation<TSchema extends AnySchema> = {
  /**
   * Creates a one-to-one relationship.
   *
   * @param target - Target schema
   * @param options - Relation options
   * @param options.field - Field in source schema containing the reference
   * @param options.references - Field in target schema being referenced
   * @returns One-to-one relation definition
   */
  one: One<TSchema>;
  /**
   * Creates a one-to-many relationship.
   *
   * @param target - Target schema
   * @param options - Relation options
   * @param options.field - Field in source schema containing the reference
   * @param options.references - Field in target schema being referenced
   * @returns One-to-many relation definition
   */
  many: Many<TSchema>;
  /**
   * Creates a reference relationship.
   *
   * @param target - Target schema
   * @param options - Relation options
   * @param options.field - Field in source schema containing the reference
   * @param options.references - Field in target schema being referenced
   * @returns Reference relation definition
   */
  ref: Ref<TSchema>;
};
type One<TSchema extends AnySchema> = RelationFactory<"one", TSchema>;
type Many<TSchema extends AnySchema> = RelationFactory<"many", TSchema>;
type Ref<TSchema extends AnySchema> = RelationFactory<"ref", TSchema>;

type RelationFactory<TRelation extends "one" | "many" | "ref", TSchema extends AnySchema> = <
  TTarget extends AnySchema,
  TSchemaField extends SchemaRelatableField<TSchema, TRelation>,
  TTargetField extends SchemaRelatableField<TTarget, undefined>,
>(
  target: TTarget,
  options: {
    /** Field in source schema containing the reference */
    field: TSchemaField;
    /** Field in target schema being referenced */
    references: TTargetField;
  },
) => Relation<TRelation, TSchema, TSchemaField, TTarget, TTargetField>;
