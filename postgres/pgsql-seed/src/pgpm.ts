import { PgpmPackage } from '@pgpmjs/core';
import { getEnvOptions } from '@pgpmjs/env';
import type { PgConfig } from 'pg-env';

/**
 * Deploy a pgpm package to a PostgreSQL database.
 * 
 * @param config - PostgreSQL configuration (host, port, database, user, password)
 * @param cwd - Current working directory containing the pgpm package (defaults to process.cwd())
 * @param cache - Whether to enable caching (defaults to false)
 * 
 * @example
 * ```typescript
 * import { Client } from 'pg';
 * import { deployPgpm } from 'pgsql-seed';
 * 
 * const config = {
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'mydb',
 *   user: 'postgres',
 *   password: 'password'
 * };
 * 
 * // Deploy the pgpm package in the current directory
 * await deployPgpm(config);
 * 
 * // Deploy from a specific directory
 * await deployPgpm(config, '/path/to/package');
 * ```
 */
export async function deployPgpm(
  config: PgConfig,
  cwd?: string,
  cache: boolean = false
): Promise<void> {
  const proj = new PgpmPackage(cwd ?? process.cwd());
  if (!proj.isInModule()) return;

  await proj.deploy(
    getEnvOptions({ 
      pg: config,
      deployment: {
        fast: true,
        usePlan: true,
        cache
      }
    }), 
    proj.getModuleName()
  );
}

/**
 * Load/deploy a pgpm package - alias for deployPgpm for consistency with other load* functions.
 * 
 * @param config - PostgreSQL configuration
 * @param cwd - Current working directory containing the pgpm package
 * @param cache - Whether to enable caching
 */
export async function loadPgpm(
  config: PgConfig,
  cwd?: string,
  cache: boolean = false
): Promise<void> {
  return deployPgpm(config, cwd, cache);
}
