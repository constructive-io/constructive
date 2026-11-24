import { ConfigStore } from 'appstash';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AccountSession, clearSession, loadSession, saveSession } from '../src/account-store';
import { backendFromApiEndpoint, loadBackendConfig, saveBackendConfig } from '../src/backend-store';
import { loadConfig } from '../src/config';

const LOCAL = backendFromApiEndpoint('http://api.localhost:3000/graphql');
const REMOTE = backendFromApiEndpoint('https://api.example.com/graphql');

let home: string;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-store-'));
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

const session: AccountSession = {
  userId: 'user-1',
  email: 'dev@example.com',
  accessToken: 'access-token',
  accessTokenExpiresAt: '2026-08-04T00:00:00Z',
  apiKey: 'cnc_live_sk_abc',
  keyId: 'key-1',
  apiKeyExpiresAt: '2031-08-03T00:00:00Z',
  signedInAt: 1754000000000
};

const store = (): ConfigStore => {
  const s = loadConfig(home).store;
  if (!s.getCurrentContext()) saveBackendConfig(s, LOCAL);
  return s;
};
const bareStore = (): ConfigStore => loadConfig(home).store;

describe('config', () => {
  it('shares the constructive stash rather than an agent-specific directory', () => {
    const config = loadConfig(home);
    saveBackendConfig(config.store, LOCAL);
    expect(fs.existsSync(path.join(config.dirs.stash.config, 'agent', 'account.json'))).toBe(false);
    saveSession(config.store, session);
    // credentials land in the shared stash root, not an agent-only subdirectory
    expect(fs.existsSync(path.join(config.dirs.stash.config, 'credentials.json'))).toBe(true);
  });
});

describe('account-store', () => {
  it('round-trips a session through the shared store', () => {
    const s = store();
    saveSession(s, session);
    expect(loadSession(s)).toEqual(session);
  });

  it('files the session under the active backend context, keeping backends independent', () => {
    const s = store();
    saveBackendConfig(s, REMOTE);
    saveSession(s, session);
    saveBackendConfig(s, LOCAL);
    expect(loadSession(s)).toBeNull();
    saveBackendConfig(s, REMOTE);
    expect(loadSession(s)).toEqual(session);
  });

  it('refuses to file a session before a backend is chosen', () => {
    const s = bareStore();
    expect(() => saveSession(s, session)).toThrow('No backend chosen');
    expect(s.getCurrentContext()).toBeNull();
  });

  it('writes credentials with mode 0600', () => {
    const s = store();
    saveSession(s, session);
    const file = path.join(loadConfig(home).dirs.stash.config, 'credentials.json');
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  it('returns null when nothing is stored', () => {
    expect(loadSession(store())).toBeNull();
  });

  it('clearSession removes the credentials and tolerates a signed-out store', () => {
    const s = store();
    saveSession(s, session);
    clearSession(s);
    expect(loadSession(s)).toBeNull();
    expect(() => clearSession(s)).not.toThrow();
  });
});

describe('backend-store', () => {
  it('derives all five planes from the api endpoint the user names', () => {
    expect(REMOTE).toEqual({
      apiEndpoint: 'https://api.example.com/graphql',
      authEndpoint: 'https://auth.example.com/graphql',
      modulesEndpoint: 'https://modules.example.com/graphql',
      agentEndpoint: 'https://agent.example.com/graphql',
      computeEndpoint: 'https://compute.example.com/graphql'
    });
    expect(() => backendFromApiEndpoint('not a url')).toThrow('Invalid API endpoint URL');
  });

  it('round-trips all five planes and returns null before one is chosen', () => {
    const s = bareStore();
    expect(loadBackendConfig(s)).toBeNull();
    expect(saveBackendConfig(s, REMOTE)).toBe('example.com');
    expect(loadBackendConfig(s)).toEqual(REMOTE);
    expect(saveBackendConfig(s, LOCAL)).toBe('localhost-3000');
    expect(loadBackendConfig(s)).toEqual(LOCAL);
  });

  it('treats a context missing a plane as no backend rather than guessing one', () => {
    const s = store();
    s.createContext('partial', {
      endpoint: REMOTE.apiEndpoint,
      targets: { api: { endpoint: REMOTE.apiEndpoint }, auth: { endpoint: REMOTE.authEndpoint } }
    });
    s.setCurrentContext('partial');
    expect(loadBackendConfig(s)).toBeNull();
  });
});
