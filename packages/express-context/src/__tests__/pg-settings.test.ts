import { buildPgSettings, SECURITY_GUC_KEYS } from '../pg-settings';
import type { ApiStructure } from '../types';

const api: ApiStructure = {
  apiId: 'api-a',
  databaseId: 'database-a',
  dbname: 'tenant_a',
  schema: ['tenant_a_public'],
  roleName: 'tenant_user',
  anonRole: 'tenant_anon'
};

describe('buildPgSettings', () => {
  it('initializes every security GUC and explicit transaction state for anonymous requests', () => {
    const settings = buildPgSettings({ api, token: null, requestId: 'request-a' });

    expect(settings.role).toBe('tenant_anon');
    expect(settings['request.id']).toBe('request-a');
    expect(settings['transaction_read_only']).toBe('off');
    expect(settings['search_path']).toBe('pg_catalog, "tenant_a_public"');
    expect(settings['row_security']).toBe('on');
    for (const key of SECURITY_GUC_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(settings, key)).toBe(true);
    }
    expect(settings['jwt.claims.user_id']).toBe('');
  });

  it('quotes every physical schema in the pinned search path', () => {
    const settings = buildPgSettings({
      api: { ...api, schema: ['tenant-a', 'quoted"schema'] },
      token: null,
      requestId: 'request-search-path',
      dependencySchemas: ['postgis-ext', 'shared"api']
    });

    expect(settings['search_path']).toBe(
      'pg_catalog, "postgis-ext", "shared""api", "tenant-a", "quoted""schema"'
    );
  });

  it('sets known claims while keeping every absent claim empty', () => {
    const settings = buildPgSettings({
      api,
      token: {
        id: 'token-a',
        user_id: 'user-a',
        access_level: 'read_only',
        kind: 'api_key'
      },
      requestId: 'request-b',
      clientIp: '127.0.0.1',
      origin: 'https://example.test',
      userAgent: 'test-agent',
      deviceToken: 'device-a'
    });

    expect(settings).toMatchObject({
      role: 'tenant_user',
      'jwt.claims.token_id': 'token-a',
      'jwt.claims.user_id': 'user-a',
      'jwt.claims.principal_id': 'user-a',
      'jwt.claims.session_id': '',
      'jwt.claims.access_level': 'read_only',
      'jwt.claims.device_token': 'device-a',
      'transaction_read_only': 'on'
    });
  });

  it('does not retain claims or read-only state across requests', () => {
    buildPgSettings({
      api,
      token: { user_id: 'user-a', access_level: 'read_only' },
      requestId: 'request-a'
    });
    const next = buildPgSettings({ api, token: null, requestId: 'request-b' });

    expect(next['jwt.claims.user_id']).toBe('');
    expect(next['jwt.claims.access_level']).toBe('');
    expect(next['transaction_read_only']).toBe('off');
  });

  it('rejects runtime-shaped trusted claims that could override session state', () => {
    expect(() => buildPgSettings({
      api,
      token: null,
      requestId: 'request-extra-claim',
      trustedClaims: {
        role: 'cross_tenant_owner'
      } as unknown as Record<'jwt.claims.user_id', string>
    })).toThrow("trustedClaims contains unsupported security GUC 'role'");

    const claims = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(claims, 'jwt.claims.user_id', {
      enumerable: true,
      get: () => 'getter-value'
    });
    expect(() => buildPgSettings({
      api,
      token: null,
      requestId: 'request-accessor-claim',
      trustedClaims: claims as Record<'jwt.claims.user_id', string>
    })).toThrow('trustedClaims.jwt.claims.user_id must be a string data property');
  });
});
