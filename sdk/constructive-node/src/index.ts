/**
 * @constructive-io/node
 *
 * Drop-in replacement for @constructive-io/sdk with Node.js HTTP adapter.
 *
 * For Node.js applications, use this package instead of @constructive-io/sdk.
 * It re-exports everything from the base SDK and adds NodeHttpAdapter,
 * which uses node:http/node:https instead of the Fetch API to handle:
 *
 * 1. *.localhost subdomain DNS resolution (Node can't resolve these natively)
 * 2. Host header preservation (Fetch API silently drops it)
 *
 * @example
 * ```typescript
 * import { createNodeClient } from '@constructive-io/node';
 *
 * const db = createNodeClient({
 *   endpoint: 'http://auth.localhost:3000/graphql',
 *   headers: { Authorization: 'Bearer token' },
 * });
 *
 * // Use exactly like @constructive-io/sdk
 * const users = await db.auth.orm.createClient({ endpoint }).user.findMany({
 *   select: { id: true, name: true },
 * }).execute();
 * ```
 */

// Re-export everything from the base SDK
export * from '@constructive-io/sdk';

// Export the Node.js HTTP adapter
export { NodeHttpAdapter } from './node-http-adapter';
export type { NodeHttpExecuteOptions } from './node-http-adapter';
