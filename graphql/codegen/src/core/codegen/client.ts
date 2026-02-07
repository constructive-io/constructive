/**
 * Client generator - generates client.ts as ORM client wrapper
 *
 * Generates a configure()/getClient() singleton pattern that wraps the ORM client.
 * React Query hooks use getClient() to delegate to ORM model methods.
 */
import { getGeneratedFileHeader } from './utils';

/**
 * Generate client.ts content - ORM client wrapper with configure/getClient
 */
export function generateClientFile(): string {
  const header = getGeneratedFileHeader('ORM client wrapper for React Query hooks');

  const code = `
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
 * \`\`\`ts
 * import { configure } from './generated/hooks';
 *
 * configure({
 *   endpoint: 'https://api.example.com/graphql',
 *   headers: { Authorization: 'Bearer <token>' },
 * });
 * \`\`\`
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
      'ORM client not configured. Call configure() before using hooks.'
    );
  }
  return client;
}
`;

  return header + '\n' + code.trim() + '\n';
}
