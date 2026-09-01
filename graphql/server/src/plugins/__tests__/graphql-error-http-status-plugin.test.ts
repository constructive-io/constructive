import { resolveGraphQLErrorHttpStatus } from '../graphql-error-http-status-plugin';

const configuredCodes = new Set([
  'DATABASE_BILLING_SUSPENDED',
  'DATABASE_ACCESS_POLICY_UNAVAILABLE'
]);

const response = (value: unknown): Buffer => Buffer.from(JSON.stringify(value), 'utf8');

describe('GraphQL execution-error HTTP status mapping', () => {
  it('maps configured registered codes to their exact HTTP status', () => {
    expect(resolveGraphQLErrorHttpStatus(response({
      errors: [{ extensions: { code: 'DATABASE_BILLING_SUSPENDED' } }]
    }), configuredCodes)).toBe(402);

    expect(resolveGraphQLErrorHttpStatus(response({
      errors: [{ extensions: { code: 'DATABASE_ACCESS_POLICY_UNAVAILABLE' } }]
    }), configuredCodes)).toBe(503);
  });

  it('prefers service failure when an operation contains both errors', () => {
    expect(resolveGraphQLErrorHttpStatus(response({
      errors: [
        { extensions: { code: 'DATABASE_BILLING_SUSPENDED' } },
        { extensions: { code: 'DATABASE_ACCESS_POLICY_UNAVAILABLE' } }
      ]
    }), configuredCodes)).toBe(503);
  });

  it('leaves unconfigured, successful, and malformed responses unchanged', () => {
    expect(resolveGraphQLErrorHttpStatus(response({
      errors: [{ extensions: { code: 'LIMIT_REACHED' } }]
    }), configuredCodes)).toBeUndefined();
    expect(resolveGraphQLErrorHttpStatus(response({ data: { ok: true } }), configuredCodes))
      .toBeUndefined();
    expect(resolveGraphQLErrorHttpStatus(Buffer.from('not-json'), configuredCodes))
      .toBeUndefined();
  });
});
