import { ConfigStore } from 'appstash';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AccountSession, clearSession, loadSession, openStore, saveSession, stashDirectories } from '../src/account-store';
import {
  addBackend,
  backendFromEndpoints,
  ContextInUseError,
  listBackends,
  readBackend,
  removeBackend,
  selectBackend
} from '../src/backend-store';

const LOCAL = backendFromEndpoints({ api: 'http://api.localhost:3000/graphql' });
const REMOTE = backendFromEndpoints({ api: 'https://api.example.com/graphql' });

let home: string;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'session-store-'));
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

const configDir = (base: string) => path.join(base, '.constructive', 'config');

const use = (s: ConfigStore, config = LOCAL) => selectBackend(s, addBackend(s, config).name);
const current = (s: ConfigStore) => {
  const name = s.getCurrentContext()?.name;
  const stored = name ? readBackend(s, name) : null;
  return stored?.status === 'complete' ? stored.backend : null;
};

const store = (): ConfigStore => {
  const s = openStore(home);
  if (!s.getCurrentContext()) use(s);
  return s;
};
const bareStore = (): ConfigStore => openStore(home);

describe('openStore', () => {
  let prevEnv: NodeJS.ProcessEnv;
  let fakeHome: string;
  let stashDir: string;

  beforeEach(() => {
    prevEnv = { ...process.env };
    fakeHome = path.join(home, 'home');
    stashDir = path.join(home, 'stash');
    fs.mkdirSync(fakeHome);
    process.env.APPSTASH_BASE_DIR = fakeHome;
    delete process.env.CONSTRUCTIVE_STASH_DIR;
  });

  afterEach(() => {
    process.env = prevEnv;
  });

  const inside = (file: string, dirs: string[]) => dirs.some((dir) => !path.relative(dir, file).startsWith('..') && !path.isAbsolute(path.relative(dir, file)));

  it.each<[string, () => NodeJS.ProcessEnv, () => string]>([
    ['the default base (APPSTASH_BASE_DIR, as jest cannot move the home directory)', () => ({ APPSTASH_BASE_DIR: fakeHome }), () => fakeHome],
    ['CONSTRUCTIVE_STASH_DIR', () => ({ CONSTRUCTIVE_STASH_DIR: stashDir }), () => stashDir]
  ])('names the directories of the store under %s, without creating any, and the store writes inside them', (_where, env, base) => {
    Object.assign(process.env, env());
    const dirs = stashDirectories(process.env);
    expect(dirs).toEqual(expect.arrayContaining([path.join(base(), '.constructive'), path.join(base(), '.constructive', 'config')]));
    expect(fs.existsSync(path.join(base(), '.constructive'))).toBe(false);

    const s = openStore();
    use(s);
    saveSession(s, session);
    const written = (fs.readdirSync(base(), { recursive: true }) as string[]).map((f) => path.join(base(), f)).filter((f) => fs.statSync(f).isFile());
    expect(written.length).toBeGreaterThan(0);
    for (const file of written) expect([file, inside(file, dirs)]).toEqual([file, true]);
  });

  it('refuses an empty CONSTRUCTIVE_STASH_DIR like openStore does', () => {
    expect(() => stashDirectories({ CONSTRUCTIVE_STASH_DIR: '' })).toThrow('CONSTRUCTIVE_STASH_DIR is set but empty');
  });

  it('writes every file under CONSTRUCTIVE_STASH_DIR and nothing under the default base', () => {
    process.env.CONSTRUCTIVE_STASH_DIR = stashDir;
    const s = openStore();
    use(s);
    saveSession(s, session);

    expect(fs.readdirSync(fakeHome)).toEqual([]);
    const written = (fs.readdirSync(stashDir, { recursive: true }) as string[]).filter((f) => fs.statSync(path.join(stashDir, f)).isFile());
    expect(written.sort()).toEqual([path.join('.constructive', 'config', 'contexts', 'localhost-3000.json'), path.join('.constructive', 'config', 'credentials.json'), path.join('.constructive', 'config', 'settings.json')]);
    expect(loadSession(openStore(stashDir))).toEqual(session);
  });

  it('shares the constructive stash rather than a tool-specific directory', () => {
    const s = openStore(home);
    use(s);
    saveSession(s, session);
    expect(fs.existsSync(path.join(configDir(home), 'credentials.json'))).toBe(true);
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
    use(s, REMOTE);
    saveSession(s, { ...session, issuedFor: REMOTE });
    use(s, LOCAL);
    expect(loadSession(s)).toBeNull();
    use(s, REMOTE);
    expect(loadSession(s)).toEqual({ ...session, issuedFor: REMOTE, authEndpoint: REMOTE.authEndpoint });
  });

  it('refuses to file a session before a backend is chosen', () => {
    const s = bareStore();
    expect(() => saveSession(s, session)).toThrow('No backend chosen');
    expect(s.getCurrentContext()).toBeNull();
  });

  it('writes credentials with mode 0600', () => {
    const s = store();
    saveSession(s, session);
    expect(fs.statSync(path.join(configDir(home), 'credentials.json')).mode & 0o777).toBe(0o600);
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
    expect(() => backendFromEndpoints({ api: 'not a url' })).toThrow('is not an absolute URL');
  });

  it('round-trips all five planes and returns null before one is chosen', () => {
    const s = bareStore();
    expect(current(s)).toBeNull();
    expect(addBackend(s, REMOTE).name).toBe('example.com');
    expect(current(s)).toBeNull();
    selectBackend(s, 'example.com');
    expect(current(s)).toEqual(REMOTE);
    use(s, LOCAL);
    expect(current(s)).toEqual(LOCAL);
  });

  it('treats a context missing a plane as no backend rather than guessing one', () => {
    const s = store();
    s.createContext('partial', {
      endpoint: REMOTE.apiEndpoint,
      targets: { api: { endpoint: REMOTE.apiEndpoint }, auth: { endpoint: REMOTE.authEndpoint } }
    });
    s.setCurrentContext('partial');
    expect(current(s)).toBeNull();
    expect(listBackends(s)).toContainEqual({ name: 'partial', current: true, status: 'incomplete', missing: ['modules', 'agent', 'compute'], apiEndpoint: REMOTE.apiEndpoint });
  });

  it('lists, selects and removes backends, and refuses to remove one while a session is filed under it', () => {
    const s = bareStore();
    use(s, REMOTE);
    saveSession(s, session);
    use(s, LOCAL);
    expect(listBackends(s).sort((a, b) => a.name.localeCompare(b.name))).toEqual([
      { name: 'example.com', current: false, status: 'complete', backend: REMOTE },
      { name: 'localhost-3000', current: true, status: 'complete', backend: LOCAL }
    ]);
    expect(() => selectBackend(s, 'missing')).toThrow('No backend context named "missing"');

    expect(() => removeBackend(s, 'example.com')).toThrow(ContextInUseError);
    expect(s.getCredentials('example.com')).not.toBeNull();
    s.removeCredentials('example.com');
    expect(removeBackend(s, 'example.com')).toBe(true);
    expect(listBackends(s).map((b) => b.name)).toEqual(['localhost-3000']);
    expect(removeBackend(s, 'example.com')).toBe(false);
  });
});
