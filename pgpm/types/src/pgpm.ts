import { execSync } from 'child_process';
import { PgConfig } from 'pg-env';
import { JobsConfig } from './jobs';

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
* @deprecated Use PgTestClientContext instead (typo fix)
*/
export type PgTextClientContext = PgTestClientContext;

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
 * HTTP server configuration
 */
export interface ServerOptions {
    /** Server host address */
    host?: string;
    /** Server port number */
    port?: number;
    /** Whether to trust proxy headers */
    trustProxy?: boolean;
    /** CORS origin configuration */
    origin?: string;
    /** Whether to enforce strict authentication */
    strictAuth?: boolean;
}

/**
 * Storage provider type for CDN/bucket operations
 */
export type BucketProvider = 's3' | 'minio' | 'gcs';

/**
 * CDN and file storage configuration
 */
export interface CDNOptions {
    /** Storage provider type (s3, minio, gcs). Defaults to 'minio' for local dev */
    provider?: BucketProvider;
    /** S3 bucket name for file storage */
    bucketName?: string;
    /** AWS region for S3 bucket */
    awsRegion?: string;
    /** AWS access key for S3 */
    awsAccessKey?: string;
    /** AWS secret key for S3 */
    awsSecretKey?: string;
    /** MinIO endpoint URL for local development (only used when provider is 'minio') */
    minioEndpoint?: string;
}

/**
 * SMTP email configuration options
 */
export interface SmtpOptions {
    /** SMTP server hostname */
    host?: string;
    /** SMTP server port (defaults to 587 for non-secure, 465 for secure) */
    port?: number;
    /** Use TLS/SSL connection (defaults based on port: true for 465, false otherwise) */
    secure?: boolean;
    /** SMTP authentication username */
    user?: string;
    /** SMTP authentication password */
    pass?: string;
    /** Default sender email address */
    from?: string;
    /** Default reply-to email address */
    replyTo?: string;
    /** Require TLS upgrade via STARTTLS */
    requireTLS?: boolean;
    /** Reject unauthorized TLS certificates */
    tlsRejectUnauthorized?: boolean;
    /** Use connection pooling for multiple emails */
    pool?: boolean;
    /** Maximum number of pooled connections */
    maxConnections?: number;
    /** Maximum messages per connection before reconnecting */
    maxMessages?: number;
    /** SMTP client hostname for EHLO/HELO */
    name?: string;
    /** Enable nodemailer logging */
    logger?: boolean;
    /** Enable nodemailer debug output */
    debug?: boolean;
}

/**
 * Mailgun email configuration options
 */
export interface MailgunOptions {
    /** Mailgun API key */
    key?: string;
    /** Mailgun domain (e.g., 'mg.example.com') */
    domain?: string;
    /** Default sender email address */
    from?: string;
    /** Default reply-to email address */
    replyTo?: string;
    /** Development email address - when set, all emails are redirected to this address with original recipient encoded in the local part */
    devEmail?: string;
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
export interface PgpmOptions {
    /** Test database configuration options */
    db?: Partial<PgTestConnectionOptions>;
    /** PostgreSQL connection configuration */
    pg?: Partial<PgConfig>;
    /** HTTP server configuration */
    server?: ServerOptions;
    /** CDN and file storage configuration */
    cdn?: CDNOptions;
    /** Module deployment configuration */
    deployment?: DeploymentOptions;
    /** Migration and code generation options */
    migrations?: MigrationOptions;
    /** Job system configuration */
    jobs?: JobsConfig;
    /** Error output formatting options */
    errorOutput?: ErrorOutputOptions;
    /** SMTP email configuration */
    smtp?: SmtpOptions;
    /** Mailgun email configuration */
    mailgun?: MailgunOptions;
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
    database: 'postgres',
  },
  server: {
    host: 'localhost',
    port: 3000,
    trustProxy: false,
    strictAuth: false,
  },
  cdn: {
    provider: 'minio',
    bucketName: 'test-bucket',
    awsRegion: 'us-east-1',
    awsAccessKey: 'minioadmin',
    awsSecretKey: 'minioadmin',
    minioEndpoint: 'http://localhost:9000'
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
  jobs: {
    schema: {
      schema: 'app_jobs'
    },
    worker: {
      schema: 'app_jobs',
      hostname: 'worker-0',
      supportAny: true,
      supported: [],
      pollInterval: 1000,
      gracefulShutdown: true
    },
    scheduler: {
      schema: 'app_jobs',
      hostname: 'scheduler-0',
      supportAny: true,
      supported: [],
      pollInterval: 1000,
      gracefulShutdown: true
    }
  },
  errorOutput: {
    queryHistoryLimit: 30,
    maxLength: 10000,
    verbose: false
  },
  smtp: {
    port: 587,
    secure: false,
    pool: false,
    logger: false,
    debug: false
  }
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
