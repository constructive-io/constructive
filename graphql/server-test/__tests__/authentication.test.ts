/**
 * Authentication Module - Integration Tests
 *
 * Covers: signIn, signUp, signOut, extendTokenExpires, forgotPassword,
 * resetPassword, verifyEmail, sendVerificationEmail, currentUser, currentUserId.
 *
 * V5 patterns:
 *   - signIn uses `email` (not `username`)
 *   - signIn returns `{ result { id, sessionId, userId, accessToken } }`
 *   - extendTokenExpires returns `result` (singular, not `results`), no accessToken
 *
 * Run:
 *   pnpm test -- --testPathPattern=authentication
 */

import {
  setupTestServer,
  postGraphQL,
  signIn,
  deleteEntity,
  testName,
  queryDb,
  TEST_TIMEOUT,
  TEST_CREDENTIALS,
  type TestContext,
  type AuthResult,
} from './test-utils';

jest.setTimeout(TEST_TIMEOUT);

// ---------------------------------------------------------------------------
// GraphQL operations
// ---------------------------------------------------------------------------

const SIGN_IN = /* GraphQL */ `
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      result {
        id
        sessionId
        userId
        accessToken
        accessTokenExpiresAt
        isVerified
        totpEnabled
      }
    }
  }
`;

const SIGN_UP = /* GraphQL */ `
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      result {
        id
        sessionId
        userId
        accessToken
        accessTokenExpiresAt
        isVerified
        totpEnabled
      }
    }
  }
`;

const SIGN_OUT = /* GraphQL */ `
  mutation SignOut($input: SignOutInput!) {
    signOut(input: $input) {
      clientMutationId
    }
  }
`;

const EXTEND_TOKEN = /* GraphQL */ `
  mutation ExtendToken($input: ExtendTokenExpiresInput!) {
    extendTokenExpires(input: $input) {
      result {
        id
        sessionId
        expiresAt
      }
    }
  }
`;

const FORGOT_PASSWORD = /* GraphQL */ `
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input) {
      clientMutationId
    }
  }
`;

const RESET_PASSWORD = /* GraphQL */ `
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) {
      clientMutationId
    }
  }
`;

const VERIFY_EMAIL = /* GraphQL */ `
  mutation VerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) {
      clientMutationId
    }
  }
`;

const SEND_VERIFICATION_EMAIL = /* GraphQL */ `
  mutation SendVerificationEmail($input: SendVerificationEmailInput!) {
    sendVerificationEmail(input: $input) {
      clientMutationId
    }
  }
`;

const CURRENT_USER = /* GraphQL */ `
  query CurrentUser {
    currentUser {
      id
      username
      displayName
      type
      createdAt
      updatedAt
    }
  }
`;

const CURRENT_USER_ID = /* GraphQL */ `
  query CurrentUserId {
    currentUserId
  }
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Authentication', () => {
  let ctx: TestContext;
  let auth: AuthResult;

  // IDs of entities created during tests, for cleanup
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    ctx = await setupTestServer();
    auth = await signIn(ctx.request);
  });

  afterAll(async () => {
    // Clean up users created by signUp tests
    for (const id of createdUserIds) {
      try {
        await postGraphQL(
          ctx.request,
          {
            query: /* GraphQL */ `
              mutation DeleteUser($input: DeleteUserInput!) {
                deleteUser(input: $input) { user { id } }
              }
            `,
            variables: { input: { id } },
          },
          auth.token,
        );
      } catch {
        // best-effort cleanup
      }
    }
    await ctx.teardown();
  });

  // -------------------------------------------------------------------------
  // signIn
  // -------------------------------------------------------------------------

  it('should sign in with valid admin credentials and return accessToken', async () => {
    const res = await postGraphQL(ctx.request, {
      query: SIGN_IN,
      variables: {
        input: {
          email: TEST_CREDENTIALS.email,
          password: TEST_CREDENTIALS.password,
          rememberMe: false,
        },
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const result = res.body.data?.signIn?.result;
    expect(result).toBeDefined();
    expect(result.accessToken).toBeTruthy();
    expect(result.userId).toBeTruthy();
    expect(result.sessionId).toBeTruthy();
    expect(result.id).toBeTruthy();
    expect(typeof result.accessToken).toBe('string');
    expect(result.userId).toBe('00000000-0000-0000-0000-000000000002');
  });

  it('should fail signIn with bad password', async () => {
    const res = await postGraphQL(ctx.request, {
      query: SIGN_IN,
      variables: {
        input: {
          email: TEST_CREDENTIALS.email,
          password: 'wrong_password_here',
          rememberMe: false,
        },
      },
    });

    expect(res.status).toBe(200);
    const hasErrors =
      (res.body.errors && res.body.errors.length > 0) ||
      res.body.data?.signIn?.result === null;
    expect(hasErrors).toBe(true);
  });

  it('should fail signIn with non-existent email', async () => {
    const res = await postGraphQL(ctx.request, {
      query: SIGN_IN,
      variables: {
        input: {
          email: 'nonexistent_user_99@example.com',
          password: 'doesntmatter',
          rememberMe: false,
        },
      },
    });

    expect(res.status).toBe(200);
    const hasErrors =
      (res.body.errors && res.body.errors.length > 0) ||
      res.body.data?.signIn?.result === null;
    expect(hasErrors).toBe(true);
  });

  // -------------------------------------------------------------------------
  // signUp
  // -------------------------------------------------------------------------

  it('should sign up a new user and return accessToken', async () => {
    const uniqueEmail = `${testName('signup')}@example.com`;

    const res = await postGraphQL(ctx.request, {
      query: SIGN_UP,
      variables: {
        input: {
          email: uniqueEmail,
          password: 'TestPassword123!',
          rememberMe: false,
        },
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const result = res.body.data?.signUp?.result;
    expect(result).toBeDefined();
    expect(result.accessToken).toBeTruthy();
    expect(result.userId).toBeTruthy();
    expect(result.sessionId).toBeTruthy();

    createdUserIds.push(result.userId);
  });

  // -------------------------------------------------------------------------
  // signOut
  // -------------------------------------------------------------------------

  it('should sign out and invalidate the session token', async () => {
    // Create a fresh session specifically for sign-out testing
    const freshAuth = await signIn(ctx.request);

    const res = await postGraphQL(
      ctx.request,
      { query: SIGN_OUT, variables: { input: {} } },
      freshAuth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    // Verify the old token no longer resolves a user
    const verifyRes = await postGraphQL(
      ctx.request,
      { query: CURRENT_USER_ID },
      freshAuth.token,
    );

    expect(verifyRes.status).toBe(200);
    const isInvalid =
      verifyRes.body.data?.currentUserId === null ||
      (verifyRes.body.errors && verifyRes.body.errors.length > 0);
    expect(isInvalid).toBe(true);
  });

  // -------------------------------------------------------------------------
  // extendTokenExpires
  // -------------------------------------------------------------------------

  it('should extend token expiry and return session info', async () => {
    const res = await postGraphQL(
      ctx.request,
      { query: EXTEND_TOKEN, variables: { input: {} } },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const result = res.body.data?.extendTokenExpires?.result;
    expect(result).toBeDefined();
    expect(result.id).toBeTruthy();
    expect(result.sessionId).toBeTruthy();
    expect(result.expiresAt).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // forgotPassword
  // -------------------------------------------------------------------------

  it('should call forgotPassword with valid email without error', async () => {
    const res = await postGraphQL(ctx.request, {
      query: FORGOT_PASSWORD,
      variables: { input: { email: TEST_CREDENTIALS.email } },
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.forgotPassword).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // resetPassword (invalid token -- expect error)
  // -------------------------------------------------------------------------

  it('should reject resetPassword with invalid token', async () => {
    const res = await postGraphQL(ctx.request, {
      query: RESET_PASSWORD,
      variables: {
        input: {
          roleId: '00000000-0000-0000-0000-000000000002',
          resetToken: 'invalid-token-does-not-exist',
          newPassword: 'SomeNewPassword123!',
        },
      },
    });

    expect(res.status).toBe(200);
    // Should error because the token is invalid
    const hasError =
      (res.body.errors && res.body.errors.length > 0) ||
      res.body.data?.resetPassword === null;
    expect(hasError).toBe(true);
  });

  // -------------------------------------------------------------------------
  // verifyEmail (invalid token -- expect error)
  // -------------------------------------------------------------------------

  it('should reject verifyEmail with invalid token', async () => {
    const res = await postGraphQL(ctx.request, {
      query: VERIFY_EMAIL,
      variables: {
        input: {
          emailId: '00000000-0000-0000-0000-000000000000',
          token: 'invalid-verification-token',
        },
      },
    });

    expect(res.status).toBe(200);
    const hasError =
      (res.body.errors && res.body.errors.length > 0) ||
      res.body.data?.verifyEmail === null;
    expect(hasError).toBe(true);
  });

  // -------------------------------------------------------------------------
  // sendVerificationEmail
  // -------------------------------------------------------------------------

  it('should call sendVerificationEmail without schema error', async () => {
    const res = await postGraphQL(
      ctx.request,
      { query: SEND_VERIFICATION_EMAIL, variables: { input: {} } },
      auth.token,
    );

    expect(res.status).toBe(200);
    // The mutation may or may not succeed depending on email config,
    // but the schema should accept the operation
    expect(res.body.data?.sendVerificationEmail).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // currentUser
  // -------------------------------------------------------------------------

  it('should return authenticated admin user via currentUser', async () => {
    const res = await postGraphQL(
      ctx.request,
      { query: CURRENT_USER },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const user = res.body.data?.currentUser;
    expect(user).toBeDefined();
    expect(user.id).toBe('00000000-0000-0000-0000-000000000002');
    expect(user.username).toBeTruthy();
    expect(user.type).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // currentUserId
  // -------------------------------------------------------------------------

  it('should return admin UUID via currentUserId', async () => {
    const res = await postGraphQL(
      ctx.request,
      { query: CURRENT_USER_ID },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.currentUserId).toBe(
      '00000000-0000-0000-0000-000000000002',
    );
  });

  it('should return null currentUserId without auth token', async () => {
    const res = await postGraphQL(ctx.request, { query: CURRENT_USER_ID });

    expect(res.status).toBe(200);
    expect(res.body.data?.currentUserId).toBeNull();
  });
});
