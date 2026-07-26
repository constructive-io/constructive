import { createDevServer } from '@constructive-io/graphql-dev-server';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import type { PlaywrightServerOptions, ServerInfo } from './types';

/**
 * Create a test server for Playwright testing.
 *
 * Delegates to `@constructive-io/graphql-dev-server`, a pure-PostGraphile
 * single-tenant server (no scoped routing, no database id) that exposes the
 * configured schemas directly. Production scoped routing lives in
 * `@constructive-io/graphql-server` and is never used here.
 */
export const createTestServer = async (
  opts: ConstructiveOptions,
  serverOpts: PlaywrightServerOptions = {}
): Promise<ServerInfo> => {
  const { httpServer, url, graphqlUrl, port, host, stop } = await createDevServer(
    opts,
    {
      host: serverOpts.host ?? 'localhost',
      port: serverOpts.port ?? 0
    }
  );

  return { httpServer, url, graphqlUrl, port, host, stop };
};

/**
 * Get the PostgreSQL pool for the test server
 */
export const getTestPool = (opts: ConstructiveOptions): Pool => {
  return getPgPool(opts.pg);
};
