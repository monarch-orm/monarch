import type { ObjectId } from "mongodb";
import { type AnySchema } from "../schema/schema";
import type { InferSchemaData } from "../schema/type-helpers";
import type { ExtractIfArray, Index, Merge, MergeN1, OrArray } from "../utils/type-helpers";
import type { PopulationOptions, RelationPopulationOptions } from "./type-helpers";

export type AnyRelation = Relation<any, any, any, any>;

/**
 * Defines a relationship between two schemas.
 *
 */
export class Relation<
  TRelation extends "one" | "many",
  TFields extends {
    from: AnyRelationField;
    to: AnyRelationField;
  },
  TOptions extends PopulationOptions<any, any, any> | undefined,
  TRelations extends Record<string, Record<string, AnyRelation>>,
> {
  constructor(
    public relation: TRelation,
    public schemaField: TFields["from"],
    public targetField: TFields["to"],
    protected _options: TOptions,
  ) {}

  public options<TOptions extends RelationPopulationOptions<TRelations, TRelation, TFields["to"]>>(options: TOptions) {
    return new Relation<TRelation, TFields, TOptions, TRelations>(
      this.relation,
      this.schemaField,
      this.targetField,
      options,
    );
  }

  public static options<T extends AnyRelation>(relation: T): PopulationOptions<any, any, any> | undefined {
    return relation._options;
  }
}

export type AnyRelationField = RelationField<any, any, any>;

export class RelationField<TField extends keyof any, TType extends any, TSchema extends AnySchema> {
  constructor(
    public schema: TSchema,
    public field: TField,
    public type?: TType,
  ) {}
}

export type SchemasRelations<TSchemas extends Record<string, AnySchema>> = {
  [K in keyof TSchemas]?: Record<
    string,
    Relation<any, { from: RelationField<any, any, TSchemas[K]>; to: AnyRelationField }, any, any>
  >;
};

export function mergeRelations<
  TSchemas extends Record<string, AnySchema>,
  TRelations extends Record<string, Record<string, AnyRelation>>,
  T extends SchemasRelations<TSchemas>,
>(schemas: TSchemas, relations: TRelations, fn: RelationsFn<TSchemas, TRelations, T>) {
  const input = new Proxy({} as RelationsBuilder<TSchemas, TRelations>, {
    get: (_target, relationKey: string) => {
      if (relationKey === "one" || relationKey === "many") {
        // relation fns
        return new Proxy({} as Record<string, RelationFn<any, any, any>>, {
          get: (_target, _targetSchema: string) => {
            return (fields: Parameters<RelationFn<any, any, any>>[0]): AnyRelation => {
              return new Relation(relationKey, fields.from, fields.to, undefined);
            };
          },
        });
      }
      // schema fields
      return new Proxy({} as Record<string, AnyRelationField>, {
        get: (_target, schemaField: string) => {
          return new RelationField(schemas[relationKey]!, schemaField);
        },
      });
    },
  });
  const output = fn(input);

  const mergedRelations: Record<string, Record<string, AnyRelation> | undefined> = { ...relations };
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
  TRelations extends Record<string, Record<string, AnyRelation>>,
  TNewRelations extends SchemasRelations<TSchemas>,
> = (r: RelationsBuilder<TSchemas, TRelations>) => keyof TNewRelations extends keyof TSchemas ? TNewRelations : never;

type RelationsBuilder<
  TSchemas extends Record<string, AnySchema>,
  TRelations extends Record<string, Record<string, AnyRelation>>,
> = Merge<
  {
    /** Defines a one-to-one relationship. */
    one: SchemaOne<TSchemas, TRelations>;
    /** Defines a one-to-many relationship. */
    many: SchemaMany<TSchemas, TRelations>;
  },
  {
    [K in keyof TSchemas]: SchemaFields<TSchemas[K]>;
  }
>;

type SchemaFields<T extends AnySchema> = {
  [K in keyof InferSchemaData<T> as Exclude<InferSchemaData<T>[K], null | undefined> extends
    | string
    | number
    | ObjectId
    | Array<string | number | ObjectId>
    ? K
    : never]-?: RelationField<K, Exclude<InferSchemaData<T>[K], null | undefined>, T>;
};

type SchemaOne<
  TSchemas extends Record<string, AnySchema>,
  TRelations extends Record<string, Record<string, AnyRelation>>,
> = {
  [TargetK in keyof TSchemas]: One<TSchemas[TargetK], TRelations>;
};
type SchemaMany<
  TSchemas extends Record<string, AnySchema>,
  TRelations extends Record<string, Record<string, AnyRelation>>,
> = {
  [TargetK in keyof TSchemas]: Many<TSchemas[TargetK], TRelations>;
};

type One<TTarget extends AnySchema, TRelations extends Record<string, Record<string, AnyRelation>>> = RelationFn<
  "one",
  TTarget,
  TRelations
>;
type Many<TTarget extends AnySchema, TRelations extends Record<string, Record<string, AnyRelation>>> = RelationFn<
  "many",
  TTarget,
  TRelations
>;

type RelationFn<
  TRelation extends "one" | "many",
  TTarget extends AnySchema,
  TRelations extends Record<string, Record<string, AnyRelation>>,
> = <
  TSchemaField extends RelationField<
    any,
    // one does not accept array fields
    TRelation extends "many" ? OrArray<string | number | ObjectId> : string | number | ObjectId,
    AnySchema
  >,
  TTargetField extends RelationField<
    any,
    // target field type must match schema field type
    // one does not accept array fields
    TRelation extends "many"
      ? OrArray<
          ExtractIfArray<
            Exclude<Index<InferSchemaData<TSchemaField["schema"]>, TSchemaField["field"]>, null | undefined>
          >
        >
      : ExtractIfArray<
          Exclude<Index<InferSchemaData<TSchemaField["schema"]>, TSchemaField["field"]>, null | undefined>
        >,
    TTarget
  >,
>(fields: {
  /** Local field defined in source schema */
  from: TSchemaField;
  /** Foreign field defined in target schema */
  to: TTargetField;
}) => Relation<TRelation, { from: TSchemaField; to: TTargetField }, undefined, TRelations>;
