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

describe('config', () => {
  it('exposes account and backend file paths under <config>/agent', () => {
    const config = loadConfig(home);
    expect(config.accountFile).toBe(path.join(config.dirs.stash.config, 'agent', 'account.json'));
    expect(config.backendFile).toBe(path.join(config.dirs.stash.config, 'agent', 'backend-config.json'));
    expect(fs.existsSync(path.dirname(config.accountFile))).toBe(true);
  });
});

describe('account-store', () => {
  it('round-trips a session and keeps the airpage StoredSession shape on disk', () => {
    const file = loadConfig(home).accountFile;
    saveSession(file, session);
    expect(loadSession(file)).toEqual(session);
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(stored.token).toBe('access-token');
    expect(stored.encrypted).toBe(false);
    expect(stored.accessToken).toBeUndefined();
  });

  it('writes the session file with mode 0600', () => {
    const file = loadConfig(home).accountFile;
    saveSession(file, session);
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  it('returns null when no session file exists', () => {
    expect(loadSession(loadConfig(home).accountFile)).toBeNull();
  });

  it('moves a corrupt session file aside and returns null', () => {
    const file = loadConfig(home).accountFile;
    fs.writeFileSync(file, 'not json');
    expect(loadSession(file)).toBeNull();
    expect(fs.existsSync(`${file}.bak`)).toBe(true);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('clearSession removes the file and tolerates a missing one', () => {
    const file = loadConfig(home).accountFile;
    saveSession(file, session);
    clearSession(file);
    expect(fs.existsSync(file)).toBe(false);
    expect(() => clearSession(file)).not.toThrow();
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

  it('round-trips a backend config and returns null for missing or invalid files', () => {
    const file = loadConfig(home).backendFile;
    expect(loadBackendConfig(file)).toBeNull();
    saveBackendConfig(file, BACKEND_PRESETS.devnet);
    expect(loadBackendConfig(file)).toEqual(BACKEND_PRESETS.devnet);
    fs.writeFileSync(file, '{"apiEndpoint":"x"}');
    expect(loadBackendConfig(file)).toBeNull();
  });
});
