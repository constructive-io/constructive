import { ConfigStore } from 'appstash';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const createClient = jest.fn();

jest.mock('@constructive-io/sdk', () => ({
  auth: { createClient: (...args: any[]) => createClient(...args) }
}));

import { loadSession, saveSession } from '../src/account-store';
import { refreshApiKeyIfNeeded, signIn, signOut } from '../src/auth';
import { loadConfig } from '../src/config';

const AUTH_ENDPOINT = 'http://auth.localhost:3000/graphql';

const unwrappable = (value: unknown) => ({ unwrap: () => Promise.resolve(value) });
const failing = (err: unknown) => ({ unwrap: () => Promise.reject(err) });

let home: string;
let store: ConfigStore;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-auth-'));
  store = loadConfig(home).store;
  createClient.mockReset();
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

function mockClient(mutation: Record<string, jest.Mock>) {
  createClient.mockImplementation(() => ({ mutation }));
  return mutation;
}

const signInResult = {
  signIn: {
    result: {
      userId: 'user-1',
      accessToken: 'access-token',
      accessTokenExpiresAt: '2026-08-04T00:00:00Z'
    }
  }
};

const mintedResult = {
  createApiKey: {
    result: { apiKey: 'cnc_live_sk_new', keyId: 'key-new', expiresAt: '2031-08-03T00:00:00Z' }
  }
};

describe('signIn', () => {
  it('persists the session and mints an API key in the step-up window', async () => {
    const mutation = mockClient({
      signIn: jest.fn(() => unwrappable(signInResult)),
      createApiKey: jest.fn(() => unwrappable(mintedResult)),
      revokeApiKey: jest.fn()
    });

    const session = await signIn({
      store,
      authEndpoint: AUTH_ENDPOINT,
      email: '  dev@example.com ',
      password: 'pw'
    });

    expect(mutation.signIn).toHaveBeenCalledWith(
      { input: { email: 'dev@example.com', password: 'pw' } },
      expect.anything()
    );
    expect(session.userId).toBe('user-1');
    expect(session.apiKey).toBe('cnc_live_sk_new');
    expect(session.keyId).toBe('key-new');
    expect(loadSession(store)).toEqual(session);
    expect(createClient).toHaveBeenCalledWith({ endpoint: AUTH_ENDPOINT });
    expect(createClient).toHaveBeenCalledWith({
      endpoint: AUTH_ENDPOINT,
      headers: { Authorization: 'Bearer access-token' }
    });
  });

  it('keeps the session when the mint fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockClient({
      signIn: jest.fn(() => unwrappable(signInResult)),
      createApiKey: jest.fn(() => failing(new Error('API_KEYS_DISABLED'))),
      revokeApiKey: jest.fn()
    });

    const session = await signIn({ store, authEndpoint: AUTH_ENDPOINT, email: 'dev@example.com', password: 'pw' });
    expect(session.apiKey).toBeUndefined();
    expect(loadSession(store)?.accessToken).toBe('access-token');
    warn.mockRestore();
  });

  it('rejects when no access token comes back (MFA)', async () => {
    mockClient({ signIn: jest.fn(() => unwrappable({ signIn: { result: {} } })) });
    await expect(
      signIn({ store, authEndpoint: AUTH_ENDPOINT, email: 'dev@example.com', password: 'pw' })
    ).rejects.toThrow('Authentication returned no access token (MFA may be required).');
    expect(loadSession(store)).toBeNull();
  });

  it('rejects empty credentials without a network call', async () => {
    await expect(
      signIn({ store, authEndpoint: AUTH_ENDPOINT, email: '  ', password: 'pw' })
    ).rejects.toThrow('Email and password are required.');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('maps sign-in errors through describeAuthError', async () => {
    const gqlError = Object.assign(new Error('request failed'), {
      errors: [{ message: 'GraphQL Error: Invalid credentials' }]
    });
    mockClient({ signIn: jest.fn(() => failing(gqlError)) });
    await expect(
      signIn({ store, authEndpoint: AUTH_ENDPOINT, email: 'dev@example.com', password: 'nope' })
    ).rejects.toThrow('Invalid credentials');
  });
});

describe('refreshApiKeyIfNeeded', () => {
  const baseSession = {
    userId: 'user-1',
    email: 'dev@example.com',
    accessToken: 'access-token',
    signedInAt: 1754000000000
  };

  it('returns signed-out without a session', async () => {
    await expect(refreshApiKeyIfNeeded({ store, authEndpoint: AUTH_ENDPOINT })).resolves.toBe('signed-out');
  });

  it('returns ok for a fresh key without a network call', async () => {
    saveSession(store, {
      ...baseSession,
      apiKey: 'k',
      keyId: 'id',
      apiKeyExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString()
    });
    await expect(refreshApiKeyIfNeeded({ store, authEndpoint: AUTH_ENDPOINT })).resolves.toBe('ok');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('re-mints an expiring key and persists it', async () => {
    saveSession(store, {
      ...baseSession,
      apiKey: 'old',
      keyId: 'old-id',
      apiKeyExpiresAt: new Date(Date.now() + 1000).toISOString()
    });
    const mutation = mockClient({
      createApiKey: jest.fn(() => unwrappable(mintedResult)),
      revokeApiKey: jest.fn(() => unwrappable({ revokeApiKey: { result: true } }))
    });

    await expect(refreshApiKeyIfNeeded({ store, authEndpoint: AUTH_ENDPOINT })).resolves.toBe('reminted');
    expect(mutation.revokeApiKey).toHaveBeenCalledWith({ input: { keyId: 'old-id' } }, expect.anything());
    expect(loadSession(store)?.apiKey).toBe('cnc_live_sk_new');
  });

  it('returns reauth-required on a step-up error', async () => {
    saveSession(store, baseSession);
    mockClient({
      createApiKey: jest.fn(() => failing({ errors: [{ extensions: { code: 'STEP_UP_REQUIRED' } }] })),
      revokeApiKey: jest.fn()
    });
    await expect(refreshApiKeyIfNeeded({ store, authEndpoint: AUTH_ENDPOINT })).resolves.toBe('reauth-required');
  });

  it('returns unavailable on other errors', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    saveSession(store, baseSession);
    mockClient({
      createApiKey: jest.fn(() => failing(new Error('boom'))),
      revokeApiKey: jest.fn()
    });
    await expect(refreshApiKeyIfNeeded({ store, authEndpoint: AUTH_ENDPOINT })).resolves.toBe('unavailable');
    warn.mockRestore();
  });
});

describe('signOut', () => {
  it('revokes the key and clears the session', async () => {
    saveSession(store, {
      userId: 'user-1',
      email: 'dev@example.com',
      accessToken: 'access-token',
      apiKey: 'k',
      keyId: 'key-1',
      signedInAt: 1754000000000
    });
    const mutation = mockClient({
      revokeApiKey: jest.fn(() => unwrappable({ revokeApiKey: { result: true } }))
    });

    await expect(signOut({ store, authEndpoint: AUTH_ENDPOINT })).resolves.toBe(true);
    expect(mutation.revokeApiKey).toHaveBeenCalledWith({ input: { keyId: 'key-1' } }, expect.anything());
    expect(loadSession(store)).toBeNull();
  });

  it('clears the session even when the revoke fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    saveSession(store, {
      userId: 'user-1',
      email: 'dev@example.com',
      accessToken: 'access-token',
      keyId: 'key-1',
      signedInAt: 1754000000000
    });
    mockClient({ revokeApiKey: jest.fn(() => failing(new Error('offline'))) });

    await expect(signOut({ store, authEndpoint: AUTH_ENDPOINT })).resolves.toBe(true);
    expect(loadSession(store)).toBeNull();
    warn.mockRestore();
  });

  it('is a no-op when signed out', async () => {
    await expect(signOut({ store, authEndpoint: AUTH_ENDPOINT })).resolves.toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });
});
