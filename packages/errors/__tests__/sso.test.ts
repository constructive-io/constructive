import { ConstructiveError, errors, getDefinition } from '../src';

const PUBLIC_SSO_CODES = [
  'INVALID_SSO_SITE_STATE',
  'INVALID_SSO_CALLBACK',
  'INVALID_SSO_RETURN_TARGET',
  'SSO_LOGIN_TRANSACTION_EXPIRED',
  'SSO_LOGIN_TRANSACTION_ALREADY_USED',
  'OAUTH_SIGN_IN_DISABLED',
  'OAUTH_AUTHORIZATION_CANCELLED',
  'INVALID_OAUTH_STATE',
  'INVALID_OAUTH_PKCE',
  'IDENTITY_PROVIDER_NOT_CONFIGURED',
  'IDENTITY_PROVIDER_UNSUPPORTED',
  'IDENTITY_PROVIDER_AUTHENTICATION_FAILED',
  'SSO_ACCOUNT_CONFLICT',
  'INVALID_SSO_HANDOFF',
  'SSO_HANDOFF_EXPIRED',
  'SSO_HANDOFF_ALREADY_USED'
] as const;

describe('OAuth/SSO error contract', () => {
  it.each(PUBLIC_SSO_CODES)('registers %s as a stable public error', code => {
    const definition = getDefinition(code);
    expect(definition).toMatchObject({ code, class: 'public' });
    expect(definition?.message).not.toEqual(code);
  });

  it('preserves a cause without exposing it in transport extensions', () => {
    const cause = new Error('provider response contained a secret');
    const error = errors.INVALID_OAUTH_STATE(undefined, undefined, { cause });

    expect(error).toBeInstanceOf(ConstructiveError);
    expect(error.cause).toBe(cause);
    expect(error.toExtensions()).toEqual({
      code: 'INVALID_OAUTH_STATE',
      class: 'public',
      http: 400
    });
  });
});
