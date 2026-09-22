import { buildPgSettings } from '../src/pg-settings';
import { DEFAULT_REQUEST_PROTECTION } from '../src/request-protection';
import type { ApiStructure, ConstructiveAPIToken } from '../src/types';

const api: ApiStructure = {
  apiId: '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
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

describe('buildPgSettings — agent-auth claims (intent, session lineage)', () => {
  it('maps intent, root_session_id and parent_session_id from the token', () => {
    const token: ConstructiveAPIToken = {
      user_id: 'u1',
      session_id: 's-child',
      root_session_id: 's-root',
      parent_session_id: 's-parent',
      intent: 'deploy:preview'
    };
    const settings = buildPgSettings({ api, token, requestId: 'r1' });

    expect(settings['jwt.claims.session_id']).toBe('s-child');
    expect(settings['jwt.claims.root_session_id']).toBe('s-root');
    expect(settings['jwt.claims.parent_session_id']).toBe('s-parent');
    expect(settings['jwt.claims.intent']).toBe('deploy:preview');
  });

  it('omits the lineage/intent GUCs when the token does not carry them', () => {
    const token: ConstructiveAPIToken = { user_id: 'u1', session_id: 's1' };
    const settings = buildPgSettings({ api, token, requestId: 'r1' });

    expect(settings).not.toHaveProperty('jwt.claims.root_session_id');
    expect(settings).not.toHaveProperty('jwt.claims.parent_session_id');
    expect(settings).not.toHaveProperty('jwt.claims.intent');
  });

  it('omits them for anonymous requests', () => {
    const settings = buildPgSettings({ api, token: null, requestId: 'r1' });

    expect(settings).not.toHaveProperty('jwt.claims.root_session_id');
    expect(settings).not.toHaveProperty('jwt.claims.parent_session_id');
    expect(settings).not.toHaveProperty('jwt.claims.intent');
  });
});

describe('buildPgSettings — Graphile request context parity', () => {
  it('preserves authenticated claims and request metadata', () => {
    const token: ConstructiveAPIToken = {
      id: 'token-1',
      user_id: 'user-1',
      principal_id: 'principal-1',
      session_id: 'session-1',
      root_session_id: 'root-session-1',
      parent_session_id: 'parent-session-1',
      intent: 'agent:run',
      access_level: 'read_only',
      kind: 'api_token'
    };

    const settings = buildPgSettings({
      api,
      token,
      requestId: 'request-1',
      clientIp: '192.0.2.1',
      origin: 'https://app.example.test',
      userAgent: 'test-agent',
      deviceToken: 'device-1'
    });

    expect(settings).toMatchObject({
      role: 'authenticated',
      'jwt.claims.token_id': 'token-1',
      'jwt.claims.user_id': 'user-1',
      'jwt.claims.principal_id': 'principal-1',
      'jwt.claims.session_id': 'session-1',
      'jwt.claims.root_session_id': 'root-session-1',
      'jwt.claims.parent_session_id': 'parent-session-1',
      'jwt.claims.intent': 'agent:run',
      'jwt.claims.access_level': 'read_only',
      'jwt.claims.kind': 'api_token',
      'jwt.claims.api_id': api.apiId,
      'jwt.claims.database_id': api.databaseId,
      'jwt.claims.ip_address': '192.0.2.1',
      'jwt.claims.origin': 'https://app.example.test',
      'jwt.claims.user_agent': 'test-agent',
      'jwt.claims.device_token': 'device-1',
      'request.id': 'request-1',
      default_transaction_read_only: 'on'
    });
    expect(buildPgSettings({
      api,
      token: { ...token, principal_id: undefined },
      requestId: 'request-1'
    })['jwt.claims.principal_id']).toBe('user-1');
  });

  it('uses the database as anonymous attribution', () => {
    const settings = buildPgSettings({ api, token: null, requestId: 'request-2' });

    expect(settings).toMatchObject({
      role: 'anonymous',
      'jwt.claims.entity_id': api.databaseId,
      'jwt.claims.entity_type': 'database'
    });
    expect(settings['jwt.claims.user_id']).toBeUndefined();
  });

  it('honors actor metadata on private APIs and ignores the same spoof on public APIs', () => {
    const headers = {
      actorId: 'actor-1',
      entityId: 'entity-1',
      entityType: 'organization',
      organizationId: 'organization-1'
    };
    const privateSettings = buildPgSettings({
      api: { ...api, isPublic: false },
      token: null,
      requestId: 'request-3',
      headers
    });
    const publicSettings = buildPgSettings({
      api,
      token: null,
      requestId: 'request-4',
      headers
    });

    expect(privateSettings).toMatchObject({
      role: 'authenticated',
      'jwt.claims.user_id': 'actor-1',
      'jwt.claims.principal_id': 'actor-1',
      'jwt.claims.entity_id': 'entity-1',
      'jwt.claims.entity_type': 'organization',
      'jwt.claims.organization_id': 'organization-1'
    });
    const actorOnlySettings = buildPgSettings({
      api: { ...api, isPublic: false },
      token: null,
      requestId: 'request-3b',
      headers: { actorId: 'actor-1' }
    });
    expect(actorOnlySettings['jwt.claims.entity_id']).toBeUndefined();
    expect(actorOnlySettings['jwt.claims.entity_type']).toBeUndefined();
    expect(publicSettings).toMatchObject({
      role: 'anonymous',
      'jwt.claims.entity_id': api.databaseId,
      'jwt.claims.entity_type': 'database'
    });
    expect(publicSettings['jwt.claims.user_id']).toBeUndefined();
    expect(publicSettings['jwt.claims.organization_id']).toBeUndefined();
  });

  it('applies bounded request timeouts and read-only transactions', () => {
    const requestProtection = {
      ...DEFAULT_REQUEST_PROTECTION,
      statementTimeoutMs: 1200,
      idleInTransactionTimeoutMs: 2300,
      lockTimeoutMs: 340,
    };
    const readOnly = buildPgSettings({
      api,
      token: { user_id: 'user-1', access_level: 'read_only' },
      requestId: 'request-5',
      requestProtection
    });
    const writable = buildPgSettings({
      api,
      token: { user_id: 'user-1' },
      requestId: 'request-6',
      requestProtection
    });

    expect(readOnly).toMatchObject({
      statement_timeout: '1200',
      idle_in_transaction_session_timeout: '2300',
      lock_timeout: '340',
      default_transaction_read_only: 'on'
    });
    expect(writable.default_transaction_read_only).toBeUndefined();
  });
});
