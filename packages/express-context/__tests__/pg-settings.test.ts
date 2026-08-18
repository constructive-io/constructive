import {
  assertCompletePgSettings,
  buildPgSettings,
  REQUIRED_PG_SETTING_KEYS,
  SECURITY_GUC_KEYS,
  withPgSettingsRole,
  withTrustedPgClaims,
} from '../src/pg-settings';
import type { ApiStructure, ConstructiveAPIToken } from '../src/types';

const api: ApiStructure = {
  apiId: 'api-1',
  dbname: 'testdb',
  anonRole: 'anonymous_runtime',
  roleName: 'authenticated_runtime',
  schema: ['public', 'app'],
  domains: [],
  databaseId: 'database-1',
  isPublic: true,
};

const token: ConstructiveAPIToken = {
  id: 'token-1',
  user_id: 'user-1',
  principal_id: 'principal-1',
  session_id: 'session-1',
  access_level: 'read_only',
  kind: 'api_token',
  email: 'primary@example.test',
  user_email: 'user@example.test',
  entity_id: 'entity-1',
  organization_id: 'organization-1',
  tenant_id: 'tenant-1',
  role_type: 'member',
};

describe('buildPgSettings', () => {
  it('builds a value-complete anonymous request context', () => {
    const settings = buildPgSettings({
      api,
      token: null,
      requestId: 'request-1',
    });

    expect(Object.keys(settings)).toEqual(
      expect.arrayContaining(REQUIRED_PG_SETTING_KEYS)
    );
    expect(settings.role).toBe('anonymous_runtime');
    expect(settings['request.id']).toBe('request-1');
    expect(settings.transaction_read_only).toBe('off');
    expect(settings.row_security).toBe('on');
    expect(settings.search_path).toBe('pg_catalog, "public", "app"');
    for (const key of SECURITY_GUC_KEYS) {
      expect(typeof settings[key]).toBe('string');
    }
    expect(settings['jwt.claims.user_id']).toBe('');
    expect(settings['jwt.claims.api_id']).toBe('api-1');
    expect(settings['jwt.claims.database_id']).toBe('database-1');
    expect(() => assertCompletePgSettings(settings)).not.toThrow();
  });

  it('maps every supported authenticated claim and trusted request fact', () => {
    const settings = buildPgSettings({
      api,
      token,
      requestId: 'request-2',
      clientIp: '192.0.2.10',
      origin: 'https://app.example.test',
      userAgent: 'test-agent/1.0',
      deviceToken: 'device-1',
    });

    expect(settings).toMatchObject({
      role: 'authenticated_runtime',
      'request.id': 'request-2',
      transaction_read_only: 'on',
      row_security: 'on',
      'jwt.claims.token_id': 'token-1',
      'jwt.claims.user_id': 'user-1',
      'jwt.claims.principal_id': 'principal-1',
      'jwt.claims.session_id': 'session-1',
      'jwt.claims.access_level': 'read_only',
      'jwt.claims.kind': 'api_token',
      'jwt.claims.email': 'primary@example.test',
      'jwt.claims.user_email': 'user@example.test',
      'jwt.claims.entity_id': 'entity-1',
      'jwt.claims.organization_id': 'organization-1',
      'jwt.claims.tenant_id': 'tenant-1',
      'jwt.claims.role_type': 'member',
      'jwt.claims.api_id': 'api-1',
      'jwt.claims.database_id': 'database-1',
      'jwt.claims.ip_address': '192.0.2.10',
      'jwt.claims.origin': 'https://app.example.test',
      'jwt.claims.user_agent': 'test-agent/1.0',
      'jwt.claims.device_token': 'device-1',
    });
  });

  it('represents every unavailable claim with an empty string', () => {
    const settings = buildPgSettings({
      api: { ...api, apiId: undefined, databaseId: undefined },
      token: null,
      requestId: '',
    });

    for (const key of SECURITY_GUC_KEYS) {
      expect(settings[key]).toBe('');
    }
  });

  it('does not retain authenticated claims or read-only state in a later anonymous request', () => {
    const authenticated = buildPgSettings({
      api,
      token,
      requestId: 'authenticated',
    });
    const anonymous = buildPgSettings({
      api,
      token: null,
      requestId: 'anonymous',
    });

    expect(authenticated['jwt.claims.user_id']).toBe('user-1');
    expect(authenticated.transaction_read_only).toBe('on');
    expect(anonymous['jwt.claims.user_id']).toBe('');
    expect(anonymous['jwt.claims.token_id']).toBe('');
    expect(anonymous.transaction_read_only).toBe('off');
  });

  it('returns an independent object for every request', () => {
    const first = buildPgSettings({ api, token: null, requestId: 'first' });
    const second = buildPgSettings({ api, token: null, requestId: 'second' });

    expect(first).not.toBe(second);
    first['jwt.claims.user_id'] = 'mutated';
    expect(second['jwt.claims.user_id']).toBe('');
  });

  it('builds a deterministic, deduplicated and quoted search path', () => {
    const settings = buildPgSettings({
      api,
      token: null,
      requestId: 'request-3',
      dependencySchemas: ['shared', 'strange"name', 'public', 'shared'],
    });

    expect(settings.search_path).toBe(
      'pg_catalog, "shared", "strange""name", "public", "app"'
    );
  });

  it('derives principal_id from user_id when no explicit principal exists', () => {
    const settings = buildPgSettings({
      api,
      token: { user_id: 'user-fallback' },
      requestId: 'request-4',
    });

    expect(settings['jwt.claims.principal_id']).toBe('user-fallback');
  });

  it('accepts allowlisted trusted claims without mutating either input', () => {
    const trustedClaims = { 'jwt.claims.entity_id': 'trusted-entity' } as const;
    const settings = buildPgSettings({
      api,
      token: null,
      requestId: 'request-5',
      trustedClaims,
    });
    const derived = withTrustedPgClaims(settings, {
      'jwt.claims.user_id': 'trusted-user',
    });

    expect(settings['jwt.claims.entity_id']).toBe('trusted-entity');
    expect(settings['jwt.claims.user_id']).toBe('');
    expect(derived['jwt.claims.user_id']).toBe('trusted-user');
    expect(derived).not.toBe(settings);
    expect(trustedClaims).toEqual({ 'jwt.claims.entity_id': 'trusted-entity' });
  });

  it.each([
    ['arbitrary setting', { role: 'postgres' }],
    ['non-string value', { 'jwt.claims.user_id': null }],
    ['array', []],
    ['null', null],
  ])('rejects invalid trusted claims: %s', (_label, trustedClaims) => {
    expect(() =>
      buildPgSettings({
        api,
        token: null,
        requestId: 'request-6',
        trustedClaims: trustedClaims as never,
      })
    ).toThrow(TypeError);
  });

  it('rejects symbol and accessor properties in trusted claims', () => {
    const symbolClaims = { 'jwt.claims.user_id': 'user' } as Record<
      PropertyKey,
      unknown
    >;
    symbolClaims[Symbol('claim')] = 'hidden';
    expect(() =>
      withTrustedPgClaims(
        buildPgSettings({ api, token: null, requestId: 'request-7' }),
        symbolClaims
      )
    ).toThrow('must not contain symbol properties');

    const accessorClaims = {};
    Object.defineProperty(accessorClaims, 'jwt.claims.user_id', {
      enumerable: true,
      get: () => 'user',
    });
    expect(() =>
      withTrustedPgClaims(
        buildPgSettings({ api, token: null, requestId: 'request-8' }),
        accessorClaims
      )
    ).toThrow('must be a string data property');
  });

  it('copies a complete context when switching role and rejects invalid roles', () => {
    const settings = buildPgSettings({ api, token, requestId: 'request-9' });
    const anonymous = withPgSettingsRole(settings, 'anonymous_runtime');

    expect(anonymous).toEqual({ ...settings, role: 'anonymous_runtime' });
    expect(anonymous).not.toBe(settings);
    expect(settings.role).toBe('authenticated_runtime');
    expect(() => withPgSettingsRole(settings, '')).toThrow('non-empty string');
  });
});
