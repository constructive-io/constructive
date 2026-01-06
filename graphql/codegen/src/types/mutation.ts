/**
 * Mutation-related types
 */

import type { FieldSelection } from './selection';

/**
 * Options for mutation operations
 */
export interface MutationOptions {
  /** Fields to return after mutation */
  returning?: string[];
  /** Field selection for returned data */
  fieldSelection?: FieldSelection;
}

/**
 * Input for create mutations
 * Wraps the actual data in PostGraphile's expected format
 */
export interface CreateInput<T = Record<string, unknown>> {
  [tableName: string]: T;
}

/**
 * Input for update mutations
 */
export interface UpdateInput<T = Record<string, unknown>> {
  /** Primary key value */
  id: string | number;
  /** Fields to update */
  patch: T;
}

/**
 * Input for delete mutations
 */
export interface DeleteInput {
  /** Primary key value */
  id: string | number;
}

/**
 * Standard mutation result
 */
export interface MutationResult<T = unknown> {
  /** The affected record */
  data?: T;
  /** Client mutation ID (PostGraphile) */
  clientMutationId?: string;
}
