/**
 * Ephemeral Database Utilities
 *
 * Provides utilities for creating and managing temporary PostgreSQL databases
 * for testing, code generation, and other ephemeral use cases.
 */
import { randomUUID } from 'crypto';
import { getPgEnvOptions, PgConfig } from 'pg-env';

import { DbAdmin } from './admin';

/**
 * Options for creating an ephemeral database
 */
export interface EphemeralDbOptions {
  /**
   * Database name prefix (default: 'ephemeral_')
   */
  prefix?: string;

  /**
   * PostgreSQL extensions to install after creation
   */
  extensions?: string[];

  /**
   * Base PostgreSQL configuration (host, port, user, password)
   * If not provided, uses environment variables via pg-env
   */
  baseConfig?: Partial<PgConfig>;

  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

/**
 * Options for tearing down an ephemeral database
 */
export interface TeardownOptions {
  /**
   * If true, keeps the database instead of dropping it (useful for debugging)
   */
  keepDb?: boolean;
}

/**
 * Result of creating an ephemeral database
 */
export interface EphemeralDbResult {
  /**
   * The name of the created database
   */
  name: string;

  /**
   * Full PostgreSQL configuration for connecting to the ephemeral database
   */
  config: PgConfig;

  /**
   * Database admin instance for additional operations
   */
  admin: DbAdmin;

  /**
   * Teardown function to clean up the ephemeral database
   * Call this when done to drop the database (unless keepDb is true)
   */
  teardown: (opts?: TeardownOptions) => void;
}

/**
 * Create an ephemeral (temporary) PostgreSQL database
 *
 * Creates a new database with a unique UUID-based name. The database
 * can be used for testing, code generation, or other temporary purposes.
 *
 * @example
 * ```typescript
 * const { config, teardown } = createEphemeralDb();
 *
 * // Use the database...
 * const pool = new Pool(config);
 * await pool.query('SELECT 1');
 * await pool.end();
 *
 * // Clean up
 * teardown();
 *
 * // Or keep for debugging
 * teardown({ keepDb: true });
 * ```
 */
export function createEphemeralDb(options: EphemeralDbOptions = {}): EphemeralDbResult {
  const {
    prefix = 'ephemeral_',
    extensions = [],
    baseConfig = {},
    verbose = false,
  } = options;

  // Generate unique database name
  const dbName = `${prefix}${randomUUID().replace(/-/g, '_')}`;

  // Get base config from environment, merged with any provided config
  const config: PgConfig = getPgEnvOptions({
    ...baseConfig,
    database: dbName,
  });

  // Create admin instance for database operations
  const admin = new DbAdmin(config, verbose);

  // Create the database
  admin.create(dbName);

  // Install extensions if specified
  if (extensions.length > 0) {
    admin.installExtensions(extensions, dbName);
  }

  // Create teardown function
  const teardown = (opts: TeardownOptions = {}) => {
    const { keepDb = false } = opts;

    if (keepDb) {
      if (verbose) {
        console.log(`[ephemeral-db] Keeping database: ${dbName}`);
      }
      return;
    }

    try {
      admin.drop(dbName);
      if (verbose) {
        console.log(`[ephemeral-db] Dropped database: ${dbName}`);
      }
    } catch (err) {
      if (verbose) {
        console.error(`[ephemeral-db] Failed to drop database ${dbName}:`, err);
      }
    }
  };

  return {
    name: dbName,
    config,
    admin,
    teardown,
  };
}

/**
 * Create an ephemeral database asynchronously
 *
 * Same as createEphemeralDb but returns a Promise for consistency
 * with async workflows.
 */
export async function createEphemeralDbAsync(
  options: EphemeralDbOptions = {}
): Promise<EphemeralDbResult> {
  return createEphemeralDb(options);
}
