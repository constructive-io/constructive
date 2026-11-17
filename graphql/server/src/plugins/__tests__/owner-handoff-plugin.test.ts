import { GraphQLError } from 'graphql';

import { formatError } from '../../middleware/format-error';
import { mintTenantOwnerHandoff, type OwnerHandoffInput } from '../owner-handoff-plugin';

const userId = '0192f0c4-1d2e-7c3a-9b4d-5e6f7a8b9c0d';
const otherUserId = '0192f0c4-1d2e-7c3a-9b4d-5e6f7a8b9c0e';
const databaseId = '0192f0c4-1d2e-7c3a-9b4d-5e6f7a8b9c0f';
const codeChallenge = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ';

type Statement = { text: string; values?: unknown[] };
type Response = { rows: Array<Record<string, unknown>> };

const input = (overrides: Partial<OwnerHandoffInput> = {}): OwnerHandoffInput => ({
  userId,
  platformAuthSchema: 'platform_auth_private',
  databaseId,
  codeChallenge,
  ...overrides
});

const ownerRow = { rows: [{ owner_id: userId }] };
const evidenceRow = {
  rows: [{ method: 'email', identifier: 'owner@example.com', user_id: userId }]
};
const tenantAuthSchemaRow = { rows: [{ schema_name: 'constructive_auth_private' }] };
const servedSchemaRow = { rows: [{ '?column?': 1 }] };
const handoffCodeRow = { rows: [{ code: 'handoff-code' }] };

const signedInRow = (overrides: Record<string, unknown> = {}): Response => ({
  rows: [
    {
      user_id: userId,
      access_token: 'cnc_live_bt_test',
      mfa_required: false,
      mfa_setup_required: false,
      device_approval_required: false,
      mfa_challenge_token: null,
      out_device_token: null,
      ...overrides
    }
  ]
});

const fakeClient = (...responses: Response[]) => {
  const statements: Statement[] = [];
  return {
    statements,
    query: async (statement: Statement) => {
      statements.push(statement);
      const response = responses.shift();
      if (!response) throw new Error(`unexpected query: ${statement.text}`);
      return response;
    }
  };
};

const findStatement = (statements: Statement[], fragment: string): Statement => {
  const statement = statements.find((candidate) => candidate.text.includes(fragment));
  if (!statement) throw new Error(`no statement containing ${fragment}`);
  return statement;
};

const expectNoStatement = (statements: Statement[], fragment: string): void => {
  expect(statements.some((statement) => statement.text.includes(fragment))).toBe(false);
};

describe('mintTenantOwnerHandoff', () => {
  it('deletes the evidence row selected for this session instead of marking it consumed', async () => {
    const client = fakeClient(
      ownerRow,
      evidenceRow,
      tenantAuthSchemaRow,
      servedSchemaRow,
      signedInRow(),
      handoffCodeRow
    );

    const result = await mintTenantOwnerHandoff(client, input());

    expect(result.code).toBe('handoff-code');
    const spend = findStatement(client.statements, 'sign_in_evidence');
    expect(spend.text).toContain('DELETE FROM platform_auth_private.sign_in_evidence AS evidence');
    expect(spend.text).toContain('candidate.session_id = jwt_private.current_session_id()');
    expect(spend.text).not.toContain('credential_id');
    expect(spend.text).not.toContain('consumed_at');
    expect(spend.values).toEqual([userId]);
  });

  it('reports a missing proof as STEP_UP_REQUIRED that reaches the client extensions.code', async () => {
    const client = fakeClient(ownerRow, { rows: [] });

    const refusal = await mintTenantOwnerHandoff(client, input()).then(
      () => {
        throw new Error('expected the hand-off to refuse');
      },
      (error: Error & { extensions?: Record<string, unknown> }) => error
    );

    expect(refusal).toMatchObject({ extensions: { code: 'STEP_UP_REQUIRED' } });
    const formatted = formatError(
      new GraphQLError(refusal.message, {
        path: ['mintTenantOwnerHandoff'],
        originalError: refusal
      })
    );
    expect(formatted.extensions?.code).toBe('STEP_UP_REQUIRED');
  });

  it('refuses an MFA challenge minted for another tenant user', async () => {
    const client = fakeClient(
      ownerRow,
      evidenceRow,
      tenantAuthSchemaRow,
      servedSchemaRow,
      signedInRow({
        user_id: otherUserId,
        mfa_required: true,
        mfa_challenge_token: 'challenge-for-another-user',
        out_device_token: 'device-for-another-user'
      })
    );

    await expect(mintTenantOwnerHandoff(client, input())).rejects.toMatchObject({
      extensions: { code: 'OWNER_MISMATCH' }
    });
    expectNoStatement(client.statements, 'mint_native_handoff');
  });

  it('returns a pending challenge to the caller it belongs to', async () => {
    const client = fakeClient(
      ownerRow,
      evidenceRow,
      tenantAuthSchemaRow,
      servedSchemaRow,
      signedInRow({
        mfa_required: true,
        mfa_challenge_token: 'challenge',
        out_device_token: 'device-token'
      })
    );

    const result = await mintTenantOwnerHandoff(client, input());

    expect(result).toMatchObject({
      code: null,
      userId,
      mfaRequired: true,
      mfaChallengeToken: 'challenge',
      deviceToken: 'device-token'
    });
    expectNoStatement(client.statements, 'mint_native_handoff');
  });

  it('passes the device token to the tenant procedure so an approved device is reused', async () => {
    const withToken = fakeClient(
      ownerRow,
      evidenceRow,
      tenantAuthSchemaRow,
      servedSchemaRow,
      signedInRow(),
      handoffCodeRow
    );
    await mintTenantOwnerHandoff(withToken, input({ deviceToken: 'approved-device-token' }));

    const signIn = findStatement(withToken.statements, 'sign_in_platform_identity');
    expect(signIn.text).toBe(
      'SELECT * FROM constructive_auth_private.sign_in_platform_identity($1, $2, \'bearer\', false, $3)'
    );
    expect(signIn.values).toEqual(['email', 'owner@example.com', 'approved-device-token']);

    const withoutToken = fakeClient(
      ownerRow,
      evidenceRow,
      tenantAuthSchemaRow,
      servedSchemaRow,
      signedInRow(),
      handoffCodeRow
    );
    await mintTenantOwnerHandoff(withoutToken, input());

    const signInWithoutToken = findStatement(withoutToken.statements, 'sign_in_platform_identity');
    expect(signInWithoutToken.values).toEqual(['email', 'owner@example.com', null]);
  });

  it('refuses a tenant auth schema that is not in this server database', async () => {
    const client = fakeClient(ownerRow, evidenceRow, tenantAuthSchemaRow, { rows: [] });

    await expect(mintTenantOwnerHandoff(client, input())).rejects.toMatchObject({
      extensions: { code: 'TENANT_AUTH_NOT_IN_SERVED_DATABASE' }
    });
    expectNoStatement(client.statements, 'sign_in_platform_identity');
  });
});
