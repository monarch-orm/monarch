import type { Sort as MongoSort } from "mongodb";
import { MonarchRelation } from "../../schema/relations/base";
import { MonarchMany } from "../../schema/relations/many";
import { MonarchOne } from "../../schema/relations/one";
import { MonarchRef } from "../../schema/relations/ref";
import type {
  RelationPopulationOptions,
  RelationType,
  SchemaRelationPopulation,
} from "../../schema/relations/type-helpers";
import { Schema } from "../../schema/schema";
import type { InferSchemaRelations } from "../../schema/type-helpers";
import type { Meta } from "../types/expressions";
import type {
  Limit,
  Lookup,
  PipelineStage,
  Skip,
  Sort,
} from "../types/pipeline-stage";
import type { Projection } from "../types/query-options";
import { makePopulationProjection, makeProjection } from "./projection";

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
  relationField: string,
  relation: RelationType,
  projection: Projection<any>,
  options: RelationPopulationOptions<any>,
): { fieldVariable: string } {
  const collectionName = relation._target.name;
  const foreignField = relation._field;
  const fieldVariable = generateFieldVariable(relationField, foreignField);

  const nestedPopulation = options.populate ?? {};
  if (relation instanceof MonarchMany) {
    pipeline.push({
      $lookup: {
        from: collectionName,
        localField: relationField,
        foreignField: foreignField,
        as: fieldVariable,
        // pipeline: buildPipelineOptions(projection, options),
        pipeline: buildPipelineOptions(projection, options, nestedPopulation, Schema.relations(relation._target)),
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

  if (relation instanceof MonarchRef) {
    const sourceField = relation._references;

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
                  { $eq: [`$${foreignField}`, `$$${fieldVariable}`] },
                ],
              },
            },
          },
          ...buildPipelineOptions(projection, options, nestedPopulation, Schema.relations(relation._target)),
        ],
        as: fieldVariable,
      },
    });
  }

  if (relation instanceof MonarchOne) {
    pipeline.push({
      $lookup: {
        from: collectionName,
        let: {
          [fieldVariable]: `$${relationField}`,
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [`$${foreignField}`, `$$${fieldVariable}`],
              },
            },
          },
          ...buildPipelineOptions(projection, { limit: 1 }, nestedPopulation, Schema.relations(relation._target)),
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

function generateFieldVariable(
  relationField: string,
  foreignField: string,
): string {
  return `mn_${relationField}_${foreignField}`;
}

function buildPipelineOptions(
  projection: Projection<any>,
  options: RelationPopulationOptions<any>,
  nestedPopulation: SchemaRelationPopulation<any> = {},
  nestedRelations: InferSchemaRelations<any> = {}
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

  for (const [nestedField, nestedOptions] of Object.entries(nestedPopulation)) {
    const nestedRelation = MonarchRelation.getRelation(nestedRelations[nestedField]) as RelationType;
    if (!nestedRelation) continue;

    const _options =
    nestedOptions === true ? {} : (options as RelationPopulationOptions<any>);

    const nestedProjection =
      makePopulationProjection(_options) ??
      makeProjection("omit", nestedRelation._target.options.omit ?? {});

    addPopulationPipeline(
      pipeline,
      nestedField,
      nestedRelation,
      nestedProjection,
      nestedOptions as RelationPopulationOptions<any>,
    );
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
