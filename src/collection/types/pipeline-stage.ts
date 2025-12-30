// NOTE: This code is adapted from the Mongoose project (https://github.com/Automattic/mongoose)
// Mongoose is licensed under the MIT License.
// Original source: https://github.com/Automattic/mongoose/blob/master/types/pipelinestage.d.ts

// The following types and interfaces are derived from Mongoose's aggregate pipeline stages
// with modifications to fit our project's needs.

import type {
  AccumulatorOperator,
  AnyExpression,
  AnyObject,
  Expression,
  FilterQuery,
  Meta,
  ObjectExpressionOperator,
  WindowOperator,
} from "./expressions";

export type PipelineStage<T> =
  | AddFields
  | Bucket
  | BucketAuto
  | CollStats
  | Count
  | Densify
  | Facet
  | Fill
  | GeoNear
  | GraphLookup
  | Group
  | IndexStats
  | Limit
  | ListSessions
  | Lookup<T>
  | Match<T>
  | Merge<T>
  | Out
  | PlanCacheStats
  | Project
  | Redact
  | ReplaceRoot
  | ReplaceWith
  | Sample
  | Search
  | SearchMeta
  | Set
  | SetWindowFields
  | Skip
  | Sort
  | SortByCount
  | UnionWith<T>
  | Unset
  | Unwind
  | VectorSearch;

export interface AddFields {
  /** [`$addFields` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/) */
  $addFields: Record<string, AnyExpression | Record<string, AnyExpression>>;
}

export interface Bucket {
  /** [`$bucket` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/) */
  $bucket: {
    groupBy: Expression;
    boundaries: any[];
    default?: any;
    output?: Record<string, AccumulatorOperator>;
  };
}

export interface BucketAuto {
  /** [`$bucketAuto` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucketAuto/) */
  $bucketAuto: {
    groupBy: Expression | Record<string, Expression>;
    buckets: number;
    output?: Record<string, AccumulatorOperator>;
    granularity?:
      | "R5"
      | "R10"
      | "R20"
      | "R40"
      | "R80"
      | "1-2-5"
      | "E6"
      | "E12"
      | "E24"
      | "E48"
      | "E96"
      | "E192"
      | "POWERSOF2";
  };
}

export interface CollStats {
  /** [`$collStats` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/) */
  $collStats: {
    latencyStats?: { histograms?: boolean };
    storageStats?: { scale?: number };
    count?: Record<string | number | symbol, never>;
    queryExecStats?: Record<string | number | symbol, never>;
  };
}

export interface Count {
  /** [`$count` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/) */
  $count: string;
}

export interface Densify {
  /** [`$densify` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/) */
  $densify: {
    field: string;
    partitionByFields?: string[];
    range: {
      step: number;
      unit?: "millisecond" | "second" | "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year";
      bounds: number[] | globalThis.Date[] | "full" | "partition";
    };
  };
}

export interface Fill {
  /** [`$fill` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/) */
  $fill: {
    partitionBy?: Expression;
    partitionByFields?: string[];
    sortBy?: Record<string, 1 | -1>;
    output: Record<string, { value: Expression } | { method: "linear" | "locf" }>;
  };
}

export interface Facet {
  /** [`$facet` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/) */
  $facet: Record<string, FacetPipelineStage[]>;
}

export type FacetPipelineStage<T = any> = Exclude<
  PipelineStage<T>,
  CollStats | Facet | GeoNear | IndexStats | Out | Merge<T> | PlanCacheStats
>;

export interface GeoNear {
  /** [`$geoNear` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/) */
  $geoNear: {
    near: { type: "Point"; coordinates: [number, number] } | [number, number];
    distanceField: string;
    distanceMultiplier?: number;
    includeLocs?: string;
    key?: string;
    maxDistance?: number;
    minDistance?: number;
    query?: AnyObject;
    spherical?: boolean;
    /**
     * Deprecated. Use only with MondoDB below 4.2 (removed in 4.2)
     * @deprecated
     */
    num?: number;
  };
}

export interface GraphLookup {
  /** [`$graphLookup` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/) */
  $graphLookup: {
    from: string;
    startWith: AnyExpression;
    connectFromField: string;
    connectToField: string;
    as: string;
    maxDepth?: number;
    depthField?: string;
    restrictSearchWithMatch?: AnyObject;
  };
}

export interface Group {
  /** [`$group` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/group) */
  $group: { _id: any } | { [key: string]: AccumulatorOperator };
}

export interface IndexStats {
  /** [`$indexStats` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/) */
  $indexStats: Record<string | number | symbol, never>;
}

export interface Limit {
  /** [`$limit` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/limit/) */
  $limit: number;
}

export interface ListSessions {
  /** [`$listSessions` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSessions/) */
  $listSessions: { users?: { user: string; db: string }[] } | { allUsers?: true };
}

export interface Lookup<T> {
  /** [`$lookup` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/) */
  $lookup: {
    from: string;
    as: string;
    localField?: keyof T;
    foreignField?: string;
    let?: Record<string, Expression>;
    pipeline?: Exclude<PipelineStage<T>, Merge<T> | Out>[];
  };
}

export interface Match<T> {
  /** [`$match` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/) */
  $match: FilterQuery<T>;
}

export interface Merge<T> {
  /** [`$merge` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/) */
  $merge: {
    into: string | { db: string; coll: string };
    on?: string | string[];
    let?: Record<string, Expression>;
    whenMatched?:
      | "replace"
      | "keepExisting"
      | "merge"
      | "fail"
      | Extract<PipelineStage<T>, AddFields | Set | Project | Unset | ReplaceRoot | ReplaceWith>[];
    whenNotMatched?: "insert" | "discard" | "fail";
  };
}

export interface Out {
  /** [`$out` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/) */
  $out: string | { db: string; coll: string };
}

export interface PlanCacheStats {
  /** [`$planCacheStats` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/planCacheStats/) */
  $planCacheStats: Record<string | number | symbol, never>;
}

export interface Project {
  /** [`$project` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/) */
  $project: {
    [field: string]: AnyExpression | Expression | Project;
  };
}

export interface Redact {
  /** [`$redact` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/redact/) */
  $redact: Expression;
}

export interface ReplaceRoot {
  /** [`$replaceRoot` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceRoot/) */
  $replaceRoot: { newRoot: AnyExpression };
}

export interface ReplaceWith {
  /** [`$replaceWith` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceWith/) */
  $replaceWith: ObjectExpressionOperator | { [field: string]: Expression } | `$${string}`;
}

export interface Sample {
  /** [`$sample` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/) */
  $sample: { size: number };
}

export interface Search {
  /** [`$search` reference](https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/) */
  $search: {
    index?: string;
    highlight?: {
      /** [`highlightPath` reference](https://docs.atlas.mongodb.com/atlas-search/path-construction/#multiple-field-search) */
      path: string | string[] | { value: string; multi: string };
      maxCharsToExamine?: number;
      maxNumPassages?: number;
    };
    [operator: string]: any;
  };
}

export interface SearchMeta {
  /** [`$searchMeta` reference](https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/#mongodb-pipeline-pipe.-searchMeta) */
  $searchMeta: {
    index?: string;
    highlight?: {
      /** [`highlightPath` reference](https://docs.atlas.mongodb.com/atlas-search/path-construction/#multiple-field-search) */
      path: string | string[] | { value: string; multi: string };
      maxCharsToExamine?: number;
      maxNumPassages?: number;
    };
    [operator: string]: any;
  };
}

export interface Set {
  /** [`$set` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/) */
  $set: Record<string, AnyExpression | any>;
}

export interface SetWindowFields {
  /** [`$setWindowFields` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/) */
  $setWindowFields: {
    partitionBy?: any;
    sortBy?: Record<string, 1 | -1>;
    output: Record<
      string,
      WindowOperator & {
        window?: {
          documents?: [string | number, string | number];
          range?: [string | number, string | number];
          unit?: "year" | "quarter" | "month" | "week" | "day" | "hour" | "minute" | "second" | "millisecond";
        };
      }
    >;
  };
}

export interface Skip {
  /** [`$skip` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/skip/) */
  $skip: number;
}

export interface Sort {
  /** [`$sort` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/) */
  $sort: Record<string, 1 | -1 | Meta>;
}

export interface SortByCount {
  /** [`$sortByCount` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortByCount/) */
  $sortByCount: Expression;
}

export interface UnionWith<T> {
  /** [`$unionWith` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/) */
  $unionWith:
    | string
    | {
        coll: string;
        pipeline?: Exclude<PipelineStage<T>, Out | Merge<T>>[];
      };
}

export interface Unset {
  /** [`$unset` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/unset/) */
  $unset: string | string[];
}

export interface Unwind {
  /** [`$unwind` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/) */
  $unwind:
    | string
    | {
        path: string;
        includeArrayIndex?: string;
        preserveNullAndEmptyArrays?: boolean;
      };
}
export interface VectorSearch {
  /** [`$vectorSearch` reference](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/) */
  $vectorSearch: {
    index: string;
    path: string;
    queryVector: number[];
    numCandidates: number;
    limit: number;
    filter?: Expression;
  };
}
