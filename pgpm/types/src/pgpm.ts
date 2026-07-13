import { execSync } from 'child_process';
import { PgConfig } from 'pg-env';

import { PgpmDriverConfig } from './driver';

/**
 * Authentication options for test client sessions
 */
export interface AuthOptions {
    /** Role to assume (defaults to 'authenticated' from RoleMapping config) */
    role?: string;
    /** User ID to set in session context */
    userId?: string | number;
    /** Key name for user ID in session context (defaults to 'jwt.claims.user_id') */
    userIdKey?: string;
}

/**
 * Configuration options for PostgreSQL test database connections
 */
export interface PgTestConnectionOptions {
    /** The root database to connect to for creating test databases */
    rootDb?: string;
    /** Template database to use when creating test databases */
    template?: string;
    /** Prefix to add to test database names */
    prefix?: string;
    /** PostgreSQL extensions to install in test databases */
    extensions?: string[];
    /** Current working directory for database operations */
    cwd?: string;
    /** Test user credentials for app and admin users */
    connections?: TestUserCredentials;
    /** Role mapping configuration */
    roles?: RoleMapping;
    /** Default authentication options for db connections */
    auth?: AuthOptions;
    /** Use advisory locks for role/user creation (for concurrency safety) */
    useLocksForRoles?: boolean;
}

/**
 * PostgreSQL session context settings for test clients
 * Used to set session variables via set_config() for RLS policies, search_path, etc.
 */
export interface PgTestClientContext {
  /** PostgreSQL role to assume */
  role?: string | null;
  /** Additional session context variables (e.g., 'jwt.claims.user_id', 'search_path') */
  [key: string]: string | null | undefined;
}


/**
 * Role mapping configuration for database security
 */
export interface RoleMapping {
    /** Anonymous (unauthenticated) role name */
    anonymous?: string;
    /** Authenticated user role name */
    authenticated?: string;
    /** Administrator role name */
    administrator?: string;
    /** Restricted proxy client role name (opt-in; created via `admin-users bootstrap --client`) */
    authenticatedClient?: string;
    /** Default role for new connections */
    default?: string;
}

/**
 * Database connection credentials
 */
export interface DatabaseConnectionOptions {
    /** Database user name */
    user?: string;
    /** Database password */
    password?: string;
    /** Database role to assume */
    role?: string;
}

/**
 * Test user credentials for app and admin users
 */
export interface TestUserCredentials {
    /** App user credentials (for RLS simulation) */
    app?: DatabaseConnectionOptions;
    /** Admin user credentials (for test admin operations) */
    admin?: DatabaseConnectionOptions;
}

/**
 * Code generation settings
 */
export interface CodegenOptions {
    /** Whether to wrap generated SQL code in transactions */
    useTx?: boolean;
}

/**
 * Migration and code generation options
 */
export interface MigrationOptions {
    /** Code generation settings */
    codegen?: CodegenOptions;
}

/**
 * Error output formatting options for controlling verbosity of error messages
 */
export interface ErrorOutputOptions {
    /** Maximum number of queries to show in error output (default: 30) */
    queryHistoryLimit?: number;
    /** Maximum total characters for error output before truncation (default: 10000) */
    maxLength?: number;
    /** When true, disables all limiting and shows full error output (default: false) */
    verbose?: boolean;
}

/**
 * Configuration for PGPM workspace
 */
export interface PgpmWorkspaceConfig {
  /** Glob patterns for package directories */
  packages: string[];
  /** Optional workspace metadata */
  name?: string;
  version?: string;
  /** Additional workspace settings */
  settings?: {
    [key: string]: any;
  };
  /** Deployment configuration for the workspace */
  deployment?: Omit<DeploymentOptions, 'toChange'>;
  /**
   * Template source recorded at scaffold time when the workspace is created
   * from a non-default boilerplate repo (e.g. via `pgpm init workspace --pglite`
   * or `--repo`). `pgpm init` reads this so modules created inside the workspace
   * inherit the same boilerplate source without re-specifying the flag.
   */
  boilerplates?: {
    /** Template repository URL */
    repo: string;
    /** Branch/tag to clone */
    branch?: string;
    /** Template variant directory */
    dir?: string;
  };
}

/**
 * Configuration options for module deployment
 */
export interface DeploymentOptions {
    /** Whether to wrap deployments in database transactions */
    useTx?: boolean;
    /** Use fast deployment strategy (skip migration system) */
    fast?: boolean;
    /** Whether to use Sqitch plan files for deployments */
    usePlan?: boolean;
    /** Enable caching of deployment packages */
    cache?: boolean;
    /** Deploy up to a specific change (inclusive) - can be a change name or tag reference (e.g., '@v1.0.0') */
    toChange?: string;
    /** Log-only mode - skip script execution and only record deployment metadata */
    logOnly?: boolean;
    /** 
     * Hash method for SQL files:
     * - 'content': Hash the raw file content (fast, but sensitive to formatting changes)
     * - 'ast': Hash the parsed AST structure (robust, ignores formatting/comments but slower)
     */
    hashMethod?: 'content' | 'ast';
}

/**
 * Main configuration options for the PGPM framework
 * Note: GraphQL/Graphile options (graphile, api, features) are in @constructive-io/graphql-types
 */
export interface PgpmOptions
  extends Partial<Omit<PgpmWorkspaceConfig, 'deployment'>> {
    /** Test database configuration options */
    db?: Partial<PgTestConnectionOptions>;
    /** PostgreSQL connection configuration */
    pg?: Partial<PgConfig>;
    /** Module deployment configuration */
    deployment?: DeploymentOptions;
    /** Migration and code generation options */
    migrations?: MigrationOptions;
    /** Error output formatting options */
    errorOutput?: ErrorOutputOptions;
    /**
     * Pluggable migration backend. Undefined = built-in `pg` (server) path.
     * Set `driver.plugin` to a package (e.g. `@pgpmjs/pglite-adapter`) resolved
     * from the consumer's `node_modules`.
     */
    driver?: PgpmDriverConfig;
}

/**
 * Default configuration values for PGPM framework
 */
export const pgpmDefaults: PgpmOptions = {
  db: {
    rootDb: 'postgres',
    prefix: 'db-',
    extensions: [],
    cwd: process.cwd(),
    connections: {
      app: {
        user: 'app_user',
        password: 'app_password'
      },
      admin: {
        user: 'app_admin',
        password: 'admin_password'
      }
    },
    roles: {
      anonymous: 'anonymous',
      authenticated: 'authenticated',
      administrator: 'administrator',
      default: 'anonymous'
    },
    useLocksForRoles: false
  },
  pg: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'postgres'
  },
  deployment: {
    useTx: true,
    fast: false,
    usePlan: true,
    cache: false,
    logOnly: false,
    hashMethod: 'content'
  },
  migrations: {
    codegen: {
      useTx: false
    }
  },
  errorOutput: {
    queryHistoryLimit: 30,
    maxLength: 10000,
    verbose: false
  },
};

export function getGitConfigInfo(): { username: string; email: string } {
  const isTestEnv =
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'testing' || // fallback
    process.env.GITHUB_ACTIONS === 'true'; // GitHub Actions

  if (isTestEnv) {
    return {
      username: 'CI Test User',
      email: 'ci@example.com'
    };
  }

  let username = '';
  let email = '';

  try {
    username = execSync('git config --global user.name', {
      encoding: 'utf8'
    }).trim();
  } catch {
    username = '';
  }

  try {
    email = execSync('git config --global user.email', {
      encoding: 'utf8'
    }).trim();
  } catch {
    email = '';
  }

  return { username, email };
}
