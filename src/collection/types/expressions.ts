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
  $accumulator?: {
    init: Expression;
    initArgs?: Expression[];
    accumulate: Expression;
    accumulateArgs: Expression[];
    merge: Expression;
    finalize?: Expression;
    lang: "js";
  };
  $addToSet?: Expression;
  $avg?: Expression;
  $bottom?: { sortBy: Record<string, 1 | -1>; output: Expression | Expression[] };
  $bottomN?: { sortBy: Record<string, 1 | -1>; output: Expression | Expression[]; n: Expression };
  $count?: Record<string, never>;
  $first?: Expression;
  $firstN?: { input: Expression; n: Expression };
  $last?: Expression;
  $lastN?: { input: Expression; n: Expression };
  $max?: Expression;
  $maxN?: { input: Expression; n: Expression };
  $mergeObjects?: Expression;
  $min?: Expression;
  $minN?: { input: Expression; n: Expression };
  $push?: Expression;
  $stdDevPop?: Expression;
  $stdDevSamp?: Expression;
  $sum?: Expression;
  $top?: { sortBy: Record<string, 1 | -1>; output: Expression | Expression[] };
  $topN?: { sortBy: Record<string, 1 | -1>; output: Expression | Expression[]; n: Expression };
};

export type WindowOperator = {
  $addToSet?: Expression;
  $avg?: Expression;
  $bottom?: { sortBy: Record<string, 1 | -1>; output: Expression | Expression[] };
  $bottomN?: { sortBy: Record<string, 1 | -1>; output: Expression | Expression[]; n: Expression };
  $count?: Record<string, never>;
  $covariancePop?: Expression | [Expression, Expression];
  $covarianceSamp?: Expression | [Expression, Expression];
  $denseRank?: Record<string, never>;
  $derivative?: { input: Expression; unit?: string };
  $documentNumber?: Record<string, never>;
  $expMovingAvg?: { input: Expression; N: number } | { input: Expression; alpha: number };
  $first?: Expression;
  $firstN?: { input: Expression; n: Expression };
  $integral?: { input: Expression; unit?: string };
  $last?: Expression;
  $lastN?: { input: Expression; n: Expression };
  $linearFill?: Expression;
  $locf?: Expression;
  $max?: Expression;
  $maxN?: { input: Expression; n: Expression };
  $min?: Expression;
  $minN?: { input: Expression; n: Expression };
  $push?: Expression;
  $rank?: Record<string, never>;
  $shift?: { output: Expression; by: number; default?: Expression };
  $stdDevPop?: Expression;
  $stdDevSamp?: Expression;
  $sum?: Expression;
  $top?: { sortBy: Record<string, 1 | -1>; output: Expression | Expression[] };
  $topN?: { sortBy: Record<string, 1 | -1>; output: Expression | Expression[]; n: Expression };
};

export type ObjectExpressionOperator = {
  [operator: string]: Expression | Expression[];
};
