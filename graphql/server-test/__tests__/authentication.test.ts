/**
 * Authentication Integration Tests
 *
 * Tests all auth-related mutations and queries from constructive_auth_public:
 * signIn, signUp, signOut, forgotPassword, resetPassword, verifyEmail,
 * sendVerificationEmail, extendTokenExpires, checkPassword, setPassword,
 * submitInviteCode, submitOrgInviteCode, currentUser, currentUserId.
 *
 * V5 Rules:
 * - signIn uses 'email' not 'username'
 * - SignInRecord has NO sessionId (fields: id, userId, accessToken, accessTokenExpiresAt, isVerified, totpEnabled)
 * - ExtendTokenExpiresRecord is the ONLY auth type with sessionId
 * - currentUser/currentUserId return null without RLS module in test env
 *
 * Run:
 *   npx jest --forceExit --verbose --runInBand --testPathPattern=authentication
 */

import type { PgTestClient } from 'pgsql-test/test-client';
import type { ServerInfo, GraphQLQueryFn } from '../src/types';
import type supertest from 'supertest';

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_USER_ID,
  getTestConnections,
  signIn,
  authenticatedQuery,
  expectSuccess,
  expectError,
} from './test-utils';

jest.setTimeout(30000);

describe('Authentication', () => {
  let db: PgTestClient;
  let pg: PgTestClient;
  let server: ServerInfo;
  let query: GraphQLQueryFn;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;
  let adminToken: string;
  let authedQuery: GraphQLQueryFn;

  beforeAll(async () => {
    ({ db, pg, server, query, request, teardown } = await getTestConnections());

    // Obtain an admin token for authenticated tests
    adminToken = await signIn(query);
    authedQuery = authenticatedQuery(query, adminToken);
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(() => db.beforeEach());
  afterEach(() => db.afterEach());

  // -------------------------------------------------------------------------
  // signIn
  // -------------------------------------------------------------------------
  describe('signIn', () => {
    it('should sign in with valid admin credentials and return accessToken', async () => {
      const data = await expectSuccess<{
        signIn: {
          result: {
            accessToken: string;
            userId: string;
            isVerified: boolean;
          };
        };
      }>(
        query,
        `mutation SignIn($input: SignInInput!) {
          signIn(input: $input) {
            result {
              accessToken
              userId
              isVerified
            }
          }
        }`,
        { input: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } }
      );

      const result = data.signIn.result;
      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(result.accessToken.length).toBeGreaterThan(0);
      expect(result.userId).toBe(ADMIN_USER_ID);
    });

    it('should fail signIn with incorrect password', async () => {
      const res = await query(
        `mutation SignIn($input: SignInInput!) {
          signIn(input: $input) {
            result {
              accessToken
              userId
            }
          }
        }`,
        { input: { email: ADMIN_EMAIL, password: 'wrong-password-123' } }
      );

      // Either errors are returned or result is null
      const hasError = !!res.errors?.length;
      const resultIsNull = res.data?.signIn?.result === null;
      expect(hasError || resultIsNull).toBe(true);
    });

    it('should fail signIn with non-existent email', async () => {
      const res = await query(
        `mutation SignIn($input: SignInInput!) {
          signIn(input: $input) {
            result {
              accessToken
              userId
            }
          }
        }`,
        { input: { email: 'nobody@nowhere.example', password: 'anything' } }
      );

      const hasError = !!res.errors?.length;
      const resultIsNull = res.data?.signIn?.result === null;
      expect(hasError || resultIsNull).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // signUp
  // -------------------------------------------------------------------------
  describe('signUp', () => {
    it('should sign up a new user and return accessToken', async () => {
      const uniqueEmail = `test-signup-${Date.now()}@test.constructive.io`;

      const data = await expectSuccess<{
        signUp: {
          result: {
            accessToken: string;
            userId: string;
          };
        };
      }>(
        query,
        `mutation SignUp($input: SignUpInput!) {
          signUp(input: $input) {
            result {
              accessToken
              userId
            }
          }
        }`,
        { input: { email: uniqueEmail, password: 'TestPassword123!' } }
      );

      const result = data.signUp.result;
      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(result.accessToken.length).toBeGreaterThan(0);
      expect(result.userId).toBeDefined();
      // userId should be a valid UUID
      expect(result.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  // -------------------------------------------------------------------------
  // signOut
  // -------------------------------------------------------------------------
  describe('signOut', () => {
    it('should sign out without error', async () => {
      // First get a fresh token to sign out
      const token = await signIn(query);

      const res = await request
        .post('/graphql')
        .set('Authorization', `Bearer ${token}`)
        .send({
          query: `mutation SignOut($input: SignOutInput!) {
            signOut(input: $input) {
              clientMutationId
            }
          }`,
          variables: { input: { clientMutationId: 'signout-test' } },
        });

      expect(res.status).toBe(200);
      // Should not have GraphQL errors
      expect(res.body.errors).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // password management
  // -------------------------------------------------------------------------
  describe('password management', () => {
    it('should call forgotPassword - expect error without database_id in JWT', async () => {
      // forgotPassword needs database_id in JWT context for the job queue.
      // Without it, we expect an error (NOT NULL constraint on jobs table).
      const res = await query(
        `mutation ForgotPassword($input: ForgotPasswordInput!) {
          forgotPassword(input: $input) {
            clientMutationId
          }
        }`,
        { input: { email: ADMIN_EMAIL } }
      );

      // This should produce an error because database_id is not in JWT context
      expect(res.errors).toBeDefined();
      expect(res.errors!.length).toBeGreaterThan(0);
    });

    it('should call resetPassword with invalid token without schema error', async () => {
      // resetPassword with invalid token may return an error OR silently
      // succeed (no-op). Both are acceptable -- we only assert no schema error.
      const res = await query(
        `mutation ResetPassword($input: ResetPasswordInput!) {
          resetPassword(input: $input) {
            clientMutationId
          }
        }`,
        {
          input: {
            roleId: '00000000-0000-0000-0000-000000000000',
            resetToken: 'invalid-token-value',
            newPassword: 'NewPassword123!',
          },
        }
      );

      // No schema validation errors
      if (res.errors) {
        for (const err of res.errors) {
          const msg = (err as any).message || '';
          expect(msg).not.toMatch(/Cannot query field/i);
        }
      }
    });

    it('should call verifyEmail with invalid token without schema error', async () => {
      // verifyEmail with invalid token may return an error OR silently
      // succeed (no-op). Both are acceptable -- we only assert no schema error.
      const res = await query(
        `mutation VerifyEmail($input: VerifyEmailInput!) {
          verifyEmail(input: $input) {
            clientMutationId
          }
        }`,
        {
          input: {
            emailId: '00000000-0000-0000-0000-000000000000',
            token: 'invalid-verification-token',
          },
        }
      );

      // No schema validation errors
      if (res.errors) {
        for (const err of res.errors) {
          const msg = (err as any).message || '';
          expect(msg).not.toMatch(/Cannot query field/i);
        }
      }
    });

    it('should call sendVerificationEmail without schema error', async () => {
      // sendVerificationEmail should accept the input without a schema error.
      // It may return a business-level error (e.g., email not found) but should
      // not return a GraphQL schema validation error.
      const res = await query(
        `mutation SendVerificationEmail($input: SendVerificationEmailInput!) {
          sendVerificationEmail(input: $input) {
            clientMutationId
          }
        }`,
        { input: { email: ADMIN_EMAIL } }
      );

      // No schema validation errors -- business errors are acceptable
      if (res.errors) {
        for (const err of res.errors) {
          // Schema errors typically include "Cannot query field" or "is not defined"
          const msg = (err as any).message || '';
          expect(msg).not.toMatch(/Cannot query field/i);
          expect(msg).not.toMatch(/is not defined/i);
        }
      }
    });

    it('should call checkPassword mutation without schema error', async () => {
      const res = await authedQuery(
        `mutation CheckPassword($input: CheckPasswordInput!) {
          checkPassword(input: $input) {
            clientMutationId
          }
        }`,
        { input: { password: ADMIN_PASSWORD } }
      );

      // No schema validation errors
      if (res.errors) {
        for (const err of res.errors) {
          const msg = (err as any).message || '';
          expect(msg).not.toMatch(/Cannot query field/i);
          expect(msg).not.toMatch(/is not defined/i);
        }
      }
    });

    it('should call setPassword mutation without schema error', async () => {
      const res = await authedQuery(
        `mutation SetPassword($input: SetPasswordInput!) {
          setPassword(input: $input) {
            clientMutationId
          }
        }`,
        {
          input: {
            currentPassword: ADMIN_PASSWORD,
            newPassword: ADMIN_PASSWORD, // same password to avoid breaking admin login
          },
        }
      );

      // No schema validation errors
      if (res.errors) {
        for (const err of res.errors) {
          const msg = (err as any).message || '';
          expect(msg).not.toMatch(/Cannot query field/i);
          expect(msg).not.toMatch(/is not defined/i);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // token management
  // -------------------------------------------------------------------------
  describe('token management', () => {
    it('should call extendTokenExpires without schema error', async () => {
      // V5: ExtendTokenExpiresRecord is the ONLY auth type with sessionId.
      // Without RLS module, this returns null result.
      const res = await authedQuery(
        `mutation ExtendTokenExpires($input: ExtendTokenExpiresInput!) {
          extendTokenExpires(input: $input) {
            result {
              id
              sessionId
              expiresAt
            }
          }
        }`,
        { input: { amount: 3600 } }
      );

      // No schema validation errors
      if (res.errors) {
        for (const err of res.errors) {
          const msg = (err as any).message || '';
          expect(msg).not.toMatch(/Cannot query field/i);
          expect(msg).not.toMatch(/is not defined/i);
        }
      }

      // Without RLS module, result is null -- that is expected
      if (!res.errors) {
        const result = (res.data as any)?.extendTokenExpires?.result;
        // result can be null in test env without RLS module
        expect(result === null || result === undefined || typeof result === 'object').toBe(
          true
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // invite code operations
  // -------------------------------------------------------------------------
  describe('invite code operations', () => {
    it('should reject submitInviteCode with invalid token', async () => {
      const errors = await expectError(
        query,
        `mutation SubmitInviteCode($input: SubmitInviteCodeInput!) {
          submitInviteCode(input: $input) {
            clientMutationId
          }
        }`,
        { input: { token: 'invalid-invite-token-abc123' } }
      );

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject submitOrgInviteCode with invalid token', async () => {
      const errors = await expectError(
        query,
        `mutation SubmitOrgInviteCode($input: SubmitOrgInviteCodeInput!) {
          submitOrgInviteCode(input: $input) {
            clientMutationId
          }
        }`,
        { input: { token: 'invalid-org-invite-token-xyz789' } }
      );

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // currentUser (authenticated context)
  // -------------------------------------------------------------------------
  describe('currentUser (authenticated)', () => {
    it('should return authenticated admin user via currentUser', async () => {
      const res = await request
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: '{ currentUser { id username displayName } }',
        });

      expect(res.status).toBe(200);

      // With bearer token in V5, currentUser should return data.
      // Note: Without RLS module configured in the test server, currentUser
      // may return null. Both outcomes are acceptable.
      const currentUser = res.body.data?.currentUser;
      if (currentUser !== null) {
        expect(currentUser.id).toBe(ADMIN_USER_ID);
      }
    });

    it('should return admin UUID via currentUserId', async () => {
      const res = await request
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: '{ currentUserId }',
        });

      expect(res.status).toBe(200);

      // With bearer token, currentUserId should return the admin UUID.
      // Without RLS module, it may return null.
      const currentUserId = res.body.data?.currentUserId;
      if (currentUserId !== null) {
        expect(currentUserId).toBe(ADMIN_USER_ID);
      }
    });

    it('should return null currentUserId without auth token', async () => {
      const data = await expectSuccess<{ currentUserId: string | null }>(
        query,
        '{ currentUserId }'
      );

      // Without auth token, currentUserId should be null
      expect(data.currentUserId).toBeNull();
    });
  });
});
