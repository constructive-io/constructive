/**
 * Shared test utilities for constructive GraphQL server integration tests.
 *
 * All test files import from this module for constants, auth helpers,
 * and server configuration.
 *
 * IMPORTANT: This module does NOT set process.env.TEST_DB at the top level.
 * Use getTestConnections() which temporarily sets it during the call to
 * getConnections(), then restores the previous value.
 */

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

/** Database name (constructive, NOT constructive_db) */
export const DATABASE_NAME = 'constructive';

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
 * Wrapper around getConnections that temporarily sets TEST_DB to 'constructive'
 * for the duration of the call, then restores the previous value.
 *
 * This avoids a global side effect that would break other test suites
 * (e.g., server-test.test.ts which expects its own fresh database).
 */
export async function getTestConnections(): Promise<GetConnectionsResult> {
  const prev = process.env.TEST_DB;
  process.env.TEST_DB = DATABASE_NAME;
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
