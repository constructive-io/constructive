/**
 * Query-related types for building GraphQL operations
 *
 * The filter, ordering, and pagination grammar is defined by the shared
 * `query-spec` package and re-exported here.
 */

import type { Filter, OrderByItem } from 'query-spec';

import type { FieldSelection } from './selection';

export type {
  ConnectionResult,
  FieldFilter,
  Filter,
  FilterOperator,
  OrderByItem,
  OrderDirection,
  PageInfo,
  RelationalFilter
} from 'query-spec';

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
  /**
   * Maps requested relation field names to actual schema field names (or null to omit).
   * When the mapped name differs from the key, a GraphQL alias is emitted so the
   * consumer sees a stable field name regardless of the server-side name.
   *
   * Example: `{ contact: 'contactByOwnerId' }` emits `contact: contactByOwnerId { … }`
   * Pass `null` to suppress a relation entirely: `{ internalNotes: null }`
   */
  relationFieldMap?: Record<string, string | null>;
  /** Include pageInfo in response */
  includePageInfo?: boolean;
}


