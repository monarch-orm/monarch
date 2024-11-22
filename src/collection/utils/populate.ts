import type { Sort as MongoSort } from "mongodb";
import {
  type AnyMonarchRelation,
  MonarchRelation,
} from "../../schema/relations/base";
import { MonarchMany } from "../../schema/relations/many";
import { MonarchOne } from "../../schema/relations/one";
import { MonarchRef } from "../../schema/relations/ref";
import type { Limit, PipelineStage, Skip, Sort } from "../types/pipeline-stage";

/**
 * Adds population stages to an existing MongoDB pipeline for relation handling
 * @param pipeline - The MongoDB pipeline array to modify
 * @param relationField - The field name containing the relation
 * @param relation - The Monarch relation configuration
 */
export function addPopulatePipeline(
  pipeline: PipelineStage<any>[],
  relationField: string,
  relation: AnyMonarchRelation,
) {
  const type = MonarchRelation.getRelation(relation);

  if (type instanceof MonarchMany) {
    const collectionName = type._target.name;
    const foreignField = type._field;
    pipeline.push({
      $lookup: {
        from: collectionName,
        localField: relationField,
        foreignField: foreignField,
        as: relationField,
      },
    });
    pipeline.push({
      $addFields: {
        [relationField]: {
          $cond: {
            if: { $isArray: `$${relationField}` },
            // biome-ignore lint/suspicious/noThenProperty: this is MongoDB syntax
            then: `$${relationField}`,
            else: [],
          },
        },
      },
    });
  }

  if (type instanceof MonarchRef) {
    const collectionName = type._target.name;
    const foreignField = type._field;
    const sourceField = type._references;
    const fieldVariable = `monarch_${relationField}_${foreignField}_var`;
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
        ],
        as: relationField,
      },
    });
  }

  if (type instanceof MonarchOne) {
    const collectionName = type._target.name;
    const foreignField = type._field;
    const fieldVariable = `monarch_${relationField}_${foreignField}_var`;
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
          {
            $limit: 1,
          },
        ],
        as: relationField,
      },
    });
    // Unwind the populated field if it's a single relation
    pipeline.push({
      $set: {
        [relationField]: {
          $cond: {
            if: { $gt: [{ $size: `$${relationField}` }, 0] }, // Skip population if value is null
            // biome-ignore lint/suspicious/noThenProperty: this is MongoDB syntax
            then: { $arrayElemAt: [`$${relationField}`, 0] }, // Unwind the first populated result
            else: {
              $cond: {
                if: { $eq: [`$${relationField}`, null] },
                // biome-ignore lint/suspicious/noThenProperty: this is MongoDB syntax
                then: null,
                else: { $literal: { error: "Invalid reference" } },
              },
            },
          },
        },
      },
    });
  }
}

export const addPopulationMetas = (
  pipeline: PipelineStage<any>[],
  options: {
    sort?: Sort["$sort"];
    skip?: Skip["$skip"];
    limit?: Limit["$limit"];
  },
) => {
  if (options.sort) pipeline.push({ $sort: options.sort });
  if (options.skip) pipeline.push({ $skip: options.skip });
  if (options.limit) pipeline.push({ $limit: options.limit });
};

type Meta = { $meta: any };

export const getSortDirection = (
  order?: MongoSort,
): Record<string, 1 | -1 | Meta> => {
  // Handle Record<string, SortDirection>
  if (typeof order === "object" && order !== null) {
    const sortDirections: Record<string, 1 | -1 | Meta> = {};

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
    return sortDirections;
  }

  return {};
};
