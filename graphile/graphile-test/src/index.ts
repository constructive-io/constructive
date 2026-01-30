/**
 * graphile-test
 *
 * PostGraphile v5 Testing Utilities
 *
 * This package provides robust GraphQL testing utilities for PostGraphile v5 projects.
 * It builds on top of PostgreSQL connection management to provide isolated, seeded,
 * role-aware database testing with GraphQL integration.
 *
 * FEATURES:
 * - Per-test rollback via savepoints for isolation
 * - RLS-aware context injection (setContext)
 * - GraphQL integration testing with query() and snapshot support
 * - Support for custom PostGraphile v5 presets
 * - Seed adapters for SQL files, custom functions, and composition
 *
 * USAGE:
 *
 * ```typescript
 * import { getConnections, seed } from 'graphile-test';
 *
 * let db, query, teardown;
 *
 * beforeAll(async () => {
 *   ({ db, query, teardown } = await getConnections({
 *     schemas: ['app_public'],
 *     authRole: 'authenticated',
 *     preset: MyPreset,
 *   }, [
 *     seed.sqlfile(['./setup.sql'])
 *   ]));
 * });
 *
 * beforeEach(() => db.beforeEach());
 * afterEach(() => db.afterEach());
 * afterAll(() => teardown());
 *
 * it('runs a GraphQL mutation', async () => {
 *   const res = await query(`mutation { ... }`, { input: { ... } });
 *   expect(res.data.createUser.username).toBe('alice');
 * });
 * ```
 *
 * VARIANTS:
 *
 * - getConnections() - Positional API with raw responses
 * - getConnectionsUnwrapped() - Positional API that throws on errors
 * - getConnectionsObject() - Object API with raw responses
 * - getConnectionsObjectUnwrapped() - Object API that throws on errors
 * - getConnectionsWithLogging() - Logs all queries and responses
 * - getConnectionsWithTiming() - Times query execution
 *
 * SEED ADAPTERS:
 *
 * - seed.sqlfile(['file1.sql', 'file2.sql']) - Load SQL files
 * - seed.fn(async (ctx) => { ... }) - Custom seed function
 * - seed.compose([adapter1, adapter2]) - Compose multiple adapters
 */

export * from './context.js';
export * from './get-connections.js';
export * from './graphile-test.js';
export * from './types.js';
export * from './seed/index.js';
export { snapshot, prune, pruneDates, pruneIds, pruneUUIDs, pruneHashes, pruneIdArrays } from './utils.js';
