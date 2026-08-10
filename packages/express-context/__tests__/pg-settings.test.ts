import { buildPgSettings } from '../src/pg-settings';
import type { ApiStructure, ConstructiveAPIToken } from '../src/types';

const api: ApiStructure = {
  apiId: '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
  siteId: '87763e7e-8aeb-4e5c-98ce-95e16b6f62ac',
  dbname: 'testdb',
  anonRole: 'anonymous',
  roleName: 'authenticated',
  schema: ['public'],
  domains: [],
  databaseId: '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  isPublic: true
};

describe('buildPgSettings — jwt.claims.api_id provenance', () => {
  it('sets jwt.claims.api_id from the resolved api for anonymous requests', () => {
    const settings = buildPgSettings({ api, token: null, requestId: 'r1' });

    expect(settings['jwt.claims.api_id']).toBe(api.apiId);
    expect(settings['jwt.claims.site_id']).toBe(api.siteId);
    expect(settings['role']).toBe('anonymous');
  });

  it('sets jwt.claims.api_id from the resolved api for authenticated requests', () => {
    const token = { user_id: 'u1' } as ConstructiveAPIToken;
    const settings = buildPgSettings({ api, token, requestId: 'r1' });

    expect(settings['jwt.claims.api_id']).toBe(api.apiId);
    expect(settings['role']).toBe('authenticated');
    expect(settings['jwt.claims.user_id']).toBe('u1');
  });

  it('forwards existing credential and principal claims to direct DB calls', () => {
    const token = {
      id: 'credential-1',
      user_id: 'user-1',
      session_id: 'session-1',
      principal_id: 'principal-1',
      kind: 'api_key',
      access_level: 'full_access'
    } as ConstructiveAPIToken;

    const settings = buildPgSettings({ api, token, requestId: 'r1' });

    expect(settings).toMatchObject({
      'jwt.claims.token_id': 'credential-1',
      'jwt.claims.user_id': 'user-1',
      'jwt.claims.session_id': 'session-1',
      'jwt.claims.principal_id': 'principal-1',
      'jwt.claims.kind': 'api_key',
      'jwt.claims.access_level': 'full_access'
    });
  });

  it('uses the human user as principal when a credential has no service principal', () => {
    const settings = buildPgSettings({
      api,
      token: { user_id: 'user-1' },
      requestId: 'r1'
    });

    expect(settings['jwt.claims.principal_id']).toBe('user-1');
  });

  it('omits jwt.claims.api_id when the api has no apiId (non-API surface)', () => {
    const settings = buildPgSettings({
      api: { ...api, apiId: undefined },
      token: null,
      requestId: 'r1'
    });

    expect(settings['jwt.claims.api_id']).toBeUndefined();
  });

  it('is derived only from the resolved api, never from the token', () => {
    const token = {
      user_id: 'u1',
      api_id: 'attacker-controlled',
      site_id: 'attacker-controlled'
    } as unknown as ConstructiveAPIToken;
    const settings = buildPgSettings({ api, token, requestId: 'r1' });

    expect(settings['jwt.claims.api_id']).toBe(api.apiId);
    expect(settings['jwt.claims.site_id']).toBe(api.siteId);
  });

  it('omits jwt.claims.site_id when the route has no Site context', () => {
    const settings = buildPgSettings({
      api: { ...api, siteId: undefined },
      token: null,
      requestId: 'r1'
    });

    expect(settings['jwt.claims.site_id']).toBeUndefined();
  });
});
