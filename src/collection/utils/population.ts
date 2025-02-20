import type { Sort as MongoSort } from "mongodb";
import type { AnyRelation, AnyRelations } from "../../relations/relations";
import type {
  Population,
  PopulationOptions,
} from "../../relations/type-helpers";
import { type AnySchema, Schema } from "../../schema/schema";
import type {} from "../../schema/type-helpers";
import { mapOneOrArray } from "../../utils";
import type { Meta } from "../types/expressions";
import type {
  Limit,
  Lookup,
  PipelineStage,
  Skip,
  Sort,
} from "../types/pipeline-stage";
import type { Projection } from "../types/query-options";
import {
  addExtraInputsToProjection,
  makePopulationProjection,
  makeProjection,
} from "./projection";

/**
 * Adds population stages to an existing MongoDB pipeline for relation handling
 * @param pipeline - The MongoDB pipeline array to modify
 * @param relationField - The field name containing the relation
 * @param relation - The Monarch relation configuration
 * @param projection - The population projection with schema fallback
 * @param options - The population options
 */
export function addPopulationPipeline(
  pipeline: PipelineStage<any>[],
  relation: AnyRelation,
  relations: Record<string, AnyRelations>,
  projection: Projection<any>,
  options: PopulationOptions<any, any, any>,
): { fieldVariable: string } {
  const collectionName = relation.target.name;
  const fieldVariable = `mn_${relation.schemaField}_${relation.targetField}`;

  if (relation.relation === "many") {
    pipeline.push({
      $lookup: {
        from: collectionName,
        localField: relation.schemaField,
        foreignField: relation.targetField,
        as: fieldVariable,
        pipeline: buildPipelineOptions(
          projection,
          options,
          options.populate,
          relation.target,
          relations,
        ),
      },
    });
    pipeline.push({
      $addFields: {
        [fieldVariable]: {
          $cond: {
            if: { $isArray: `$${fieldVariable}` },
            // biome-ignore lint/suspicious/noThenProperty: this is MongoDB syntax
            then: `$${fieldVariable}`,
            else: [],
          },
        },
      },
    });
  }

  if (relation.relation === "ref") {
    const sourceField = relation.schemaField;

    pipeline.push({
      $lookup: {
        from: collectionName,
        let: {
          [fieldVariable]: `$${sourceField}`,
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: [`$$${fieldVariable}`, null] },
                  { $eq: [`$${relation.targetField}`, `$$${fieldVariable}`] },
                ],
              },
            },
          },
          ...buildPipelineOptions(
            projection,
            options,
            options.populate,
            relation.target,
            relations,
          ),
        ],
        as: fieldVariable,
      },
    });
  }

  if (relation.relation === "one") {
    pipeline.push({
      $lookup: {
        from: collectionName,
        let: {
          [fieldVariable]: `$${relation.schemaField}`,
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [`$${relation.targetField}`, `$$${fieldVariable}`],
              },
            },
          },
          ...buildPipelineOptions(
            projection,
            { limit: 1 },
            options.populate,
            relation.target,
            relations,
          ),
        ],
        as: fieldVariable,
      },
    });
    // Unwind the populated field if it's a single relation
    pipeline.push({
      $set: {
        [fieldVariable]: {
          $cond: {
            if: { $gt: [{ $size: `$${fieldVariable}` }, 0] }, // Skip population if value is null
            // biome-ignore lint/suspicious/noThenProperty: this is MongoDB syntax
            then: { $arrayElemAt: [`$${fieldVariable}`, 0] }, // Unwind the first populated result
            else: null,
          },
        },
      },
    });
  }

  return { fieldVariable };
}

function buildPipelineOptions(
  projection: Projection<any>,
  options: PopulationOptions<any, any, any>,
  population: Population<any, any> | undefined,
  schema: AnySchema,
  relations: Record<string, AnyRelations>,
) {
  const pipeline: Lookup<any>["$lookup"]["pipeline"] = [];

  if (Object.keys(projection).length) {
    // @ts-ignore
    pipeline.push({ $project: projection });
  }

  addPipelineMetas(pipeline, {
    limit: options.limit,
    skip: options.skip,
    sort: options.sort,
  });

  if (population) {
    for (const [field, options] of Object.entries(population)) {
      const relation = relations[schema.name][field];
      if (!relation) continue;

      const _options =
        options === true ? {} : (options as PopulationOptions<any, any, any>);
      const projection =
        makePopulationProjection(_options) ??
        makeProjection("omit", relation.target.options.omit ?? {});

      addExtraInputsToProjection(
        projection,
        relation.target.options.virtuals,
        _options.populate,
      );

      addPopulationPipeline(
        pipeline,
        relation,
        relations,
        projection,
        _options,
      );
    }
  }

  return pipeline;
}

export function addPipelineMetas(
  pipeline: PipelineStage<any>[],
  options: {
    sort?: Sort["$sort"];
    skip?: Skip["$skip"];
    limit?: Limit["$limit"];
  },
) {
  if (options.sort) pipeline.push({ $sort: options.sort });
  if (options.skip) pipeline.push({ $skip: options.skip });
  if (options.limit) pipeline.push({ $limit: options.limit });
}

// TODO: handle all MongoSort variants
export function getSortDirection(
  order?: MongoSort,
): Record<string, 1 | -1 | Meta> | undefined {
  // Handle Record<string, SortDirection>
  const sortDirections: Record<string, 1 | -1 | Meta> = {};
  if (Array.isArray(order)) {
    for (const ord of order) {
      sortDirections[ord as string] = 1; // Default to ascending for each string in the array
    }
  } else if (typeof order === "object" && order !== null) {
    for (const key in order) {
      const value = order[key as keyof typeof order];

      if (value === "asc" || value === "ascending" || value === 1) {
        sortDirections[key] = 1;
      } else if (value === "desc" || value === "descending" || value === -1) {
        sortDirections[key] = -1;
      } else {
        sortDirections[key] = value as Meta;
      }
    }
  } else if (typeof order === "string") {
    sortDirections[order] = 1;
  } else if (order === 1 || order === -1) {
    // Handle case where order is explicitly set to 1 or -1
    sortDirections._id = order;
  }
  if (Object.keys(sortDirections).length) {
    return sortDirections;
  }
  return undefined;
}

type Populations = Record<
  string,
  {
    relation: AnyRelation;
    fieldVariable: string;
    projection: Projection<any>;
    extras: string[] | null;
    populations: Populations | undefined;
  }
>;

export function definePopulations(
  population: Population<any, any>,
  relations: AnyRelations,
  dbRelations: Record<string, AnyRelations>,
  pipeline: PipelineStage<any>[],
): Populations {
  const populations: Populations = {};

  for (const [field, options] of Object.entries(population)) {
    if (!options) continue;
    const relation = relations[field];
    const _options =
      options === true ? {} : (options as PopulationOptions<any, any, any>);
    // get population projection or fallback to schema omit projection
    const projection =
      makePopulationProjection(_options) ??
      makeProjection("omit", relation.target.options.omit ?? {});
    const extras = addExtraInputsToProjection(
      projection,
      relation.target.options.virtuals,
      _options.populate,
    );
    const { fieldVariable } = addPopulationPipeline(
      pipeline,
      relation,
      dbRelations,
      projection,
      _options,
    );
    populations[field] = {
      relation,
      fieldVariable,
      projection,
      extras,
      populations:
        typeof options === "object" && options.populate
          ? // TODO: generate entire pipeline in exec
            definePopulations(
              options.populate,
              dbRelations[relation.target.name],
              dbRelations,
              [],
            ) // don't add to pipeline
          : undefined,
    };
  }

  return populations;
}

export function expandPopulations(
  populations: Populations,
  projection: Projection<any>,
  extras: string[] | null,
  schema: AnySchema,
  doc: any,
) {
  const populatedDoc = Schema.fromData(schema, doc, projection, extras);
  for (const [key, population] of Object.entries(populations)) {
    populatedDoc[key] = mapOneOrArray(doc[population.fieldVariable], (doc) => {
      if (population.populations) {
        return expandPopulations(
          population.populations,
          population.projection,
          population.extras,
          population.relation.target,
          doc,
        );
      }
      return Schema.fromData(
        population.relation.target,
        doc,
        population.projection,
        population.extras,
      );
    });
    delete populatedDoc[population.fieldVariable];
  }
  return populatedDoc;
}
