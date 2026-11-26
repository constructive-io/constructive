import { ConfigStore } from 'appstash';
import * as fs from 'fs';
import * as http from 'http';
import { AddressInfo } from 'net';
import * as os from 'os';
import * as path from 'path';

import { loadSession, openStore, saveSession } from '../src/account-store';
import { signIn, signOut, verifySession } from '../src/auth';
import { SignInError } from '../src/auth-error';
import { addBackend, BackendConfig, backendFromEndpoints, ContextInUseError, contextNameFor, removeBackend, selectBackend } from '../src/backend-store';
import { resolveSession } from '../src/session';

type Reply = { data?: unknown; errors?: unknown[] } | { status: number } | 'hang';

interface Call {
  op: 'signIn' | 'signOut' | 'createApiKey' | 'revokeApiKey' | 'currentUser';
  bearer?: string;
  variables: any;
}

/** A GraphQL auth endpoint that answers each operation from `replies` and records every call. */
class FakeAuth {
  calls: Call[] = [];
  replies: Partial<Record<Call['op'], (call: Call, n: number) => Reply>> = {};
  private server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const { query = '', variables } = JSON.parse(body || '{}');
      const op = (['signIn', 'signOut', 'createApiKey', 'revokeApiKey', 'currentUser'] as const).find((name) => query.includes(name));
      const bearer = req.headers.authorization?.replace(/^Bearer /, '');
      const call: Call = { op, bearer, variables };
      this.calls.push(call);
      const reply = this.replies[op]?.(call, this.calls.filter((c) => c.op === op).length) ?? { data: {} };
      if (reply === 'hang') return;
      if ('status' in reply) {
        res.statusCode = reply.status;
        res.end('upstream failed');
        return;
      }
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(reply));
    });
  });

  endpoint = '';

  async start(): Promise<void> {
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    this.endpoint = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}/graphql`;
  }

  async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise((resolve) => this.server.close(resolve));
  }

  backend(): BackendConfig {
    const ep = this.endpoint;
    return backendFromEndpoints({ api: ep, auth: ep, modules: ep, agent: ep, compute: ep });
  }

  context(): string {
    return contextNameFor(this.backend());
  }

  ops(): string[] {
    return this.calls.map((call) => call.op);
  }
}

const signedIn = (userId: string, n: number) => ({
  data: { signIn: { result: { userId, accessToken: `access-${userId}-${n}`, accessTokenExpiresAt: '2030-01-01T00:00:00Z', mfaRequired: false } } }
});
const minted = (n: number) => ({ data: { createApiKey: { result: { apiKey: `key-${n}`, keyId: `kid-${n}`, expiresAt: '2031-01-01T00:00:00Z' } } } });
const revoked = { data: { revokeApiKey: { result: true } } };
const failure = (code: string, message = code) => ({ errors: [{ message, extensions: { code } }] });

let home: string;
let store: ConfigStore;
let auth: FakeAuth;

beforeEach(async () => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'session-auth-'));
  store = openStore(home);
  auth = new FakeAuth();
  await auth.start();
  auth.replies = {
    signIn: (_call, n) => signedIn('user-1', n),
    createApiKey: (_call, n) => minted(n),
    revokeApiKey: () => revoked
  };
});

afterEach(async () => {
  await auth.stop();
  fs.rmSync(home, { recursive: true, force: true });
});

const login = (password = 'pw', backend = auth.backend()) => signIn({ store, backend, email: ' dev@example.com ', password });

async function signInError(promise: Promise<unknown>): Promise<SignInError> {
  try {
    await promise;
  } catch (error) {
    return error as SignInError;
  }
  throw new Error('expected the sign-in to fail');
}

describe('signIn', () => {
  it('mints a key, then stores the backend, the session and the choice of context', async () => {
    const result = await login();
    expect(auth.ops()).toEqual(['signIn', 'createApiKey', 'signOut']);
    expect(auth.calls[0].variables.input).toEqual({ email: 'dev@example.com', password: 'pw' });
    expect(auth.calls[1].bearer).toBe('access-user-1-1');
    expect(result).toMatchObject({ context: auth.context(), apiKey: { kind: 'minted' }, previousKey: { kind: 'absent' } });
    expect(loadSession(store)).toMatchObject({ userId: 'user-1', apiKey: 'key-1', keyId: 'kid-1', issuedFor: auth.backend(), authEndpoint: auth.endpoint });
    expect(store.getCurrentContext()?.name).toBe(auth.context());
  });

  it('ends its sign-in session on the server once the key is made, and stores the key as the bearer', async () => {
    await login();
    const signOut = auth.calls.findIndex((call) => call.op === 'signOut');
    expect(signOut).toBeGreaterThan(auth.ops().indexOf('createApiKey'));
    expect(auth.calls[signOut].bearer).toBe('access-user-1-1');
    expect(loadSession(store)).toMatchObject({ accessToken: 'key-1', accessTokenExpiresAt: '2031-01-01T00:00:00Z', apiKey: 'key-1' });
  });

  it('fails, stores nothing, and still ends its sign-in session when no key can be made', async () => {
    auth.replies.createApiKey = () => failure('API_KEYS_DISABLED', 'keys are off');
    const error = await signInError(login());
    expect(error).toMatchObject({ kind: 'refused', code: 'API_KEYS_DISABLED' });
    expect(error.message).toContain('API_KEYS_DISABLED');
    expect(auth.calls.filter((call) => call.op === 'signOut').map((call) => call.bearer)).toEqual(['access-user-1-1']);
    expect(store.listContexts()).toEqual([]);
    expect(loadSession(store, auth.context())).toBeNull();
  });

  it('asks for a person key that lasts 30 days', async () => {
    await login();
    expect(auth.calls[1].op).toBe('createApiKey');
    expect(auth.calls[1].variables.input.expiresIn).toEqual({ days: 30 });
  });

  it('revokes the key of the session it replaces', async () => {
    await login();
    const second = await login();
    expect(auth.ops()).toEqual(['signIn', 'createApiKey', 'signOut', 'signIn', 'createApiKey', 'revokeApiKey', 'signOut']);
    expect(auth.calls[5].variables.input).toEqual({ keyId: 'kid-1' });
    expect(second.previousKey).toEqual({ kind: 'revoked', keyId: 'kid-1' });
    expect(loadSession(store)).toMatchObject({ apiKey: 'key-2', keyId: 'kid-2' });
  });

  it('revokes the replaced key with that key when another account signs in', async () => {
    await login();
    auth.replies.signIn = (_call, n) => signedIn('user-2', n);
    const second = await login();
    const revoke = auth.calls.find((call) => call.op === 'revokeApiKey');
    expect(revoke).toMatchObject({ bearer: 'key-1', variables: { input: { keyId: 'kid-1' } } });
    expect(second.previousKey).toEqual({ kind: 'revoked', keyId: 'kid-1' });
  });

  it('frees the key limit by revoking the replaced key, then mints again', async () => {
    await login();
    auth.replies.createApiKey = (_call, n) => (n === 2 ? failure('API_KEY_LIMIT_REACHED') : minted(n));
    const second = await login();
    expect(auth.ops().slice(3)).toEqual(['signIn', 'createApiKey', 'revokeApiKey', 'createApiKey', 'signOut']);
    expect(second).toMatchObject({ apiKey: { kind: 'minted' }, previousKey: { kind: 'revoked', keyId: 'kid-1' } });
  });

  it('keeps the replaced key when the same account cannot mint a new one', async () => {
    await login();
    auth.replies.createApiKey = () => failure('API_KEYS_DISABLED');
    const second = await login();
    expect(second).toMatchObject({ apiKey: { kind: 'not-minted' }, previousKey: { kind: 'kept', keyId: 'kid-1' } });
    expect(loadSession(store)).toMatchObject({ accessToken: 'key-1', apiKey: 'key-1', keyId: 'kid-1' });
  });

  it.each<[string, Reply | 'unreachable', string]>([
    ['no record (wrong email or password)', { data: { signIn: { result: null } } }, 'invalid-credentials'],
    ['an empty record', { data: { signIn: { result: { userId: null, accessToken: null, mfaRequired: false } } } }, 'invalid-credentials'],
    ['a second factor', { data: { signIn: { result: { userId: null, accessToken: null, mfaRequired: true } } } }, 'second-factor-required'],
    ['a locked account', failure('ACCOUNT_LOCKED_EXCEED_ATTEMPTS'), 'refused'],
    ['an HTTP 502', { status: 502 }, 'server-error'],
    ['an HTTP 429', { status: 429 }, 'refused'],
    ['a refusal named only in the message text', { errors: [{ message: 'ACCOUNT_LOCKED_EXCEED_ATTEMPTS' }] }, 'server-error'],
    ['a masked server error', failure('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'), 'server-error'],
    ['a closed port', 'unreachable', 'backend-unreachable']
  ])('tells %s apart', async (_name, reply, kind) => {
    let backend = auth.backend();
    if (reply === 'unreachable') {
      await auth.stop();
      backend = auth.backend();
    } else {
      auth.replies.signIn = () => reply;
    }
    const error = await signInError(login('pw', backend));
    expect(error).toBeInstanceOf(SignInError);
    expect(error.kind).toBe(kind);
    expect(error.message).not.toContain('pw');
    expect(store.listContexts()).toEqual([]);
    expect(loadSession(store, auth.context())).toBeNull();
  });

  it('files the session under the context it is given, keeping its name', async () => {
    const result = await signIn({ store, backend: auth.backend(), context: 'dev', email: 'dev@example.com', password: 'pw' });
    expect(result.context).toBe('dev');
    expect(store.getCurrentContext()?.name).toBe('dev');
    expect(loadSession(store, 'dev')).toMatchObject({ userId: 'user-1' });
    expect(store.loadContext(auth.context())).toBeNull();
  });

  it('rejects empty credentials without a network call', async () => {
    const error = await signInError(signIn({ store, backend: auth.backend(), email: ' ', password: 'pw' }));
    expect(error.kind).toBe('invalid-input');
    expect(auth.calls).toEqual([]);
  });
});

describe('a context that holds a session of another backend', () => {
  it('is refused by addBackend with the session kept, and is replaced by signIn only after that key is revoked', async () => {
    const other = new FakeAuth();
    await other.start();
    try {
      selectBackend(store, addBackend(store, other.backend(), 'custom').name);
      saveSession(store, { userId: 'user-1', email: 'e', accessToken: 'old-key', apiKey: 'old-key', keyId: 'kid-old', signedInAt: 1, issuedFor: other.backend() }, 'custom');
      expect(() => addBackend(store, auth.backend(), 'custom')).toThrow(ContextInUseError);
      expect(() => removeBackend(store, 'custom')).toThrow(ContextInUseError);
      expect(loadSession(store, 'custom')).toMatchObject({ keyId: 'kid-old', issuedFor: other.backend() });
      expect(store.loadContext('custom')?.targets.api.endpoint).toBe(other.endpoint);

      const result = await signIn({ store, backend: auth.backend(), context: 'custom', email: 'dev@example.com', password: 'pw' });
      expect(result.previousKey).toEqual({ kind: 'revoked', keyId: 'kid-old' });
      expect(other.calls).toEqual([expect.objectContaining({ op: 'revokeApiKey', bearer: 'old-key' })]);
      expect(loadSession(store, 'custom')).toMatchObject({ apiKey: 'key-1', issuedFor: auth.backend() });
    } finally {
      await other.stop();
    }
  });
});

describe('the server error text', () => {
  const leak = 'permission denied for table constructive_auth_private.sessions';

  it('never reaches a message: a sign-in failure and a failed revoke name the code only', async () => {
    auth.replies.signIn = () => failure('SOME_SERVER_CODE', leak);
    const error = await signInError(login());
    expect(error.message).toContain('SOME_SERVER_CODE');
    expect(error.message).not.toContain('constructive_auth_private');

    auth.replies.revokeApiKey = () => failure('NOT_OWNER', leak);
    selectBackend(store, addBackend(store, auth.backend()).name);
    saveSession(store, { userId: 'user-1', email: 'e', accessToken: 'k', apiKey: 'k', keyId: 'kid-1', signedInAt: 1, issuedFor: auth.backend() });
    const out = await signOut({ store, session: resolveSession({ store, env: {} }) });
    expect(out).toMatchObject({ kind: 'cleared', key: { kind: 'failed', reason: expect.stringContaining('NOT_OWNER') } });
    expect(JSON.stringify(out)).not.toContain('constructive_auth_private');
  });
});

describe('signOut', () => {
  const session = () => ({ userId: 'user-1', email: 'dev@example.com', accessToken: 'token', apiKey: 'k', keyId: 'kid-1', signedInAt: 1, issuedFor: auth.backend() });
  const out = (env: NodeJS.ProcessEnv = {}) => signOut({ store, session: resolveSession({ store, env }) });

  it('revokes the key at its issuer and clears the session', async () => {
    selectBackend(store, addBackend(store, auth.backend()).name);
    saveSession(store, session());
    await expect(out()).resolves.toEqual({ kind: 'cleared', context: auth.context(), key: { kind: 'revoked', keyId: 'kid-1' } });
    expect(auth.calls[0]).toMatchObject({ op: 'revokeApiKey', bearer: 'k' });
    expect(store.getCredentials(auth.context())).toBeNull();
  });

  it('clears the session and says why when the revoke fails', async () => {
    auth.replies.revokeApiKey = () => failure('FORBIDDEN', 'not yours');
    selectBackend(store, addBackend(store, auth.backend()).name);
    saveSession(store, session());
    const warn = jest.spyOn(console, 'warn');
    const result = await out();
    expect(result).toMatchObject({ kind: 'cleared', key: { kind: 'failed', keyId: 'kid-1', reason: expect.stringContaining('FORBIDDEN') } });
    expect(store.getCredentials(auth.context())).toBeNull();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('revokes at the issuer the credential records, never at the auth plane the context names now', async () => {
    const other = new FakeAuth();
    await other.start();
    try {
      selectBackend(store, addBackend(store, other.backend(), 'custom').name);
      saveSession(store, session(), 'custom');
      expect(resolveSession({ store, env: {} })).toMatchObject({ kind: 'issuer-mismatch', issuedFor: auth.backend() });
      await expect(out()).resolves.toEqual({ kind: 'cleared', context: 'custom', key: { kind: 'revoked', keyId: 'kid-1' } });
      expect(auth.calls).toEqual([expect.objectContaining({ op: 'revokeApiKey', bearer: 'k' })]);
      expect(other.calls).toEqual([]);
    } finally {
      await other.stop();
    }
  });

  it('sends nothing for a credential with no recorded issuer, clears it, and says the key was not revoked', async () => {
    selectBackend(store, addBackend(store, auth.backend()).name);
    saveSession(store, { ...session(), issuedFor: undefined });
    const result = await out();
    expect(result).toMatchObject({ kind: 'cleared', key: { kind: 'failed', keyId: 'kid-1', reason: expect.stringContaining('did not record the auth endpoint that issued it') } });
    expect(store.getCredentials(auth.context())).toBeNull();
    expect(auth.calls).toEqual([]);
  });

  it('clears the session of a context that lacks a plane, revoking at its issuer', async () => {
    store.createContext('partial', { endpoint: auth.endpoint, targets: { api: { endpoint: auth.endpoint } } });
    store.setCurrentContext('partial');
    saveSession(store, session());
    await expect(out()).resolves.toEqual({ kind: 'cleared', context: 'partial', key: { kind: 'revoked', keyId: 'kid-1' } });
    expect(store.getCredentials('partial')).toBeNull();
  });

  it('reports a session with no key as cleared with the key absent', async () => {
    selectBackend(store, addBackend(store, auth.backend()).name);
    saveSession(store, { ...session(), apiKey: undefined, keyId: undefined });
    await expect(out()).resolves.toEqual({ kind: 'cleared', context: auth.context(), key: { kind: 'absent' } });
  });

  it('is not-signed-in when nothing is stored', async () => {
    await expect(out()).resolves.toEqual({ kind: 'not-signed-in', context: null });
    expect(auth.calls).toEqual([]);
  });

  it('removes nothing for a session from the environment, and leaves the stored one alone', async () => {
    selectBackend(store, addBackend(store, auth.backend()).name);
    saveSession(store, session());
    const env = { CONSTRUCTIVE_USER_ID: 'env-user', CONSTRUCTIVE_ACCESS_TOKEN: 'env-token', CONSTRUCTIVE_API_ENDPOINT: 'https://api.example.com/graphql' };
    await expect(out(env)).resolves.toEqual({ kind: 'from-environment' });
    expect(store.getCredentials(auth.context())).not.toBeNull();
    expect(auth.calls).toEqual([]);
  });
});

describe('verifySession', () => {
  const signedIn = () => {
    selectBackend(store, addBackend(store, auth.backend()).name);
    saveSession(store, { userId: 'user-1', email: 'e', accessToken: 'token', apiKey: 'key', keyId: 'kid', signedInAt: 1, issuedFor: auth.backend() });
    const session = resolveSession({ store, env: {} });
    if (session.kind !== 'signed-in') throw new Error(`expected signed-in, got ${session.kind}`);
    return session;
  };

  it.each<[string, Reply | 'unreachable', string]>([
    ['the credential works', { data: { currentUser: { id: 'user-1' } } }, 'accepted'],
    ['the server rejects it', failure('UNAUTHENTICATED', 'expired'), 'rejected'],
    ['the server answers HTTP 401', { status: 401 }, 'rejected'],
    ['the server sees no user', { data: { currentUser: null } }, 'rejected'],
    ['the credential belongs to someone else', { data: { currentUser: { id: 'user-2' } } }, 'rejected'],
    ['the server fails', { status: 502 }, 'unchecked'],
    ['the server has another error', failure('INTERNAL_SERVER_ERROR', 'boom'), 'unchecked'],
    ['the backend is down', 'unreachable', 'unchecked']
  ])('says %s', async (_name, reply, kind) => {
    const session = signedIn();
    if (reply === 'unreachable') await auth.stop();
    else auth.replies.currentUser = () => reply;
    const check = await verifySession(session);
    expect(check.kind).toBe(kind);
    if (reply !== 'unreachable') expect(auth.calls.at(-1)).toMatchObject({ op: 'currentUser', bearer: 'key' });
  });
});

describe('timeouts', () => {
  it('gives the key mint and the key revoke the sign-in timeout', async () => {
    auth.replies.createApiKey = () => 'hang';
    const signingIn = login();

    const other = openStore(fs.mkdtempSync(path.join(home, 'other-')));
    selectBackend(other, addBackend(other, auth.backend()).name);
    saveSession(other, { userId: 'u', email: 'e', accessToken: 't', keyId: 'kid', apiKey: 'k', signedInAt: 1, issuedFor: auth.backend() });
    auth.replies.revokeApiKey = () => 'hang';
    const signingOut = signOut({ store: other, session: resolveSession({ store: other, env: {} }) });

    const [result, out] = await Promise.all([signInError(signingIn), signingOut]);
    expect(result).toMatchObject({ kind: 'backend-unreachable', message: expect.stringContaining('did not respond') });
    expect(loadSession(store, auth.context())).toBeNull();
    expect(out).toMatchObject({ kind: 'cleared', key: { kind: 'failed', reason: expect.stringContaining('did not respond') } });
  }, 20_000);
});
