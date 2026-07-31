import { PgpmPackage } from '@pgpmjs/core';
import { getEnvOptions } from '@pgpmjs/env';
import type { PgConfig } from 'pg-env';

/**
 * The slice of pgsql-test's `SeedContext` the portability adapters need.
 * Structural, so the adapters plug into `getConnections(_, [seed.apply(...)])`
 * without this package depending on pgsql-test.
 */
export interface ApplySeedContext {
  config: PgConfig;
  connect: { cwd?: string };
}

/** Structurally compatible with pgsql-test's `SeedAdapter`. */
export interface ApplySeedAdapter {
  seed(ctx: ApplySeedContext): Promise<void>;
}

export interface ApplySeedOptions {
  /** Enable pgpm's deployment cache. */
  cache?: boolean;
  /**
   * Directory to discover the workspace from. Defaults to the test's cwd —
   * the workspace root is found automatically by walking up from it.
   */
  cwd?: string;
}

/**
 * Deploy a named workspace target — typically an apply proxy (a directory
 * carrying `pgpm.apply.json`) — into the test database, exactly as a
 * production `pgpm deploy <target>` would: the workspace is discovered from
 * the test's cwd, dependencies resolve from the workspace module map, and
 * proxy modules transpile/materialize through the engine's apply path.
 *
 * ```ts
 * getConnections({}, [seed.apply('vendor-app-ported')]);
 * ```
 */
export function apply(target: string, options: ApplySeedOptions = {}): ApplySeedAdapter {
  return {
    async seed(ctx: ApplySeedContext) {
      const workspace = new PgpmPackage(options.cwd ?? ctx.connect.cwd ?? process.cwd());
      await workspace.deploy(
        getEnvOptions({
          pg: ctx.config,
          deployment: {
            fast: true,
            usePlan: true,
            cache: options.cache ?? false
          }
        }),
        target
      );
    }
  };
}

export const seed = { apply };
