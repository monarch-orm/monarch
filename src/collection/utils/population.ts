import type { Sort as MongoSort } from "mongodb";
import { MonarchError } from "../../errors";
import type { AnyRelation, AnyRelations } from "../../relations/relations";
import type {
  Population,
  PopulationOptions,
} from "../../relations/type-helpers";
import { type AnySchema, Schema } from "../../schema/schema";
import { mapOneOrArray } from "../../utils/misc";
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

type Populations = Record<
  string,
  {
    relation: AnyRelation;
    fieldVariable: string;
    projection: Projection<any>;
    extras: string[] | null;
    pipeline: PipelineStage<any>[];
    populations: Populations | undefined;
  }
>;

export function addPopulations(
  pipeline: PipelineStage<any>[],
  opts: {
    relations: Record<string, AnyRelations>;
    population: Population<any, any>;
    schema: AnySchema;
  },
): Populations {
  const populations: Populations = {};
  for (const [field, options] of Object.entries(opts.population)) {
    if (!options) continue;

    // Validate that relations exist for the schema
    if (!opts.relations[opts.schema.name]) {
      throw new MonarchError(`No relations found for schema '${opts.schema.name}'`);
    }

    const relation = opts.relations[opts.schema.name][field];
    // Validate relation exists
    if (!relation) {
      throw new MonarchError(
        `No relation found for field '${field}' in schema '${opts.schema.name}'.`
      );
    }

    // Validate relation target exists
    if (!relation.target) {
      throw new MonarchError(`Target schema not found for relation '${field}' in schema '${opts.schema.name}'
        This might happen if relations were declared before the target schema was initialized.
        Ensure all schemas are initialized before defining their relations.`);
    }

    const _options =
      options === true ? {} : (options as PopulationOptions<any, any, any>);

    // get population projection or fallback to schema omit projection
    const projection =
      makePopulationProjection(_options) ??
      makeProjection("omit", relation.target.options?.omit ?? {});

    // ensure required fields are in projection
    const extras = addExtraInputsToProjection(
      projection,
      relation.target.options?.virtuals,
      _options.populate,
    );

    // create pipeline for this poulation
    const populationPipeline: Lookup<any>["$lookup"]["pipeline"] = [];
    if (Object.keys(projection).length) {
      // @ts-ignore
      populationPipeline.push({ $project: projection });
    }

    // add nested populations to population pipeline
    const populationPopulations = _options.populate
      ? addPopulations(populationPipeline, {
          population: _options.populate,
          relations: opts.relations,
          schema: relation.target,
        })
      : undefined;

    addPipelineMetas(populationPipeline, {
      limit: relation.relation === "one" ? 1 : _options.limit,
      skip: _options.skip,
      sort: _options.sort,
    });

    // add population to pipeline
    const { fieldVariable } = addPopulationPipeline(pipeline, {
      relation,
      populationPipeline,
    });

    populations[field] = {
      relation,
      fieldVariable,
      projection,
      extras,
      pipeline: populationPipeline,
      populations: populationPopulations,
    };
  }
  return populations;
}

export function expandPopulations(opts: {
  populations: Populations;
  projection: Projection<any>;
  extras: string[] | null;
  schema: AnySchema;
  doc: any;
}) {
  const populatedDoc = Schema.fromData(
    opts.schema,
    opts.doc,
    opts.projection,
    opts.extras,
  );
  for (const [key, population] of Object.entries(opts.populations)) {
    populatedDoc[key] = mapOneOrArray(
      opts.doc[population.fieldVariable],
      (doc) => {
        if (population.populations) {
          return expandPopulations({
            populations: population.populations,
            projection: population.projection,
            extras: population.extras,
            schema: population.relation.target,
            doc,
          });
        }
        return Schema.fromData(
          population.relation.target,
          doc,
          population.projection,
          population.extras,
        );
      },
    );
    delete populatedDoc[population.fieldVariable];
  }
  return populatedDoc;
}

/**
 * Adds population stages to an existing MongoDB pipeline for relation handling
 */
function addPopulationPipeline(
  pipeline: PipelineStage<any>[],
  opts: {
    relation: AnyRelation;
    populationPipeline: Lookup<any>["$lookup"]["pipeline"];
  },
): { fieldVariable: string } {
  const { relation } = opts;
  const collectionName = relation.target.name;
  const fieldVariable = `mn_${relation.schemaField}_${relation.targetField}`;

  if (relation.relation === "many") {
    pipeline.push({
      $lookup: {
        from: collectionName,
        localField: relation.schemaField,
        foreignField: relation.targetField,
        as: fieldVariable,
        pipeline: opts.populationPipeline,
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
                $and: [
                  { $ne: [`$$${fieldVariable}`, null] },
                  { $eq: [`$${relation.targetField}`, `$$${fieldVariable}`] },
                ],
              },
            },
          },
          ...(opts.populationPipeline ?? []),
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
          ...(opts.populationPipeline ?? []),
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

type MetaOptions = {
  sort?: Sort["$sort"];
  skip?: Skip["$skip"];
  limit?: Limit["$limit"];
};

export function addPipelineMetas(
  pipeline: PipelineStage<any>[],
  options: MetaOptions,
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
