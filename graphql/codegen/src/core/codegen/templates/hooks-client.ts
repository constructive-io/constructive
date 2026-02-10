/**
 * ORM client wrapper for React Query hooks
 *
 * This is the RUNTIME code that gets copied to generated output.
 * Provides configure/getClient singleton for React Query hooks to access the ORM.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated hook clients.
 */

import { createClient } from '../orm';
import type { OrmClientConfig } from '../orm/client';

export type { OrmClientConfig } from '../orm/client';
export type { GraphQLAdapter, GraphQLError, QueryResult } from '../orm/client';
export { GraphQLRequestError } from '../orm/client';

type OrmClientInstance = ReturnType<typeof createClient>;
let client: OrmClientInstance | null = null;

/**
 * Configure the ORM client for React Query hooks
 *
 * @example
 * ```ts
 * import { configure } from './generated/hooks';
 *
 * configure({
 *   endpoint: 'https://api.example.com/graphql',
 *   headers: { Authorization: 'Bearer <token>' },
 * });
 * ```
 */
export function configure(config: OrmClientConfig): void {
  client = createClient(config);
}

/**
 * Get the configured ORM client instance
 * @throws Error if configure() has not been called
 */
export function getClient(): OrmClientInstance {
  if (!client) {
    throw new Error(
      'ORM client not configured. Call configure() before using hooks.',
    );
  }
  return client;
}
