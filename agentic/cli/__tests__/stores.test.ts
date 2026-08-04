import { ConfigStore } from 'appstash';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AccountSession, clearSession, loadSession, saveSession } from '../src/account-store';
import { BACKEND_PRESETS, loadBackendConfig, saveBackendConfig } from '../src/backend-store';
import { loadConfig } from '../src/config';

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

const store = (): ConfigStore => loadConfig(home).store;

describe('config', () => {
  it('shares the constructive stash rather than an agent-specific directory', () => {
    const config = loadConfig(home);
    expect(fs.existsSync(path.join(config.dirs.stash.config, 'agent', 'account.json'))).toBe(false);
    saveSession(config.store, session);
    // credentials land in the shared stash root, not an agent-only subdirectory
    expect(fs.existsSync(path.join(config.dirs.stash.config, 'credentials.json'))).toBe(true);
  });

  it('imports a legacy account.json + backend-config.json once, then moves them aside', () => {
    const config = loadConfig(home);
    const legacyDir = path.join(config.dirs.stash.config, 'agent');
    fs.mkdirSync(legacyDir, { recursive: true });
    const accountFile = path.join(legacyDir, 'account.json');
    const backendFile = path.join(legacyDir, 'backend-config.json');
    fs.writeFileSync(
      accountFile,
      JSON.stringify({
        userId: 'user-1',
        email: 'dev@example.com',
        token: 'access-token',
        encrypted: false,
        apiKey: 'cnc_live_sk_abc',
        keyId: 'key-1',
        signedInAt: 1754000000000
      })
    );
    fs.writeFileSync(backendFile, JSON.stringify(BACKEND_PRESETS.devnet));

    const migrated = loadConfig(home);
    expect(loadBackendConfig(migrated.store)).toEqual(BACKEND_PRESETS.devnet);
    expect(loadSession(migrated.store)).toMatchObject({ userId: 'user-1', accessToken: 'access-token' });
    expect(fs.existsSync(accountFile)).toBe(false);
    expect(fs.existsSync(`${accountFile}.migrated`)).toBe(true);
    expect(fs.existsSync(`${backendFile}.migrated`)).toBe(true);
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
    saveBackendConfig(s, BACKEND_PRESETS.devnet);
    saveSession(s, session);
    saveBackendConfig(s, BACKEND_PRESETS.localnet);
    expect(loadSession(s)).toBeNull();
    saveBackendConfig(s, BACKEND_PRESETS.devnet);
    expect(loadSession(s)).toEqual(session);
  });

  it('defaults to the localnet context when no backend was chosen yet', () => {
    const s = store();
    saveSession(s, session);
    expect(s.getCurrentContext()?.name).toBe('localnet');
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
  it('ships localnet and devnet presets with all three endpoints', () => {
    for (const preset of Object.values(BACKEND_PRESETS)) {
      expect(preset.apiEndpoint).toMatch(/\/graphql$/);
      expect(preset.authEndpoint).toMatch(/\/graphql$/);
      expect(preset.modulesEndpoint).toMatch(/\/graphql$/);
    }
    expect(BACKEND_PRESETS.localnet.authEndpoint).toBe('http://auth.localhost:3000/graphql');
    expect(BACKEND_PRESETS.devnet.authEndpoint).toBe('https://auth.launchql.dev/graphql');
  });

  it('round-trips a backend config and returns null before one is chosen', () => {
    const s = store();
    expect(loadBackendConfig(s)).toBeNull();
    expect(saveBackendConfig(s, BACKEND_PRESETS.devnet)).toBe('devnet');
    expect(loadBackendConfig(s)).toEqual(BACKEND_PRESETS.devnet);
  });

  it('files endpoints matching no preset under the custom context', () => {
    const s = store();
    const custom = {
      apiEndpoint: 'https://api.example.com/graphql',
      authEndpoint: 'https://auth.example.com/graphql',
      modulesEndpoint: 'https://modules.example.com/graphql'
    };
    expect(saveBackendConfig(s, custom)).toBe('custom');
    expect(loadBackendConfig(s)).toEqual(custom);
  });
});
