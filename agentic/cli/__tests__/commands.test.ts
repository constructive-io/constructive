import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.mock('../src/auth', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  refreshApiKeyIfNeeded: jest.fn()
}));

import { AccountSession, saveSession } from '../src/account-store';
import { signIn, signOut } from '../src/auth';
import { BACKEND_PRESETS, loadBackendConfig, saveBackendConfig } from '../src/backend-store';
import { login, logout, whoami } from '../src/commands';
import { AgentCliConfig, loadConfig } from '../src/config';

const signInMock = signIn as jest.Mock;
const signOutMock = signOut as jest.Mock;

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
  process.exitCode = undefined;
});

afterEach(() => {
  logSpy.mockRestore();
  fs.rmSync(home, { recursive: true, force: true });
  process.exitCode = undefined;
});

const output = () => logs.join('\n');

describe('login', () => {
  it('signs in against a preset backend and persists the backend config', async () => {
    signInMock.mockResolvedValue(session);

    await login(config, { backend: 'localnet', email: 'dev@example.com', password: 'pw' });

    expect(signInMock).toHaveBeenCalledWith({
      store: config.store,
      context: 'localnet',
      authEndpoint: BACKEND_PRESETS.localnet.authEndpoint,
      email: 'dev@example.com',
      password: 'pw'
    });
    expect(loadBackendConfig(config.store)).toEqual(BACKEND_PRESETS.localnet);
    expect(output()).toContain('signed in as dev@example.com');
    expect(output()).toContain('cnc_li...abcd');
  });

  it('derives auth and modules endpoints from a custom API URL', async () => {
    signInMock.mockResolvedValue(session);

    await login(config, {
      backend: 'custom',
      apiUrl: 'https://api.example.com/graphql',
      email: 'dev@example.com',
      password: 'pw'
    });

    expect(signInMock).toHaveBeenCalledWith(
      expect.objectContaining({ authEndpoint: 'https://auth.example.com/graphql' })
    );
    expect(loadBackendConfig(config.store)).toEqual({
      apiEndpoint: 'https://api.example.com/graphql',
      authEndpoint: 'https://auth.example.com/graphql',
      modulesEndpoint: 'https://modules.example.com/graphql'
    });
  });

  it('rejects an invalid custom URL before any network call', async () => {
    await expect(
      login(config, { backend: 'custom', apiUrl: 'not a url', email: 'dev@example.com', password: 'pw' })
    ).rejects.toThrow('Invalid API endpoint URL');
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('warns when the session lacks an API key after sign-in', async () => {
    signInMock.mockResolvedValue({ ...session, apiKey: undefined, keyId: undefined });

    await login(config, { backend: 'localnet', email: 'dev@example.com', password: 'pw' });

    expect(output()).toContain('API key mint failed');
  });

  it('does not persist the backend config when sign-in fails', async () => {
    signInMock.mockRejectedValue(new Error('Invalid credentials'));

    await expect(
      login(config, { backend: 'devnet', email: 'dev@example.com', password: 'bad' })
    ).rejects.toThrow('Invalid credentials');
    expect(loadBackendConfig(config.store)).toBeNull();
  });
});

describe('logout', () => {
  it('signs out against the stored backend', async () => {
    saveBackendConfig(config.store, BACKEND_PRESETS.devnet);
    signOutMock.mockResolvedValue(true);

    await logout(config);

    expect(signOutMock).toHaveBeenCalledWith({
      store: config.store,
      authEndpoint: BACKEND_PRESETS.devnet.authEndpoint
    });
    expect(output()).toContain('signed out');
  });

  it('reports when there is no session', async () => {
    signOutMock.mockResolvedValue(false);
    await logout(config);
    expect(output()).toContain('not signed in');
  });
});

describe('whoami', () => {
  it('prints the session details with a masked API key', () => {
    saveSession(config.store, session);
    saveBackendConfig(config.store, BACKEND_PRESETS.localnet);

    whoami(config);

    expect(process.exitCode).toBeUndefined();
    expect(output()).toContain('signed in as dev@example.com');
    expect(output()).toContain('user id: user-1');
    expect(output()).toContain(BACKEND_PRESETS.localnet.apiEndpoint);
    expect(output()).toContain('cnc_li...abcd');
    expect(output()).not.toContain(session.apiKey);
    expect(output()).not.toContain('access-token');
  });

  it('exits 1 with a sign-in hint when signed out', () => {
    whoami(config);
    expect(process.exitCode).toBe(1);
    expect(output()).toContain('run `agent login`');
  });
});
