/**
 * Shared test utilities for GraphQL integration tests.
 *
 * These utilities start an INTERNAL constructive server using the
 * graphql-server-test framework (getConnections + seed).
 * Requests are made via supertest against the in-process HTTP server.
 *
 * Usage:
 *   import { setupTestServer, postGraphQL, signIn } from './test-utils';
 *
 * Prerequisites:
 *   - constructive database must exist and be accessible
 */

import net from 'net';
import { getConnections, seed } from '../src';
import type { ServerInfo } from '../src/types';
import type supertest from 'supertest';
import type { PgTestClient } from 'pgsql-test';

// ---------------------------------------------------------------------------
// DYNAMIC PORT SECTION - START
// This section provides dynamic port utilities.
// To remove: delete this section. The server already uses port 0 (OS-assigned).
// ---------------------------------------------------------------------------

/**
 * Find an unused TCP port on the local machine.
 * Reserved for future use -- createTestServer already uses port 0 by default.
 */
export async function getUnusedPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// DYNAMIC PORT SECTION - END
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default admin credentials for sign-in. */
export const TEST_CREDENTIALS = {
  email: 'admin@constructive.io',
  password: 'admin123!@Constructive',
} as const;

/** Prefix applied to all test-generated entity names. */
export const TEST_PREFIX = '__test_integration_';

/** Default Jest timeout for integration tests (ms). */
export const TEST_TIMEOUT = 30_000;

/**
 * Schemas exposed by the "public" API (api.localhost) in the constructive DB.
 * These map to the constructive_*_public schemas plus metaschema and services.
 */
const EXPOSED_SCHEMAS = [
  'constructive_auth_public',
  'constructive_invites_public',
  'constructive_limits_public',
  'constructive_logging_public',
  'constructive_memberships_public',
  'constructive_permissions_public',
  'constructive_public',
  'constructive_status_public',
  'constructive_user_identifiers_public',
  'constructive_users_public',
  'metaschema_modules_public',
  'metaschema_public',
  'services_public',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Everything a test suite needs from setupTestServer(). */
export interface TestContext {
  server: ServerInfo;
  request: supertest.Agent;
  pg: PgTestClient;
  teardown: () => Promise<void>;
}

/** Shape returned by a successful signIn call. */
export interface AuthResult {
  token: string;
  userId: string;
  sessionId: string;
}

// ---------------------------------------------------------------------------
// setupTestServer
// ---------------------------------------------------------------------------

/**
 * Start an internal constructive GraphQL server for testing.
 *
 * Uses getConnections (which wraps pgsql-test + createTestServer +
 * createSuperTestAgent) to start a server against the live constructive
 * database. The TEST_DB env var tells pgsql-test to reuse the existing
 * database instead of creating a new one. Teardown uses keepDb to avoid
 * dropping the live database.
 *
 * @example
 * ```ts
 * let ctx: TestContext;
 * beforeAll(async () => { ctx = await setupTestServer(); });
 * afterAll(async () => { await ctx.teardown(); });
 * ```
 */
export async function setupTestServer(): Promise<TestContext> {
  // Tell pgsql-test to reuse the existing constructive database.
  // Save and restore the original value so it doesn't leak into
  // other test suites running in the same process (--runInBand).
  const origTestDb = process.env.TEST_DB;
  process.env.TEST_DB = process.env.TEST_DB || 'constructive';

  const result = await getConnections(
    {
      schemas: EXPOSED_SCHEMAS,
      server: {
        api: {
          enableServicesApi: false,
          isPublic: false,
        },
      },
    },
    [seed.fn(async () => { /* no-op: use existing data */ })],
  );

  return {
    server: result.server,
    request: result.request,
    pg: result.pg,
    teardown: async () => {
      // Only stop the HTTP server. Do NOT call result.teardown() because
      // the server-test wrapper calls dbTeardown() without keepDb, which
      // would DROP the live constructive database. jest forceExit handles
      // remaining pool cleanup.
      await result.server.stop();

      // Restore TEST_DB so subsequent suites get fresh databases
      if (origTestDb === undefined) {
        delete process.env.TEST_DB;
      } else {
        process.env.TEST_DB = origTestDb;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// postGraphQL
// ---------------------------------------------------------------------------

/**
 * Send a GraphQL request via supertest.
 *
 * @param request  - supertest.Agent from setupTestServer().
 * @param payload  - { query, variables? } object.
 * @param token    - Optional bearer token for authenticated requests.
 * @returns supertest response (res.status, res.body).
 */
export function postGraphQL(
  request: supertest.Agent,
  payload: { query: string; variables?: Record<string, unknown> },
  token?: string,
) {
  let req = request.post('/graphql');
  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }
  return req.send(payload);
}

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------

const SIGN_IN_MUTATION = /* GraphQL */ `
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      result {
        id
        userId
        accessToken
        accessTokenExpiresAt
      }
    }
  }
`;

/**
 * Authenticate against the internal server and return a bearer token.
 *
 * @param request  - supertest.Agent from setupTestServer().
 * @param email    - Account email (defaults to admin).
 * @param password - Account password (defaults to 'password').
 * @returns AuthResult with token, userId, sessionId.
 * @throws if sign-in fails.
 */
export async function signIn(
  request: supertest.Agent,
  email: string = TEST_CREDENTIALS.email,
  password: string = TEST_CREDENTIALS.password,
): Promise<AuthResult> {
  const res = await postGraphQL(request, {
    query: SIGN_IN_MUTATION,
    variables: {
      input: { email, password, rememberMe: false },
    },
  });

  if (res.body.errors && res.body.errors.length > 0) {
    const messages = res.body.errors.map((e: any) => e.message).join('; ');
    throw new Error(`signIn failed for "${email}": ${messages}`);
  }

  const result = res.body.data?.signIn?.result;
  if (!result || !result.accessToken) {
    throw new Error(
      `signIn returned unexpected response for "${email}": ${JSON.stringify(res.body, null, 2)}`,
    );
  }

  return {
    token: result.accessToken,
    userId: result.userId,
    sessionId: result.id,
  };
}

// ---------------------------------------------------------------------------
// deleteEntity
// ---------------------------------------------------------------------------

/**
 * Delete an entity by ID using the conventional delete<Entity> mutation.
 *
 * @param request       - supertest.Agent from setupTestServer().
 * @param mutationName  - e.g. "deleteOrganization".
 * @param inputType     - e.g. "DeleteOrganizationInput".
 * @param id            - Node ID of the entity.
 * @param token         - Bearer token.
 * @param returnField   - Return field name (defaults to "deleted<Entity>Id").
 */
export function deleteEntity(
  request: supertest.Agent,
  mutationName: string,
  inputType: string,
  id: string,
  token: string,
  returnField: string = `deleted${mutationName.replace('delete', '')}Id`,
) {
  const mutation = /* GraphQL */ `
    mutation Delete($input: ${inputType}!) {
      ${mutationName}(input: $input) {
        ${returnField}
      }
    }
  `;

  return postGraphQL(
    request,
    { query: mutation, variables: { input: { id } } },
    token,
  );
}

// ---------------------------------------------------------------------------
// Test data generators
// ---------------------------------------------------------------------------

/**
 * Generate a unique, prefixed name suitable for test entities.
 */
export function testName(base: string): string {
  return `${TEST_PREFIX}${base}_${Date.now()}`;
}

// ---------------------------------------------------------------------------
// queryDb
// ---------------------------------------------------------------------------

/**
 * Run a SQL query against the test database and return rows.
 * Uses the superuser pg client which bypasses RLS.
 */
export async function queryDb<T = any>(
  pg: PgTestClient,
  sql: string,
  values?: any[],
): Promise<T[]> {
  const result = await pg.query(sql, values);
  return result.rows;
}
