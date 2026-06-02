export interface AnyObject {
  [key: string]: any;
}

export type Meta = { $meta: "textScore" | "indexKey" };

export type Expression =
  | string
  | number
  | boolean
  | Date
  | null
  | Expression[]
  | { [operator: string]: Expression | Expression[] };

export type AnyExpression = Expression;

export type AccumulatorOperator = {
  $accumulator?: any;
  $addToSet?: Expression;
  $avg?: Expression;
  $bottom?: any;
  $bottomN?: any;
  $count?: any;
  $first?: Expression;
  $firstN?: any;
  $last?: Expression;
  $lastN?: any;
  $max?: Expression;
  $maxN?: any;
  $mergeObjects?: Expression;
  $min?: Expression;
  $minN?: any;
  $push?: Expression;
  $stdDevPop?: Expression;
  $stdDevSamp?: Expression;
  $sum?: Expression;
  $top?: any;
  $topN?: any;
};

export type WindowOperator = {
  $addToSet?: Expression;
  $avg?: Expression;
  $bottom?: any;
  $bottomN?: any;
  $count?: any;
  $covariancePop?: any;
  $covarianceSamp?: any;
  $denseRank?: any;
  $derivative?: any;
  $documentNumber?: any;
  $expMovingAvg?: any;
  $first?: Expression;
  $firstN?: any;
  $integral?: any;
  $last?: Expression;
  $lastN?: any;
  $linearFill?: any;
  $locf?: any;
  $max?: Expression;
  $maxN?: any;
  $min?: Expression;
  $minN?: any;
  $push?: Expression;
  $rank?: any;
  $shift?: any;
  $stdDevPop?: Expression;
  $stdDevSamp?: Expression;
  $sum?: Expression;
  $top?: any;
  $topN?: any;
};

export type ObjectExpressionOperator = {
  [operator: string]: Expression | Expression[];
};
