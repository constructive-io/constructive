/**
 * Shared test utilities for constructive GraphQL server integration tests.
 *
 * All test files import from this module for constants, auth helpers,
 * and server configuration.
 *
 * Each test file gets its own isolated database cloned from a template
 * via getTestConnections(). The template (constructive_test_tpl) is
 * created once (lazily, on first call) from the live constructive DB
 * using pg_dump, and reused for all subsequent clones in the same run.
 * Leftover templates from previous runs are dropped before recreation.
 */

import { execSync } from 'child_process';
import { getConnections } from '../src';
import type {
  GraphQLQueryFn,
  GraphQLResponse,
  GetConnectionsResult
} from '../src/types';

// --- Constants ---

/** Admin credentials seeded by constructive-local */
export const ADMIN_EMAIL = 'admin@constructive.io';
export const ADMIN_PASSWORD = 'admin123!@Constructive';
export const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000002';

/** Source database name (constructive, NOT constructive_db) */
export const DATABASE_NAME = 'constructive';

/** Template database name, created from constructive via pg_dump on first use */
const TEMPLATE_DB = 'constructive_test_tpl';

// --- Template Creation (lazy, once-only) ---

/** Cached promise so the template is created exactly once per test run. */
let templatePromise: Promise<void> | null = null;

/** Builds pg CLI flags from environment variables. */
function pgOpts() {
  const user = process.env.PGUSER || 'postgres';
  const host = process.env.PGHOST || 'localhost';
  const port = process.env.PGPORT || '5432';
  return `-U "${user}" -h "${host}" -p ${port}`;
}

/**
 * Ensures the template database exists, creating it on first call.
 *
 * Uses pg_dump (works even when constructive has active connections,
 * unlike CREATE DATABASE ... TEMPLATE which requires exclusive access).
 * Drops any leftover template from a previous run before recreating.
 * Subsequent calls return the same cached promise (no-op).
 */
function ensureTemplate(): Promise<void> {
  if (!templatePromise) {
    templatePromise = (async () => {
      const flags = pgOpts();
      const password = process.env.PGPASSWORD || 'password';
      const opts = { stdio: 'pipe' as const, env: { ...process.env, PGPASSWORD: password } };

      // Drop leftover template from a previous run
      try {
        execSync(`psql ${flags} -c "UPDATE pg_database SET datistemplate = false WHERE datname = '${TEMPLATE_DB}'"`, opts);
        execSync(`dropdb ${flags} --if-exists "${TEMPLATE_DB}"`, opts);
      } catch { /* template may not exist */ }

      // Create empty DB and restore constructive data into it
      execSync(`createdb ${flags} "${TEMPLATE_DB}"`, opts);
      execSync(
        `pg_dump ${flags} -Fc --no-owner "${DATABASE_NAME}" | pg_restore ${flags} -d "${TEMPLATE_DB}" --no-owner 2>/dev/null || true`,
        { ...opts, shell: '/bin/sh', timeout: 120000 }
      );

      // Mark as template for fast cloning
      execSync(
        `psql ${flags} -c "UPDATE pg_database SET datistemplate = true WHERE datname = '${TEMPLATE_DB}'"`,
        opts
      );
    })();
  }
  return templatePromise;
}

/** Default role used by the test server (anonymous role for this DB) */
export const AUTH_ROLE = 'administrator';

/**
 * The 13 schemas exposed by the api.localhost endpoint.
 * Sourced from services_public.api_schemas for the constructive database.
 */
export const EXPOSED_SCHEMAS: string[] = [
  'constructive_auth_public',
  'constructive_public',
  'constructive_invites_public',
  'constructive_limits_public',
  'constructive_logging_public',
  'constructive_memberships_public',
  'constructive_permissions_public',
  'constructive_status_public',
  'constructive_user_identifiers_public',
  'constructive_users_public',
  'metaschema_public',
  'metaschema_modules_public',
  'services_public',
];

/**
 * Standard getConnections options for constructive-local tests.
 * Each test file calls getTestConnections() in beforeAll.
 */
export const GET_CONNECTIONS_OPTS = {
  schemas: EXPOSED_SCHEMAS,
  authRole: AUTH_ROLE,
  server: {
    api: {
      enableServicesApi: false,
    },
  },
} as const;

// --- Connection Helper ---

/**
 * Creates an isolated test database cloned from the constructive template.
 *
 * On first call, creates the template via pg_dump from the live constructive
 * DB (subsequent calls reuse the cached template). Each call then creates a
 * fresh database (db-<uuid>) using PostgreSQL's CREATE DATABASE ... TEMPLATE,
 * so every test file gets its own copy of the seed data.
 * The database is dropped automatically on teardown.
 */
export async function getTestConnections(): Promise<GetConnectionsResult> {
  await ensureTemplate();
  return getConnections({
    ...GET_CONNECTIONS_OPTS,
    db: { template: TEMPLATE_DB },
  }, []);
}

// --- GraphQL Fragments ---

/** Standard connection fields for list queries */
export const CONNECTION_FIELDS = 'totalCount pageInfo { hasNextPage hasPreviousPage }';

// --- Auth Helpers ---

/**
 * Signs in with the given credentials and returns the access token.
 *
 * Uses the email-based signIn mutation from constructive_auth_public.
 * V5 result path: signIn.result.accessToken (NOT signInRecord).
 * Does NOT request sessionId (not present on SignInRecord in V5).
 */
export async function signIn(
  queryFn: GraphQLQueryFn,
  email: string = ADMIN_EMAIL,
  password: string = ADMIN_PASSWORD
): Promise<string> {
  const res = await queryFn<{
    signIn: { result: { accessToken: string; userId: string; isVerified: boolean } };
  }>(
    `mutation SignIn($input: SignInInput!) {
      signIn(input: $input) {
        result {
          accessToken
          userId
          isVerified
        }
      }
    }`,
    { input: { email, password } }
  );

  if (res.errors?.length) {
    throw new Error(
      `signIn failed: ${res.errors.map((e) => e.message).join(', ')}`
    );
  }

  const token = res.data?.signIn?.result?.accessToken;
  if (!token) {
    throw new Error('signIn returned no accessToken');
  }

  return token;
}

/**
 * Wraps a query function to include the Authorization: Bearer header.
 * Returns a new GraphQLQueryFn that injects the token on every call.
 */
export function authenticatedQuery(
  queryFn: GraphQLQueryFn,
  token: string
): GraphQLQueryFn {
  return (query, variables, headers) =>
    queryFn(query, variables, {
      ...headers,
      Authorization: `Bearer ${token}`,
    });
}

// --- Error Classification ---

/** Returns true if the error message indicates a GraphQL schema validation failure. */
export const isSchemaValidationError = (message: string): boolean =>
  message.includes('Cannot query field') ||
  message.includes('Unknown argument') ||
  message.includes('Syntax Error') ||
  message.includes('Expected type');

/**
 * Asserts that errors represent a known runtime failure, NOT a schema break.
 *
 * Rejects schema validation errors (which would indicate a regression).
 * Accepts either:
 *   - A message containing ALL of the expectedFragments (raw DB error detail)
 *   - A masked runtime error ("An unexpected error occurred. Reference: ...")
 */
export function expectKnownRuntimeError(
  errors: readonly any[] | undefined,
  expectedFragments: string | string[]
): void {
  expect(errors).toBeDefined();
  expect(errors!.length).toBeGreaterThan(0);

  const fragments = Array.isArray(expectedFragments)
    ? expectedFragments
    : [expectedFragments];

  const messages = errors!.map((e) => String(e?.message ?? ''));
  const hasSchemaError = messages.some(isSchemaValidationError);
  expect(hasSchemaError).toBe(false);

  const hasExpectedDetail = messages.some((message) =>
    fragments.every((fragment) => message.includes(fragment))
  );
  const hasMaskedRuntimeError = messages.some((message) =>
    message.startsWith('An unexpected error occurred. Reference:')
  );

  expect(hasExpectedDetail || hasMaskedRuntimeError).toBe(true);
}

// --- Assertion Helpers ---

/**
 * Executes a query and asserts no GraphQL errors occurred.
 * Returns the data portion of the response.
 */
export async function expectSuccess<T = any>(
  queryFn: GraphQLQueryFn,
  gql: string,
  variables?: Record<string, any>
): Promise<T> {
  const res: GraphQLResponse<T> = await queryFn(gql, variables);
  expect(res.errors).toBeUndefined();
  expect(res.data).toBeDefined();
  return res.data as T;
}

/**
 * Executes a query and asserts it returns errors.
 * Returns the errors array for further assertions.
 */
export async function expectError(
  queryFn: GraphQLQueryFn,
  gql: string,
  variables?: Record<string, any>
): Promise<readonly any[]> {
  const res = await queryFn(gql, variables);
  expect(res.errors).toBeDefined();
  expect(res.errors!.length).toBeGreaterThan(0);
  return res.errors!;
}
