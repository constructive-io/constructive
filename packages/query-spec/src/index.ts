/**
 * The Constructive query language specification.
 *
 * Defines the shared filter, ordering, and pagination grammar used across the
 * stack: the generated GraphQL SDK/ORM clients, the PostGraphile connection
 * filters, and the SQL query builder all conform to these shapes.
 *
 * The `Filter` grammar is generic over the operand type so each layer can
 * constrain what a field may be compared against (plain JSON values in the
 * SDK, parameterized values / expressions / subqueries in SQL).
 */

// ---------------------------------------------------------------------------
// Filter operators
// ---------------------------------------------------------------------------

/** Null check */
export const NULL_FILTER_OPERATORS = ['isNull'] as const;
export type NullFilterOperator = (typeof NULL_FILTER_OPERATORS)[number];

/** Binary comparisons */
export const COMPARISON_FILTER_OPERATORS = [
  'equalTo',
  'notEqualTo',
  'lessThan',
  'lessThanOrEqualTo',
  'greaterThan',
  'greaterThanOrEqualTo'
] as const;
export type ComparisonFilterOperator = (typeof COMPARISON_FILTER_OPERATORS)[number];

/** IS DISTINCT FROM / IS NOT DISTINCT FROM */
export const DISTINCT_FILTER_OPERATORS = ['distinctFrom', 'notDistinctFrom'] as const;
export type DistinctFilterOperator = (typeof DISTINCT_FILTER_OPERATORS)[number];

/** List membership */
export const LIST_FILTER_OPERATORS = ['in', 'notIn'] as const;
export type ListFilterOperator = (typeof LIST_FILTER_OPERATORS)[number];

/** LIKE / ILIKE with caller-supplied patterns */
export const LIKE_FILTER_OPERATORS = [
  'like',
  'notLike',
  'likeInsensitive',
  'notLikeInsensitive'
] as const;
export type LikeFilterOperator = (typeof LIKE_FILTER_OPERATORS)[number];

/** Pattern sugar — the layer builds the `%` pattern from a plain string */
export const PATTERN_FILTER_OPERATORS = [
  'includes',
  'notIncludes',
  'includesInsensitive',
  'notIncludesInsensitive',
  'startsWith',
  'notStartsWith',
  'startsWithInsensitive',
  'notStartsWithInsensitive',
  'endsWith',
  'notEndsWith',
  'endsWithInsensitive',
  'notEndsWithInsensitive'
] as const;
export type PatternFilterOperator = (typeof PATTERN_FILTER_OPERATORS)[number];

/** Case-insensitive equality/membership variants */
export const INSENSITIVE_FILTER_OPERATORS = [
  'equalToInsensitive',
  'notEqualToInsensitive',
  'distinctFromInsensitive',
  'notDistinctFromInsensitive',
  'inInsensitive',
  'notInInsensitive'
] as const;
export type InsensitiveFilterOperator = (typeof INSENSITIVE_FILTER_OPERATORS)[number];

/** Array containment/overlap */
export const ARRAY_FILTER_OPERATORS = ['contains', 'containedBy', 'overlaps'] as const;
export type ArrayFilterOperator = (typeof ARRAY_FILTER_OPERATORS)[number];

/** PostGIS spatial operators */
export const POSTGIS_FILTER_OPERATORS = [
  'intersects',
  'intersects3D',
  'containsProperly',
  'coveredBy',
  'covers',
  'crosses',
  'disjoint',
  'orderingEquals',
  'touches',
  'within',
  'bboxIntersects2D',
  'bboxIntersects3D',
  'bboxOverlapsOrLeftOf',
  'bboxOverlapsOrRightOf',
  'bboxOverlapsOrBelow',
  'bboxOverlapsOrAbove',
  'bboxLeftOf',
  'bboxRightOf',
  'bboxBelow',
  'bboxAbove',
  'bboxContains',
  'bboxEquals'
] as const;
export type PostgisFilterOperator = (typeof POSTGIS_FILTER_OPERATORS)[number];

/** All supported filter operators */
export const FILTER_OPERATORS = [
  ...NULL_FILTER_OPERATORS,
  ...COMPARISON_FILTER_OPERATORS,
  ...DISTINCT_FILTER_OPERATORS,
  ...LIST_FILTER_OPERATORS,
  ...LIKE_FILTER_OPERATORS,
  ...PATTERN_FILTER_OPERATORS,
  ...INSENSITIVE_FILTER_OPERATORS,
  ...ARRAY_FILTER_OPERATORS,
  ...POSTGIS_FILTER_OPERATORS
] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export function isFilterOperator(op: string): op is FilterOperator {
  return (FILTER_OPERATORS as readonly string[]).includes(op);
}

// ---------------------------------------------------------------------------
// Filter grammar
// ---------------------------------------------------------------------------

/** Boolean combinators */
export const LOGICAL_OPERATORS = ['and', 'or', 'not'] as const;
export type LogicalOperator = (typeof LOGICAL_OPERATORS)[number];

export function isLogicalOperator(op: string): op is LogicalOperator {
  return (LOGICAL_OPERATORS as readonly string[]).includes(op);
}

/**
 * Filter on a single field.
 *
 * Generic over the operand type: the SDK uses plain JSON values, the SQL
 * layer additionally allows expressions and subqueries.
 */
export type FieldFilter<TOperand = unknown> = {
  [K in FilterOperator]?: TOperand;
};

/**
 * Filter on related records (GraphQL/ORM layer semantics).
 */
export interface RelationalFilter<TOperand = unknown> {
  /** All related records must match */
  every?: Filter<TOperand>;
  /** At least one related record must match */
  some?: Filter<TOperand>;
  /** No related records match */
  none?: Filter<TOperand>;
}

/**
 * The main filter type. Sibling keys combine with AND; `or`/`not`
 * introduce disjunction and negation. Nestable arbitrarily.
 */
export interface Filter<TOperand = unknown> {
  [field: string]:
    | FieldFilter<TOperand>
    | RelationalFilter<TOperand>
    | Filter<TOperand>
    | Filter<TOperand>[]
    | undefined;
  and?: Filter<TOperand>[];
  or?: Filter<TOperand>[];
  not?: Filter<TOperand>;
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

export type OrderDirection = 'asc' | 'desc';

/** Single order by specification */
export interface OrderByItem {
  field: string;
  direction: OrderDirection;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Relay-style pagination info */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

/** Relay-style connection result */
export interface ConnectionResult<T = unknown> {
  nodes: T[];
  totalCount: number;
  pageInfo: PageInfo;
}
