import { buildPgSettings } from '../src/pg-settings';
import type { ApiStructure, ConstructiveAPIToken } from '../src/types';

const api: ApiStructure = {
  apiId: '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
  dbname: 'testdb',
  anonRole: 'anonymous',
  roleName: 'authenticated',
  schema: ['public'],
  apiModules: [],
  domains: [],
  databaseId: '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  isPublic: true
};

describe('buildPgSettings — jwt.claims.api_id provenance', () => {
  it('sets jwt.claims.api_id from the resolved api for anonymous requests', () => {
    const settings = buildPgSettings({ api, token: null, requestId: 'r1' });

    expect(settings['jwt.claims.api_id']).toBe(api.apiId);
    expect(settings['role']).toBe('anonymous');
  });

  it('sets jwt.claims.api_id from the resolved api for authenticated requests', () => {
    const token = { user_id: 'u1' } as ConstructiveAPIToken;
    const settings = buildPgSettings({ api, token, requestId: 'r1' });

    expect(settings['jwt.claims.api_id']).toBe(api.apiId);
    expect(settings['role']).toBe('authenticated');
    expect(settings['jwt.claims.user_id']).toBe('u1');
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
      api_id: 'attacker-controlled'
    } as unknown as ConstructiveAPIToken;
    const settings = buildPgSettings({ api, token, requestId: 'r1' });

    expect(settings['jwt.claims.api_id']).toBe(api.apiId);
  });
});
