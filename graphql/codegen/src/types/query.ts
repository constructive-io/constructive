/**
 * Query-related types for building GraphQL operations
 */

import type { FieldSelection } from './selection';

/**
 * Relay-style pagination info
 */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

/**
 * Relay-style connection result
 */
export interface ConnectionResult<T = unknown> {
  nodes: T[];
  totalCount: number;
  pageInfo: PageInfo;
}

/**
 * Options for building SELECT queries
 */
export interface QueryOptions {
  /** Number of records to fetch (alias for first) */
  first?: number;
  /** Alias for first */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Cursor for forward pagination */
  after?: string;
  /** Cursor for backward pagination */
  before?: string;
  /** Filter conditions */
  where?: Filter;
  /** Sort order */
  orderBy?: OrderByItem[];
  /** Field selection options */
  fieldSelection?: FieldSelection;
  /** Include pageInfo in response */
  includePageInfo?: boolean;
}

/**
 * Single order by specification
 */
export interface OrderByItem {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// Filter Types (PostGraphile connection filters)
// ============================================================================

/**
 * All supported filter operators
 */
export type FilterOperator =
  // Null checks
  | 'isNull'
  // Equality
  | 'equalTo'
  | 'notEqualTo'
  | 'distinctFrom'
  | 'notDistinctFrom'
  // List membership
  | 'in'
  | 'notIn'
  // Comparison
  | 'lessThan'
  | 'lessThanOrEqualTo'
  | 'greaterThan'
  | 'greaterThanOrEqualTo'
  // String operators
  | 'includes'
  | 'notIncludes'
  | 'includesInsensitive'
  | 'notIncludesInsensitive'
  | 'startsWith'
  | 'notStartsWith'
  | 'startsWithInsensitive'
  | 'notStartsWithInsensitive'
  | 'endsWith'
  | 'notEndsWith'
  | 'endsWithInsensitive'
  | 'notEndsWithInsensitive'
  | 'like'
  | 'notLike'
  | 'likeInsensitive'
  | 'notLikeInsensitive'
  | 'equalToInsensitive'
  | 'notEqualToInsensitive'
  | 'distinctFromInsensitive'
  | 'notDistinctFromInsensitive'
  | 'inInsensitive'
  | 'notInInsensitive'
  // Array operators
  | 'contains'
  | 'containedBy'
  | 'overlaps'
  // PostGIS operators
  | 'intersects'
  | 'intersects3D'
  | 'containsProperly'
  | 'coveredBy'
  | 'covers'
  | 'crosses'
  | 'disjoint'
  | 'orderingEquals'
  | 'touches'
  | 'within'
  | 'bboxIntersects2D'
  | 'bboxIntersects3D'
  | 'bboxOverlapsOrLeftOf'
  | 'bboxOverlapsOrRightOf'
  | 'bboxOverlapsOrBelow'
  | 'bboxOverlapsOrAbove'
  | 'bboxLeftOf'
  | 'bboxRightOf'
  | 'bboxBelow'
  | 'bboxAbove'
  | 'bboxContains'
  | 'bboxEquals';

/**
 * Filter on a single field
 */
export type FieldFilter = {
  [K in FilterOperator]?: unknown;
};

/**
 * Filter on related records
 */
export interface RelationalFilter {
  /** All related records must match */
  every?: Filter;
  /** At least one related record must match */
  some?: Filter;
  /** No related records match */
  none?: Filter;
}

/**
 * Main filter type - can be nested
 */
export type Filter = {
  [field: string]: FieldFilter | RelationalFilter | Filter;
} & {
  and?: Filter[];
  or?: Filter[];
  not?: Filter;
};
