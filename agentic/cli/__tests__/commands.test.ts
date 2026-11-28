import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.mock('@agentic-kit/session', () => ({
  ...jest.requireActual('@agentic-kit/session'),
  signIn: jest.fn(),
  signOut: jest.fn(),
  verifySession: jest.fn()
}));

import {
  AccountSession,
  addBackend,
  backendFromEndpoints,
  saveSession,
  selectBackend,
  signIn,
  signOut,
  verifySession
} from '@agentic-kit/session';

import { login, logout, whoami } from '../src/commands';
import { AgentCliConfig, loadConfig } from '../src/config';

const LOCAL = backendFromEndpoints({ api: 'http://api.localhost:3000/graphql' });
const REMOTE = backendFromEndpoints({ api: 'https://api.example.com/graphql' });

const useBackend = (config: AgentCliConfig) => selectBackend(config.store, addBackend(config.store, LOCAL).name);

const signInMock = signIn as jest.Mock;
const signOutMock = signOut as jest.Mock;
const verifyMock = verifySession as jest.Mock;

let home: string;
let config: AgentCliConfig;
let logs: string[];
let logSpy: jest.SpyInstance;

const session: AccountSession = {
  userId: 'user-1',
  email: 'dev@example.com',
  accessToken: 'access-token',
  apiKey: 'cnc_live_sk_1234567890abcd',
  keyId: 'key-1',
  apiKeyExpiresAt: '2031-08-03T00:00:00Z',
  signedInAt: 1754000000000
};

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-cmd-'));
  config = loadConfig(home);
  logs = [];
  logSpy = jest.spyOn(console, 'log').mockImplementation((msg: string) => {
    logs.push(String(msg));
  });
  signInMock.mockReset();
  signOutMock.mockReset();
  verifyMock.mockReset();
  verifyMock.mockResolvedValue({ kind: 'accepted' });
  process.exitCode = undefined;
});

afterEach(() => {
  logSpy.mockRestore();
  fs.rmSync(home, { recursive: true, force: true });
  process.exitCode = undefined;
});

const output = () => logs.join('\n');

describe('login', () => {
  it('signs in against the backend derived from the named API endpoint', async () => {
    signInMock.mockResolvedValue({ session, context: 'example.com', apiKey: { kind: 'minted' }, previousKey: { kind: 'absent' } });

    await login(config, { apiUrl: REMOTE.apiEndpoint, email: 'dev@example.com', password: 'pw' });

    expect(signInMock).toHaveBeenCalledWith({
      store: config.store,
      backend: REMOTE,
      email: 'dev@example.com',
      password: 'pw'
    });
    expect(output()).toContain('signed in as dev@example.com');
    expect(output()).toContain('cnc_li...abcd');
    expect(output()).toContain('session stored in context example.com');
  });

  it('ships no backend: with no API endpoint named it refuses before any network call', async () => {
    await expect(login(config, { email: 'dev@example.com', password: 'pw' })).rejects.toThrow(
      'is not an absolute URL'
    );
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid custom URL before any network call', async () => {
    await expect(
      login(config, { apiUrl: 'not a url', email: 'dev@example.com', password: 'pw' })
    ).rejects.toThrow('is not an absolute URL');
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('warns when no API key was minted, and when the replaced key could not be revoked', async () => {
    signInMock.mockResolvedValue({
      session,
      context: 'localhost-3000',
      apiKey: { kind: 'not-minted', reason: 'API keys are disabled' },
      previousKey: { kind: 'failed', keyId: 'key-0', reason: 'offline' }
    });

    await login(config, { apiUrl: LOCAL.apiEndpoint, email: 'dev@example.com', password: 'pw' });

    expect(output()).toContain('no new API key was minted (API keys are disabled); the previous key stays in use');
    expect(output()).toContain('key-0 of the replaced session could not be revoked (offline)');
  });
});

describe('logout', () => {
  it('signs out of the active backend', async () => {
    signOutMock.mockResolvedValue({ kind: 'cleared', context: 'localhost-3000', key: { kind: 'revoked', keyId: 'key-1' } });

    await logout(config);

    expect(signOutMock).toHaveBeenCalledWith({ store: config.store, session: expect.objectContaining({ kind: 'no-backend' }) });
    expect(output()).toContain('signed out');
  });

  it('signs out of the session the environment gives, and says nothing stored was removed', async () => {
    const saved = { ...process.env };
    Object.assign(process.env, { CONSTRUCTIVE_USER_ID: 'env-user', CONSTRUCTIVE_ACCESS_TOKEN: 'env-token', CONSTRUCTIVE_API_ENDPOINT: REMOTE.apiEndpoint });
    try {
      signOutMock.mockResolvedValue({ kind: 'from-environment' });
      await logout(config);
      expect(signOutMock).toHaveBeenCalledWith({ store: config.store, session: expect.objectContaining({ kind: 'signed-in', source: 'env' }) });
      expect(output()).toContain('the session comes from the environment');
    } finally {
      process.env = saved;
    }
  });

  it('reports when there is no session', async () => {
    signOutMock.mockResolvedValue({ kind: 'not-signed-in', context: null });
    await logout(config);
    expect(output()).toContain('not signed in');
  });

  it('says the session was cleared but the key stays valid when the revoke failed', async () => {
    signOutMock.mockResolvedValue({ kind: 'cleared', context: 'localhost-3000', key: { kind: 'failed', keyId: 'key-1', reason: 'offline' } });
    await logout(config);
    expect(output()).toContain('session cleared, but the API key key-1 could not be revoked (offline)');
  });
});

describe('whoami', () => {
  it('prints the session details with a masked API key', async () => {
    useBackend(config);
    saveSession(config.store, { ...session, issuedFor: LOCAL });

    await whoami(config);

    expect(process.exitCode).toBeUndefined();
    expect(output()).toContain('signed in as dev@example.com');
    expect(output()).toContain('user id: user-1');
    expect(output()).toContain(LOCAL.apiEndpoint);
    expect(output()).toContain('cnc_li...abcd');
    expect(output()).not.toContain(session.apiKey);
    expect(output()).not.toContain('access-token');
  });

  it('says the backend rejected the credential, and exits 1', async () => {
    useBackend(config);
    saveSession(config.store, { ...session, issuedFor: LOCAL });
    verifyMock.mockResolvedValue({ kind: 'rejected', reason: 'The server rejected the credential (UNAUTHENTICATED).', code: 'UNAUTHENTICATED' });

    await whoami(config);

    expect(process.exitCode).toBe(1);
    expect(output()).toContain('credential: rejected');
    expect(output()).toContain('Run `agent login` to sign in again');
  });

  it('names a stored session that another backend issued, and does not use it', async () => {
    useBackend(config);
    saveSession(config.store, { ...session, issuedFor: { ...LOCAL, authEndpoint: 'http://auth.elsewhere.localhost/graphql' } });

    await whoami(config);

    expect(process.exitCode).toBe(1);
    expect(output()).toContain('but the session was issued for http://auth.elsewhere.localhost/graphql');
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('names the missing plane of a context another app wrote instead of reporting a backend', async () => {
    const four = LOCAL;
    config.store.createContext('localnet', {
      endpoint: four.apiEndpoint,
      targets: { api: { endpoint: four.apiEndpoint }, auth: { endpoint: four.authEndpoint }, modules: { endpoint: four.modulesEndpoint }, agent: { endpoint: four.agentEndpoint } }
    });
    config.store.setCurrentContext('localnet');
    saveSession(config.store, session);

    await whoami(config);

    expect(process.exitCode).toBe(1);
    expect(output()).toContain('"localnet" lacks the compute endpoint');
  });

  it('exits 1 with a sign-in hint when signed out', async () => {
    await whoami(config);
    expect(process.exitCode).toBe(1);
    expect(output()).toContain('run `agent login`');
  });
});
