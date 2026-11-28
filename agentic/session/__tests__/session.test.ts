import { ConfigStore } from 'appstash';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { checkContextName, ContextNameError, openStore, saveSession, stashBaseDir } from '../src/account-store';
import {
  addBackend,
  BackendConfig,
  backendFromEndpoints,
  ContextInUseError,
  contextNameFor,
  listBackends,
  readBackend,
  removeBackend,
  selectBackend
} from '../src/backend-store';
import { resolveSession } from '../src/session';
import { sessionToolsHost } from '../src/tools-host';

const LOCAL = backendFromEndpoints({ api: 'http://api.localhost/graphql' });
const REMOTE = backendFromEndpoints({ api: 'https://api.example.com/graphql' });
const OTHER = 'https://api.other-backend.example/graphql';

let home: string;
let store: ConfigStore;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'session-resolve-'));
  store = openStore(home);
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

const stored = {
  userId: 'stored-user',
  email: 'dev@example.com',
  accessToken: 'stored-token',
  apiKey: 'stored-key',
  keyId: 'stored-key-id',
  signedInAt: 1
};

function signInStored(config: BackendConfig = REMOTE): string {
  const { name } = addBackend(store, config);
  selectBackend(store, name);
  saveSession(store, { ...stored, issuedFor: config });
  return name;
}

const resolve = (env: NodeJS.ProcessEnv = {}, context?: string) => resolveSession({ env, store, context });

describe('backendFromEndpoints', () => {
  it.each([
    ['https://api.example.com/graphql', 'https://auth.example.com/graphql'],
    ['http://api.localhost/graphql', 'http://auth.localhost/graphql'],
    ['http://api.localhost:3000/graphql', 'http://auth.localhost:3000/graphql'],
    ['https://api.example.co.uk/graphql', 'https://auth.example.co.uk/graphql']
  ])('derives the planes of %s', (api, auth) => {
    expect(backendFromEndpoints({ api }).authEndpoint).toBe(auth);
  });

  it.each([
    ['https://example.com/graphql', 'not-derivable'],
    ['https://constructive.example.com/graphql', 'not-derivable'],
    ['https://api-demo.example.com/graphql', 'not-derivable'],
    ['http://localhost:3000/graphql', 'not-derivable'],
    ['https://api/graphql', 'not-derivable'],
    ['https://[::1]:3000/graphql', 'not-derivable'],
    ['http://127.0.0.1:3000/graphql', 'not-derivable'],
    ['https://user:pw@api.example.com/graphql', 'userinfo'],
    ['ftp://api.example.com/x', 'scheme'],
    ['api.example.com/graphql', 'not-a-url'],
    ['', 'not-a-url']
  ])('refuses %s (%s) and says how to give every plane', (api, reason) => {
    let error: any;
    try {
      backendFromEndpoints({ api });
    } catch (caught) {
      error = caught;
    }
    expect(error?.reason).toBe(reason);
    expect(error.message).not.toContain('pw@');
    if (reason === 'not-derivable') expect(error.message).toContain('every plane');
  });

  it('takes every plane explicitly when the api host cannot derive them', () => {
    const ep = 'http://127.0.0.1:3000/graphql';
    expect(backendFromEndpoints({ api: ep, auth: ep, modules: ep, agent: ep, compute: ep })).toEqual({
      apiEndpoint: ep, authEndpoint: ep, modulesEndpoint: ep, agentEndpoint: ep, computeEndpoint: ep
    });
    expect(() => backendFromEndpoints({ api: ep, auth: 'https://user:pw@auth.example.com/graphql', modules: ep, agent: ep, compute: ep }))
      .toThrow(expect.objectContaining({ reason: 'userinfo' }));
  });
});

describe('resolveSession from the store', () => {
  it('is no-backend when none is chosen or the named context is unknown', () => {
    expect(resolve()).toEqual({ kind: 'no-backend', context: null });
    signInStored();
    expect(resolve({}, 'nowhere.test')).toEqual({ kind: 'no-backend', context: 'nowhere.test' });
  });

  it('pairs the stored session with the endpoints of its own context', () => {
    signInStored();
    expect(resolve()).toMatchObject({
      kind: 'signed-in',
      source: 'store',
      context: 'example.com',
      backend: REMOTE,
      account: { userId: 'stored-user', accessToken: 'stored-token', key: { kind: 'active', apiKey: 'stored-key', keyId: 'stored-key-id' } }
    });
  });

  it('reads the context it is given, not the active one', () => {
    signInStored();
    selectBackend(store, addBackend(store, LOCAL).name);
    expect(resolve()).toMatchObject({ kind: 'signed-out', context: 'localhost' });
    expect(resolve({}, 'example.com')).toMatchObject({ kind: 'signed-in', context: 'example.com', backend: REMOTE });
  });

  it('is signed-out for a complete context with no session', () => {
    selectBackend(store, addBackend(store, LOCAL).name);
    expect(resolve()).toEqual({ kind: 'signed-out', source: 'store', context: 'localhost', backend: LOCAL });
  });

  it('names the missing planes of a context another app wrote, and never fills them in', () => {
    signInStored(LOCAL);
    const four = LOCAL;
    store.createContext('localnet', {
      endpoint: four.apiEndpoint,
      targets: { api: { endpoint: four.apiEndpoint }, auth: { endpoint: four.authEndpoint }, modules: { endpoint: four.modulesEndpoint }, agent: { endpoint: four.agentEndpoint } }
    });
    store.setCurrentContext('localnet');
    saveSession(store, stored);

    expect(resolve()).toEqual({ kind: 'incomplete-backend', context: 'localnet', missing: ['compute'], apiEndpoint: LOCAL.apiEndpoint });
    expect(listBackends(store)).toContainEqual({ name: 'localnet', current: true, status: 'incomplete', missing: ['compute'], apiEndpoint: LOCAL.apiEndpoint });
  });
});

describe('resolveSession with environment overrides', () => {
  it('never sends the stored token to a backend that CONSTRUCTIVE_API_ENDPOINT names', () => {
    signInStored();
    expect(resolve({ CONSTRUCTIVE_API_ENDPOINT: OTHER })).toEqual({
      kind: 'signed-out',
      source: 'env',
      context: null,
      backend: backendFromEndpoints({ api: OTHER })
    });
    expect(resolve({ CONSTRUCTIVE_MODULES_ENDPOINT: 'https://modules.other.example/graphql', CONSTRUCTIVE_API_ENDPOINT: REMOTE.apiEndpoint }))
      .toMatchObject({ kind: 'signed-out', source: 'env' });
  });

  it('keeps the stored session when the override names the backend of its context', () => {
    signInStored();
    expect(resolve({ CONSTRUCTIVE_API_ENDPOINT: REMOTE.apiEndpoint })).toMatchObject({ kind: 'signed-in', source: 'store', context: 'example.com' });
  });

  it('uses a complete credential override with the backend it names', () => {
    signInStored();
    const env = { CONSTRUCTIVE_USER_ID: 'env-user', CONSTRUCTIVE_ACCESS_TOKEN: 'env-token', CONSTRUCTIVE_API_ENDPOINT: OTHER };
    expect(resolve(env)).toMatchObject({
      kind: 'signed-in',
      source: 'env',
      context: null,
      backend: { apiEndpoint: OTHER },
      account: { userId: 'env-user', accessToken: 'env-token', key: { kind: 'none' } }
    });
  });

  it.each([
    [{ CONSTRUCTIVE_API_KEY: 'k' }, 'CONSTRUCTIVE_USER_ID'],
    [{ CONSTRUCTIVE_ACCESS_TOKEN: 't' }, 'CONSTRUCTIVE_USER_ID'],
    [{ CONSTRUCTIVE_USER_ID: 'u' }, 'CONSTRUCTIVE_ACCESS_TOKEN'],
    [{ CONSTRUCTIVE_USER_ID: 'u', CONSTRUCTIVE_ACCESS_TOKEN: 't' }, 'CONSTRUCTIVE_API_ENDPOINT'],
    [{ CONSTRUCTIVE_MODULES_ENDPOINT: 'https://modules.example.com/graphql' }, 'CONSTRUCTIVE_API_ENDPOINT'],
    [{ CONSTRUCTIVE_API_ENDPOINT: 'https://example.com/graphql' }, 'CONSTRUCTIVE_API_ENDPOINT'],
    [{ CONSTRUCTIVE_API_ENDPOINT: '' }, 'CONSTRUCTIVE_API_ENDPOINT'],
    [{ CONSTRUCTIVE_STASH_DIR: '' }, 'CONSTRUCTIVE_STASH_DIR']
  ])('makes the incomplete or wrong override %j invalid-override, naming %s', (env: NodeJS.ProcessEnv, variable) => {
    signInStored();
    const session = resolveSession({ env, ...(env.CONSTRUCTIVE_STASH_DIR === undefined ? { store } : {}) });
    expect(session).toMatchObject({ kind: 'invalid-override', variable });
    if (session.kind === 'invalid-override') expect(session.fix).toBeTruthy();
  });

  it('takes every plane from the environment for a host that cannot derive them', () => {
    const ep = 'http://127.0.0.1:3000/graphql';
    const env = {
      CONSTRUCTIVE_API_ENDPOINT: ep,
      CONSTRUCTIVE_AUTH_ENDPOINT: ep,
      CONSTRUCTIVE_MODULES_ENDPOINT: ep,
      CONSTRUCTIVE_AGENT_ENDPOINT: ep,
      CONSTRUCTIVE_COMPUTE_ENDPOINT: ep
    };
    expect(resolve(env)).toMatchObject({ kind: 'signed-out', source: 'env', backend: { authEndpoint: ep, computeEndpoint: ep } });
  });
});

describe('the stash directory', () => {
  it('refuses an empty CONSTRUCTIVE_STASH_DIR instead of opening the real store', () => {
    expect(() => stashBaseDir({ CONSTRUCTIVE_STASH_DIR: '' })).toThrow('CONSTRUCTIVE_STASH_DIR');
    expect(stashBaseDir({})).toBeUndefined();
  });
});

describe('addBackend', () => {
  it('keeps the session of a context when the endpoints are equal, and refuses to replace them while it is filed there', () => {
    signInStored(backendFromEndpoints({ api: 'http://api.example.com/graphql' }));
    expect(addBackend(store, backendFromEndpoints({ api: 'http://api.example.com/graphql' }))).toEqual({ name: 'example.com' });
    expect(() => addBackend(store, REMOTE)).toThrow(ContextInUseError);
    expect(store.getCredentials('example.com')).not.toBeNull();
  });
});

describe('sessionToolsHost', () => {
  const read = (get: () => unknown): unknown => {
    try {
      return get();
    } catch (err) {
      return { threw: (err as Error).message };
    }
  };

  const desktopContext = () => {
    store.createContext('localnet', {
      endpoint: LOCAL.apiEndpoint,
      targets: { api: { endpoint: LOCAL.apiEndpoint }, auth: { endpoint: LOCAL.authEndpoint }, modules: { endpoint: LOCAL.modulesEndpoint }, agent: { endpoint: LOCAL.agentEndpoint } }
    });
    store.setCurrentContext('localnet');
    saveSession(store, stored);
  };

  const hostConfig = (backend: BackendConfig) => ({
    apiEndpoint: backend.apiEndpoint, modulesEndpoint: backend.modulesEndpoint, agentEndpoint: backend.agentEndpoint, computeEndpoint: backend.computeEndpoint
  });

  it.each<[string, () => NodeJS.ProcessEnv, unknown, unknown]>([
    ['no-backend', () => ({}), null, undefined],
    ['signed-out (store)', () => (selectBackend(store, addBackend(store, LOCAL).name), {}), null, hostConfig(LOCAL)],
    ['signed-out (env backend)', () => (signInStored(), { CONSTRUCTIVE_API_ENDPOINT: OTHER }), null, hostConfig(backendFromEndpoints({ api: OTHER }))],
    ['signed-in', () => (signInStored(), {}), { userId: 'stored-user', email: 'dev@example.com', accessToken: 'stored-token', apiKey: 'stored-key' }, hostConfig(REMOTE)],
    [
      'signed-in (environment, no email)',
      () => ({ CONSTRUCTIVE_USER_ID: 'env-user', CONSTRUCTIVE_ACCESS_TOKEN: 'env-token', CONSTRUCTIVE_API_ENDPOINT: OTHER }),
      { userId: 'env-user', accessToken: 'env-token' },
      hostConfig(backendFromEndpoints({ api: OTHER }))
    ],
    [
      'invalid-override (credential without an api endpoint)',
      () => ({ CONSTRUCTIVE_USER_ID: 'u', CONSTRUCTIVE_ACCESS_TOKEN: 'secret-token' }),
      { threw: expect.stringContaining('CONSTRUCTIVE_API_ENDPOINT') },
      { threw: expect.stringContaining('CONSTRUCTIVE_API_ENDPOINT') }
    ],
    [
      'invalid-override (plane variable alone)',
      () => ({ CONSTRUCTIVE_MODULES_ENDPOINT: 'https://modules.example.com/graphql' }),
      { threw: expect.stringContaining('Set CONSTRUCTIVE_API_ENDPOINT') },
      { threw: expect.stringContaining('Set CONSTRUCTIVE_API_ENDPOINT') }
    ],
    [
      'issuer-mismatch (a recorded foreign issuer)',
      () => (signInStored(), saveSession(store, { ...stored, issuedFor: backendFromEndpoints({ api: 'http://api.a.localhost/graphql' }) }), {}),
      { threw: expect.stringMatching(/"example\.com" was issued for another backend: the api endpoint is https:\/\/api\.example\.com\/graphql, but the session was issued for http:\/\/api\.a\.localhost\/graphql.*sign-in replaces it/) },
      hostConfig(REMOTE)
    ],
    [
      'issuer-mismatch (no issuer recorded)',
      () => (signInStored(), saveSession(store, stored), {}),
      { threw: expect.stringMatching(/"example\.com" does not record the backend it was issued for.*sign-in replaces it/) },
      hostConfig(REMOTE)
    ],
    [
      'incomplete-backend',
      () => (desktopContext(), {}),
      { threw: expect.stringMatching(/"localnet" lacks the compute endpoint.*Run `agent login`/) },
      { threw: expect.stringMatching(/"localnet" lacks the compute endpoint.*Run `agent login`/) }
    ]
  ])('%s: gives the account and the backend, nothing, or the cause as a throw', (_kind, setup, account, backend) => {
    const env = { ...setup(), CONSTRUCTIVE_STASH_DIR: home };
    const host = sessionToolsHost({ signInHint: 'Sign in.', repairHint: 'Run `agent login` to store a complete backend.', env });
    expect(read(() => host.account())).toEqual(account);
    expect(read(() => host.backendConfig())).toEqual(backend);
    expect(JSON.stringify(read(() => host.account()))).not.toContain('secret-token');
  });

  it('throws a store that cannot be read, with its own message', () => {
    fs.mkdirSync(path.join(home, '.constructive', 'config'), { recursive: true });
    fs.writeFileSync(path.join(home, '.constructive', 'config', 'settings.json'), '{ not json');
    const host = sessionToolsHost({ signInHint: 'Sign in.', env: { CONSTRUCTIVE_STASH_DIR: home } });
    expect(() => host.account()).toThrow();
    expect(() => host.backendConfig()).toThrow();
  });

  it('throws an empty CONSTRUCTIVE_STASH_DIR as the cause', () => {
    const host = sessionToolsHost({ signInHint: 'Sign in.', env: { CONSTRUCTIVE_STASH_DIR: '' } });
    expect(() => host.account()).toThrow('CONSTRUCTIVE_STASH_DIR is set but empty');
  });

  it('gives the account and the endpoints of one resolution', () => {
    signInStored();
    const host = sessionToolsHost({ signInHint: 'Sign in.', env: { CONSTRUCTIVE_STASH_DIR: home } });
    expect(host.account()).toEqual({ userId: 'stored-user', email: 'dev@example.com', accessToken: 'stored-token', apiKey: 'stored-key' });
    expect(host.backendConfig()).toEqual({
      apiEndpoint: REMOTE.apiEndpoint, modulesEndpoint: REMOTE.modulesEndpoint, agentEndpoint: REMOTE.agentEndpoint, computeEndpoint: REMOTE.computeEndpoint
    });

    const elsewhere = sessionToolsHost({ signInHint: 'Sign in.', env: { CONSTRUCTIVE_STASH_DIR: home, CONSTRUCTIVE_API_ENDPOINT: OTHER } });
    expect(elsewhere.account()).toBeNull();
    expect(elsewhere.backendConfig()).toMatchObject({ apiEndpoint: OTHER });
  });
});

describe('context names', () => {
  const configDir = () => path.join(home, '.constructive', 'config');
  const snapshot = () => {
    const files = fs.readdirSync(home, { recursive: true }) as string[];
    return Object.fromEntries(files.map((f) => path.join(home, f)).filter((f) => fs.statSync(f).isFile()).map((f) => [f, fs.readFileSync(f, 'utf8')]));
  };

  it.each(['../settings', '../credentials', '../../../victim', 'a/b', 'a\\b', '', '.hidden', '-flag', 'a..b', 'x'.repeat(101), 'naïve', 'a b'])(
    'refuses %j in every function that takes a name, before any file operation',
    (bad) => {
      signInStored();
      fs.writeFileSync(path.join(home, 'victim.json'), '{"keep":true}');
      const before = snapshot();
      const calls: Array<[string, () => unknown]> = [
        ['addBackend', () => addBackend(store, REMOTE, bad)],
        ['selectBackend', () => selectBackend(store, bad)],
        ['removeBackend', () => removeBackend(store, bad)],
        ['readBackend', () => readBackend(store, bad)],
        ['saveSession', () => saveSession(store, stored, bad)],
        ['resolveSession', () => resolveSession({ store, env: {}, context: bad })]
      ];
      for (const [name, call] of calls) {
        let error: unknown;
        try {
          call();
        } catch (caught) {
          error = caught;
        }
        expect([name, error]).toEqual([name, expect.any(ContextNameError)]);
        expect((error as Error).message).toContain('letters, digits');
      }
      expect(snapshot()).toEqual(before);
      expect(fs.existsSync(path.join(configDir(), 'credentials.json'))).toBe(true);
    }
  );

  it.each([
    'https://api.example.com/graphql',
    'http://api.localhost:3000/graphql',
    'http://127.0.0.1:3000/graphql',
    'https://[::1]:8443/graphql',
    'https://api.xn--bcher-kva.example/graphql',
    'http://localhost/graphql',
    `https://api.${'a'.repeat(60)}.${'b'.repeat(60)}.example/graphql`
  ])('names the backend of %s with a name that passes the check', (api) => {
    const ep = api;
    const name = contextNameFor(backendFromEndpoints({ api, auth: ep, modules: ep, agent: ep, compute: ep }));
    expect(checkContextName(name)).toBe(name);
  });
});

describe('the issuer of a stored session', () => {
  const A = backendFromEndpoints({ api: 'http://api.a.localhost/graphql' });
  const B = backendFromEndpoints({ api: 'http://api.b.localhost/graphql' });

  it('uses a stored session only when it was issued for the backend of its context', () => {
    signInStored(B);
    expect(resolve()).toMatchObject({ kind: 'signed-in', context: 'b.localhost' });

    saveSession(store, { ...stored, issuedFor: A });
    expect(resolve()).toEqual({ kind: 'issuer-mismatch', source: 'store', context: 'b.localhost', backend: B, issuedFor: A, differs: ['api', 'auth', 'modules', 'agent', 'compute'] });

    saveSession(store, stored);
    expect(resolve()).toEqual({ kind: 'issuer-mismatch', source: 'store', context: 'b.localhost', backend: B, issuedFor: null, differs: [] });
    const host = sessionToolsHost({ signInHint: 'Sign in.', env: { CONSTRUCTIVE_STASH_DIR: home } });
    expect(() => host.account()).toThrow('does not record the backend it was issued for');
    expect(host.backendConfig()).toMatchObject({ apiEndpoint: B.apiEndpoint });
  });

  it('refuses the suggested repair of a context another app wrote while a session issued elsewhere is filed there', () => {
    store.createContext('custom', {
      endpoint: B.apiEndpoint,
      targets: { api: { endpoint: B.apiEndpoint }, auth: { endpoint: B.authEndpoint }, modules: { endpoint: B.modulesEndpoint }, agent: { endpoint: B.agentEndpoint } }
    });
    store.setCurrentContext('custom');
    saveSession(store, { ...stored, issuedFor: A });
    expect(resolve()).toMatchObject({ kind: 'incomplete-backend', context: 'custom', missing: ['compute'] });

    expect(() => addBackend(store, B, 'custom')).toThrow('Sign out of "custom" first');
    expect(resolve()).toMatchObject({ kind: 'incomplete-backend', context: 'custom', missing: ['compute'] });
  });

  it('keeps a session through the repair when it was issued for exactly the new backend', () => {
    store.createContext('custom', { endpoint: B.apiEndpoint, targets: { api: { endpoint: B.apiEndpoint }, auth: { endpoint: B.authEndpoint } } });
    store.setCurrentContext('custom');
    saveSession(store, { ...stored, issuedFor: B });
    expect(addBackend(store, B, 'custom')).toEqual({ name: 'custom' });
    expect(resolve()).toMatchObject({ kind: 'signed-in', context: 'custom' });
  });
});

describe('a named context and the environment', () => {
  it.each<[string, NodeJS.ProcessEnv, string]>([
    ['a credential', { CONSTRUCTIVE_USER_ID: 'env-user', CONSTRUCTIVE_ACCESS_TOKEN: 'env-token', CONSTRUCTIVE_API_ENDPOINT: OTHER }, 'CONSTRUCTIVE_USER_ID'],
    ['an endpoint for another backend', { CONSTRUCTIVE_API_ENDPOINT: OTHER }, 'CONSTRUCTIVE_API_ENDPOINT']
  ])('is a conflict when %s in the environment would decide the session', (_name, env, variable) => {
    signInStored();
    selectBackend(store, addBackend(store, LOCAL).name);
    const session = resolve(env, 'example.com');
    expect(session).toMatchObject({ kind: 'conflict', context: 'example.com', variable });
    if (session.kind === 'conflict') {
      expect(session.problem).toContain('"example.com"');
      expect(session.fix).toContain(variable);
    }
    expect(resolve(env)).toMatchObject({ source: 'env' });
  });

  it('is no conflict when the environment names the backend of the named context', () => {
    signInStored();
    expect(resolve({ CONSTRUCTIVE_API_ENDPOINT: REMOTE.apiEndpoint }, 'example.com')).toMatchObject({ kind: 'signed-in', source: 'store', context: 'example.com' });
  });
});

describe('a stored session is bound to the whole backend it was issued for', () => {
  const EVIL = 'http://api.evil.localhost/graphql';
  const rewrite = (name: string, change: (targets: Record<string, { endpoint: string }>) => void) => {
    const file = path.join(home, '.constructive', 'config', 'contexts', `${name}.json`);
    const ctx = JSON.parse(fs.readFileSync(file, 'utf8'));
    change(ctx.targets);
    fs.writeFileSync(file, JSON.stringify(ctx));
  };

  it.each<[string, (t: Record<string, { endpoint: string }>) => void, string[]]>([
    ['the api plane names another host, the auth plane unchanged', (t) => (t.api.endpoint = EVIL), ['api']],
    ['the modules plane names another host', (t) => (t.modules.endpoint = EVIL.replace('api.', 'modules.')), ['modules']],
    ['the auth plane has a trailing slash', (t) => (t.auth.endpoint += '/'), ['auth']],
    ['two planes change', (t) => ((t.agent.endpoint = EVIL), (t.compute.endpoint = EVIL)), ['agent', 'compute']]
  ])('does not use the session when %s, and says which plane differs', (_name, change, differs) => {
    const name = signInStored();
    rewrite(name, change);
    const session = resolve();
    expect(session).toMatchObject({ kind: 'issuer-mismatch', context: name, issuedFor: REMOTE, differs });
    const host = sessionToolsHost({ signInHint: 'Sign in.', env: { CONSTRUCTIVE_STASH_DIR: home } });
    expect(() => host.account()).toThrow(`${differs[0]} endpoint`);
  });

  it('treats a session that records only the auth endpoint as unproven, and never uses it', () => {
    const name = signInStored();
    store.setCredentials(name, { token: 'stored-token', userId: 'stored-user', email: 'e', apiKey: 'stored-key', keyId: 'k', signedInAt: 1, authEndpoint: REMOTE.authEndpoint } as never);
    expect(resolve()).toMatchObject({ kind: 'issuer-mismatch', issuedFor: null, differs: [] });
  });

  it('still writes the auth endpoint where Desktop reads it', () => {
    const name = signInStored();
    expect(store.getCredentials(name)).toMatchObject({ authEndpoint: REMOTE.authEndpoint, issuedFor: REMOTE });
  });
});

describe('stored context names', () => {
  it('lists a stored context whose name is not valid as unusable, and keeps listing the others', () => {
    signInStored();
    const dir = path.join(home, '.constructive', 'config', 'contexts');
    fs.writeFileSync(path.join(dir, 'odd.json'), JSON.stringify({ name: '../credentials', endpoint: LOCAL.apiEndpoint, targets: {} }));
    const rows = listBackends(store);
    expect(rows).toContainEqual(expect.objectContaining({ name: 'example.com', status: 'complete' }));
    expect(rows).toContainEqual({ name: '../credentials', current: false, status: 'invalid-name', reason: expect.stringContaining('not a valid context name') });
  });

  it.each(['PROD', 'Prod', 'example.COM'])('refuses the upper-case name %s, so it can never reach the lower-case file on a case-insensitive disk', (name) => {
    selectBackend(store, addBackend(store, REMOTE, 'prod').name);
    saveSession(store, { ...stored, issuedFor: REMOTE }, 'prod');
    expect(() => removeBackend(store, name)).toThrow(ContextNameError);
    expect(() => readBackend(store, name)).toThrow(ContextNameError);
    expect(() => addBackend(store, REMOTE, name)).toThrow(ContextNameError);
    expect(store.loadContext('prod')).not.toBeNull();
    expect(store.getCredentials('prod')).not.toBeNull();
  });
});
