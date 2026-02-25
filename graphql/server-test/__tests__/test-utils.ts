/**
 * Shared test utilities for constructive GraphQL server integration tests.
 *
 * All test files import from this module for constants, auth helpers,
 * and server configuration. This file is owned by Phase 3a and must not
 * be modified by other phases (except Phase 4 fixes).
 */

import { getConnections } from '../src';
import type { GraphQLQueryFn, GraphQLResponse, GetConnectionsResult } from '../src/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Admin credentials seeded by constructive-local */
export const ADMIN_EMAIL = 'admin@constructive.io';
export const ADMIN_PASSWORD = 'admin123!@Constructive';
export const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000002';

/** Database name (constructive, NOT constructive_db) */
export const DATABASE_NAME = 'constructive';

/** Default role used by the test server (anonymous role for this DB) */
export const AUTH_ROLE = 'administrator';

/**
 * The 13 schemas exposed by the api.localhost 'public' endpoint.
 * Sourced from services_public.api_schemas JOIN metaschema_public.schema
 * for the constructive database, api name = 'public'.
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
 * Each test file calls getConnections(GET_CONNECTIONS_OPTS) in beforeAll.
 *
 * CRITICAL: Run tests with TEST_DB=constructive so pgsql-test uses the
 * real constructive database (which has all schemas, tables, and seed data)
 * instead of creating a blank database.
 *
 * The per-test savepoint rollback (beforeEach/afterEach) ensures test isolation.
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

/**
 * Wrapper around getConnections that temporarily sets TEST_DB=constructive
 * so pgsql-test uses the existing constructive database instead of creating
 * a blank one. The env var is restored after the call to avoid polluting
 * other test suites that run in the same Jest process.
 */
export async function getTestConnections(): Promise<GetConnectionsResult> {
  const prev = process.env.TEST_DB;
  process.env.TEST_DB = 'constructive';
  try {
    return await getConnections(GET_CONNECTIONS_OPTS);
  } finally {
    if (prev === undefined) {
      delete process.env.TEST_DB;
    } else {
      process.env.TEST_DB = prev;
    }
  }
}

// ---------------------------------------------------------------------------
// GraphQL Fragments
// ---------------------------------------------------------------------------

/** Standard connection fields for list queries */
export const CONNECTION_FIELDS = 'totalCount pageInfo { hasNextPage hasPreviousPage }';

// ---------------------------------------------------------------------------
// Auth Helpers
// ---------------------------------------------------------------------------

/**
 * Sign in as admin and return the access token.
 *
 * Uses the email-based signIn mutation from constructive_auth_public.
 * V5: uses 'email' not 'username'; SignInRecord has NO sessionId.
 *
 * @param queryFn - The GraphQL query function from getConnections
 * @param email   - Email to sign in with (defaults to ADMIN_EMAIL)
 * @param password - Password (defaults to ADMIN_PASSWORD)
 * @returns The accessToken string
 * @throws If signIn returns errors or no accessToken
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
    throw new Error(`signIn failed: ${res.errors.map((e) => e.message).join(', ')}`);
  }

  const token = res.data?.signIn?.result?.accessToken;
  if (!token) {
    throw new Error('signIn returned no accessToken');
  }

  return token;
}

/**
 * Wrap a query function to include the Authorization header.
 * Returns a new GraphQLQueryFn that injects Bearer <token>.
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

// ---------------------------------------------------------------------------
// Assertion Helpers
// ---------------------------------------------------------------------------

/**
 * Execute a query and assert no GraphQL errors occurred.
 * Returns the data portion of the response.
 */
export async function expectSuccess<T = any>(
  queryFn: GraphQLQueryFn,
  gql: string,
  variables?: Record<string, any>
): Promise<T> {
  const res: GraphQLResponse<T> = await queryFn(gql, variables);
  if (res.errors) {
    throw new Error(
      `Expected success but got errors:\n${JSON.stringify(res.errors, null, 2)}`
    );
  }
  expect(res.data).toBeDefined();
  return res.data as T;
}

/**
 * Execute a query and assert it returns errors.
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
