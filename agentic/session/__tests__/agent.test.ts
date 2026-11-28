import { ConfigStore } from 'appstash';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

import { openStore, saveSession } from '../src/account-store';
import { AgentError, agentSession, createAgent, grantSchemaChanges, listAgents, removeAgent, renewAgentKey, revokeSchemaChanges, SCHEMA_READ_ONLY_MASK } from '../src/agent';
import { SignInError } from '../src/auth-error';
import { addBackend, selectBackend } from '../src/backend-store';
import { resolveSession } from '../src/session';
import { sessionToolsHost } from '../src/tools-host';
import { FakePrincipals } from './fake-principals';

const run = promisify(execFile);
const DAY_MS = 24 * 3600 * 1000;

let home: string;
let store: ConfigStore;
let auth: FakePrincipals;

const person = () => ({
  userId: 'person-1',
  email: 'owner@example.com',
  accessToken: 'person-access-token',
  accessTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  apiKey: 'person-api-key',
  keyId: 'person-key-id',
  signedInAt: 1,
  issuedFor: auth.backend()
});

const personSession = () => {
  const session = resolveSession({ store, env: {} });
  if (session.kind !== 'signed-in') throw new Error(`expected signed-in, got ${session.kind}`);
  return session;
};

const agentFile = (name: string) => path.join(home, '.constructive', 'config', 'agents', auth.context(), `${name}.json`);
const readAgent = (name: string) => JSON.parse(fs.readFileSync(agentFile(name), 'utf8'));
const cacheFile = (name: string) => path.join(home, '.constructive', 'cache', 'agents', auth.context(), `${name}.json`);
const readCache = (name: string) => JSON.parse(fs.readFileSync(cacheFile(name), 'utf8'));
const writeCache = (name: string, token: Record<string, unknown>) => {
  fs.mkdirSync(path.dirname(cacheFile(name)), { recursive: true });
  fs.writeFileSync(cacheFile(name), JSON.stringify(token), { mode: 0o600 });
};
/** Make the cached access token of `name` look ended, as after 15 minutes. */
const expireCache = (name: string) => writeCache(name, { ...readCache(name), accessExpiresAt: new Date(Date.now() - 1000).toISOString() });
const allFiles = () => (fs.readdirSync(home, { recursive: true }) as string[]).map((f) => path.join(home, f)).filter((f) => fs.statSync(f).isFile());
const mints = () => auth.calls.filter((call) => call.op === 'mintAccessToken');

beforeEach(async () => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'session-agent-'));
  store = openStore(home);
  auth = new FakePrincipals();
  await auth.start();
  selectBackend(store, addBackend(store, auth.backend()).name);
  saveSession(store, person());
});

afterEach(async () => {
  await auth.stop();
  fs.rmSync(home, { recursive: true, force: true });
});

const create = (name: string, allowSchemaChanges = false, extra: Record<string, unknown> = {}) =>
  createAgent({ store, session: personSession(), password: 'pw', name, allowSchemaChanges, ...extra });

const signedIn = async (name: string) => {
  const session = await agentSession({ store, name, env: {} });
  if (session.kind !== 'signed-in') throw new Error(`expected signed-in, got ${JSON.stringify(session)}`);
  return session;
};

describe('the mint-only agent credential', () => {
  it('stores no refresh token for an agent, and never asks the backend for one', async () => {
    await create('helper');
    expect(await agentSession({ store, name: 'helper', env: {} })).toMatchObject({ kind: 'signed-in' });
    const stored = allFiles().filter((file) => file.includes(`${path.sep}agents${path.sep}`));
    expect(stored.length).toBeGreaterThan(0);
    for (const file of stored) {
      const text = fs.readFileSync(file, 'utf8');
      expect(text).not.toMatch(/cnc_live_rt_|refreshToken/);
    }
    expect(auth.calls.filter((call) => call.op === 'mintAccessToken').map((call) => call.query.includes('refreshToken'))).not.toContain(true);
  });

  it('lets two processes whose cached token expired both mint with the key at once and both succeed, with no lock', async () => {
    await create('helper');
    const record = readAgent('helper');
    writeCache('helper', { keyId: record.keyId, accessToken: 'cnc_live_at_spent', accessExpiresAt: new Date(Date.now() - 1000).toISOString() });
    const before = auth.calls.length;
    // Each mint is answered only once both have arrived: a lock would hold the second process back, and this would never return.
    auth.barrier = { op: 'mintAccessToken', count: 2 };
    const child = run(process.execPath, ['-r', 'ts-node/register/transpile-only', path.join(__dirname, 'agent-child.ts'), home, 'helper'], {
      env: { ...process.env, TS_NODE_TRANSPILE_ONLY: 'true' }
    });
    const mine = agentSession({ store, name: 'helper', env: {} });
    const [{ stdout }, own] = await Promise.all([child, mine]);
    const theirs = JSON.parse(stdout);

    const mints = auth.calls.slice(before).filter((call) => call.op === 'mintAccessToken');
    expect(mints).toHaveLength(2);
    for (const call of mints) expect(call).toMatchObject({ bearer: record.apiKey, input: { principalId: record.principalId } });
    expect(own).toMatchObject({ kind: 'signed-in' });
    expect(theirs).toMatchObject({ kind: 'signed-in' });
    const tokens = [own.kind === 'signed-in' ? own.account.accessToken : '', theirs.token];
    for (const token of tokens) expect(auth.live(token)).toBe(true);
    expect(tokens).toContain(JSON.parse(fs.readFileSync(cacheFile('helper'), 'utf8')).accessToken);
    expect(fs.statSync(cacheFile('helper')).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(path.dirname(cacheFile('helper')))).toEqual(['helper.json']);
  }, 30_000);
});

describe('createAgent', () => {
  it('creates a principal without the admin flag, masks manage_database, caps its keys at 30 days before it makes one, and stores the key beside the session', async () => {
    const info = await create('helper');

    expect(auth.ops()).toEqual(['signIn', 'createPrincipal', 'setPrincipalScope', 'updatePrincipal', 'createApiKey', 'signOut']);
    expect(auth.calls[0].input).toEqual({ email: 'owner@example.com', password: 'pw' });
    const fresh = [...auth.signIns.keys()][0];
    expect(auth.calls.slice(1).every((call) => call.bearer === fresh)).toBe(true);
    expect(auth.liveSignIns()).toBe(0);
    expect(auth.calls[1].input).toEqual({ name: 'helper', useAdminOwner: false });
    const principalId = auth.calls[2].input.principalId;
    expect(auth.calls[2].input).toEqual({ principalId, membershipType: 2, allowedMask: SCHEMA_READ_ONLY_MASK, useAdminOwner: false, isActive: true, isReadOnly: false });
    expect(auth.calls[3].input).toEqual({ principalId, apiKeyMaxDuration: { days: 30 } });
    expect(auth.calls[4].input).toEqual({ keyName: 'agent:helper', accessLevel: 'full_access', mfaLevel: 'none', expiresIn: { days: 30 }, principalId });

    expect(SCHEMA_READ_ONLY_MASK).toHaveLength(64);
    expect(SCHEMA_READ_ONLY_MASK.indexOf('0')).toBe(64 - 12);
    expect(SCHEMA_READ_ONLY_MASK.replace('0', '')).toBe('1'.repeat(63));

    expect(info).toMatchObject({ name: 'helper', context: auth.context(), principalId, schemaChanges: false, state: 'ready' });
    if ('keyExpiresAt' in info) expect(Math.abs(Date.parse(info.keyExpiresAt) - (Date.now() + 30 * DAY_MS))).toBeLessThan(60_000);
    expect(JSON.stringify(info)).not.toMatch(/cnc_live|person-access-token/);
    expect(fs.statSync(agentFile('helper')).mode & 0o777).toBe(0o600);
    expect(fs.statSync(path.dirname(agentFile('helper'))).mode & 0o777).toBe(0o700);
    expect(readAgent('helper')).toMatchObject({ principalId, ownerId: 'person-1', issuedFor: auth.backend(), schemaChanges: false, apiKey: auth.keys[0].secret, keyId: auth.keys[0].id });
    expect(listAgents({ store })).toEqual([info]);
  });

  it('sets no mask when schema changes are allowed, and holds the agent to the organization it names', async () => {
    const info = await create('builder', true, { organization: 'org-1' });
    expect(auth.calls[1].input).toEqual({ name: 'builder', useAdminOwner: false, entityIds: ['org-1'] });
    expect(auth.calls[2].input).toMatchObject({ allowedMask: null, useAdminOwner: false });
    expect(info).toMatchObject({ schemaChanges: true, organization: 'org-1' });
  });

  it.each<[string, string, string]>([
    ['a principal credential', 'PRINCIPAL_CANNOT_CREATE_PRINCIPAL', 'not-a-person'],
    ['an old sign-in', 'STEP_UP_REQUIRED_FRESH_AUTH', 'step-up-required'],
    ['an expired sign-in', 'UNAUTHENTICATED', 'sign-in-required']
  ])('refuses %s with a failure that names the sign-in step, and stores nothing', async (_name, code, kind) => {
    auth.fail.createPrincipal = { code };
    const error = await create('helper').catch((err) => err);
    expect(error).toBeInstanceOf(AgentError);
    expect(error.kind).toBe(kind);
    expect(error.code).toBe(code);
    if (kind !== 'not-a-person') expect(error.message).toContain('Sign in again');
    expect(auth.ops()).toEqual(['signIn', 'createPrincipal', 'signOut']);
    expect(auth.liveSignIns()).toBe(0);
    expect(fs.existsSync(agentFile('helper'))).toBe(false);
  });

  it('refuses a wrong password before anything is made', async () => {
    const error = await createAgent({ store, session: personSession(), password: 'wrong', name: 'helper', allowSchemaChanges: false }).catch((err) => err);
    expect(error).toBeInstanceOf(SignInError);
    expect(error.kind).toBe('invalid-credentials');
    expect(auth.ops()).toEqual(['signIn']);
    expect(fs.existsSync(agentFile('helper'))).toBe(false);
  });

  it.each<[string, (a: FakePrincipals) => void, string[]]>([
    ['the key cannot be made', (a) => (a.fail.createApiKey = { code: 'API_KEY_LIMIT_REACHED' }), ['signIn', 'createPrincipal', 'setPrincipalScope', 'updatePrincipal', 'createApiKey', 'deletePrincipal', 'signOut']],
    ['the cap is not confirmed', (a) => (a.fail.updatePrincipal = { code: 'NOT_OWNER' }), ['signIn', 'createPrincipal', 'setPrincipalScope', 'updatePrincipal', 'deletePrincipal', 'signOut']]
  ])('deletes the principal it made when %s, and says so', async (_name, fault, ops) => {
    fault(auth);
    const error = await create('helper').catch((err) => err);
    expect(error).toBeInstanceOf(AgentError);
    expect(error.message).toContain('was deleted again');
    expect(auth.ops()).toEqual(ops);
    expect(auth.principals.size).toBe(0);
    expect(fs.existsSync(agentFile('helper'))).toBe(false);
  });

  it('lets one of two adds of one name at the same moment win, and deletes the principal of the other', async () => {
    auth.delayMs = 50;
    const results = await Promise.allSettled([create('helper'), create('helper')]);
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(lost[0].reason).toMatchObject({ kind: 'name-taken' });
    expect(lost[0].reason.message).toContain('was deleted again');
    expect(auth.principals.size).toBe(1);
    expect([...auth.principals.keys()]).toEqual([readAgent('helper').principalId]);
  });

  it('needs a person signed in from the store, and refuses an agent or the environment without a request', async () => {
    await create('helper');
    const asAgent = await agentSession({ store, name: 'helper', env: {} });
    const calls = auth.calls.length;
    const fromEnv = resolveSession({ store, env: { CONSTRUCTIVE_USER_ID: 'u', CONSTRUCTIVE_ACCESS_TOKEN: 't', CONSTRUCTIVE_API_ENDPOINT: auth.endpoint, CONSTRUCTIVE_AUTH_ENDPOINT: auth.endpoint, CONSTRUCTIVE_MODULES_ENDPOINT: auth.endpoint, CONSTRUCTIVE_AGENT_ENDPOINT: auth.endpoint, CONSTRUCTIVE_COMPUTE_ENDPOINT: auth.endpoint } });
    for (const session of [asAgent, fromEnv]) {
      await expect(createAgent({ store, session, password: 'pw', name: 'other', allowSchemaChanges: false })).rejects.toMatchObject({ kind: 'not-a-person' });
    }
    const envError = await createAgent({ store, session: fromEnv, password: 'pw', name: 'other', allowSchemaChanges: false }).catch((err) => err);
    expect(envError.message).toContain('no stored context to file the agent under');
    expect(auth.calls.length).toBe(calls);
  });

  it('refuses a name that is taken or not valid before any request', async () => {
    await create('helper');
    const calls = auth.calls.length;
    await expect(create('helper')).rejects.toMatchObject({ kind: 'name-taken' });
    await expect(create('../credentials')).rejects.toMatchObject({ kind: 'invalid-name' });
    await expect(create('Helper')).rejects.toMatchObject({ kind: 'invalid-name' });
    const error = await create('a1.json').catch((err) => err);
    expect(error).toMatchObject({ kind: 'invalid-name' });
    expect(error.message).toContain('reads like a file of the store');
    expect(auth.calls.length).toBe(calls);
  });
});

describe('agentSession', () => {
  it('mints an access token with the agent key on first use, caches it in a 0600 file, and acts as the person', async () => {
    await create('helper');
    const record = readAgent('helper');
    const session = await signedIn('helper');

    expect(mints()).toEqual([expect.objectContaining({ bearer: record.apiKey, input: { principalId: record.principalId, intent: 'agent:helper' } })]);
    expect(session).toMatchObject({
      source: 'agent',
      context: auth.context(),
      account: { userId: 'person-1', key: { kind: 'none' } },
      agent: { name: 'helper', principalId: record.principalId, schemaChanges: false, keyExpiresAt: record.keyExpiresAt }
    });
    expect(auth.live(session.account.accessToken)).toBe(true);
    expect(readCache('helper')).toEqual({ keyId: record.keyId, accessToken: session.account.accessToken, accessExpiresAt: session.agent.accessExpiresAt });
    expect(fs.statSync(cacheFile('helper')).mode & 0o777).toBe(0o600);
    expect(fs.statSync(path.dirname(cacheFile('helper'))).mode & 0o777).toBe(0o700);
  });

  it('uses the cached token while it is fresh, with no request', async () => {
    await create('helper');
    const first = await signedIn('helper');
    const calls = auth.calls.length;
    expect((await signedIn('helper')).account.accessToken).toBe(first.account.accessToken);
    expect(auth.calls.length).toBe(calls);
  });

  it('mints again once the cached token is near its end, and caches the new one', async () => {
    await create('helper');
    const first = await signedIn('helper');
    expireCache('helper');
    const second = await signedIn('helper');
    expect(second.account.accessToken).not.toBe(first.account.accessToken);
    expect(mints()).toHaveLength(2);
    expect(readCache('helper').accessToken).toBe(second.account.accessToken);
  });

  it('never uses a token cached for another key of the name', async () => {
    await create('helper');
    writeCache('helper', { keyId: 'an-older-key', accessToken: 'cnc_live_at_old', accessExpiresAt: new Date(Date.now() + 600_000).toISOString() });
    const session = await signedIn('helper');
    expect(session.account.accessToken).not.toBe('cnc_live_at_old');
    expect(mints()).toHaveLength(1);
  });

  it('says to set the agent up again when the backend no longer accepts its key', async () => {
    await create('helper');
    auth.keys[0].revoked = true;
    const session = await agentSession({ store, name: 'helper', env: {} });
    expect(session).toMatchObject({ kind: 'agent-unusable', agent: 'helper', reason: 'set-up-again' });
    if (session.kind === 'agent-unusable') expect(session.fix).toContain('Renew the key of the agent "helper"');
    expect(fs.existsSync(cacheFile('helper'))).toBe(false);
  });

  it('drops a cached token the backend refused and mints once more from the key, and says to renew when the key is refused too', async () => {
    await create('helper');
    const refused = (await signedIn('helper')).account.accessToken;
    auth.sessions.find((s) => s.access === refused)!.revoked = true;

    const again = await agentSession({ store, name: 'helper', env: {}, rejectedToken: refused });
    expect(again).toMatchObject({ kind: 'signed-in' });
    const fresh = again.kind === 'signed-in' ? again.account.accessToken : '';
    expect(fresh).not.toBe(refused);
    expect(auth.live(fresh)).toBe(true);
    expect(mints()).toHaveLength(2);
    expect(readCache('helper').accessToken).toBe(fresh);

    // Another process that was refused the same token uses the one already minted.
    expect(await agentSession({ store, name: 'helper', env: {}, rejectedToken: refused })).toMatchObject({ kind: 'signed-in', account: { accessToken: fresh } });
    expect(mints()).toHaveLength(2);

    auth.keys[0].revoked = true;
    auth.sessions.find((s) => s.access === fresh)!.revoked = true;
    const dead = await agentSession({ store, name: 'helper', env: {}, rejectedToken: fresh });
    expect(dead).toMatchObject({ kind: 'agent-unusable', reason: 'set-up-again' });
    expect(mints()).toHaveLength(3);
    expect(fs.existsSync(cacheFile('helper'))).toBe(false);
  });

  it('says to set the agent up again, with no request, once its key has ended', async () => {
    await create('helper');
    fs.writeFileSync(agentFile('helper'), JSON.stringify({ ...readAgent('helper'), keyExpiresAt: new Date(Date.now() - 1000).toISOString() }), { mode: 0o600 });
    const calls = auth.calls.length;
    expect(await agentSession({ store, name: 'helper', env: {} })).toMatchObject({ kind: 'agent-unusable', reason: 'set-up-again', problem: expect.stringContaining('key of the agent "helper" ended') });
    expect(listAgents({ store })[0].state).toBe('set-up-again');
    expect(auth.calls.length).toBe(calls);
  });

  it.each<[string, (a: FakePrincipals) => Promise<unknown> | void]>([
    ['the backend cannot be reached', (a) => a.stop()],
    ['the backend answers HTTP 502', (a) => void (a.fail.mintAccessToken = { status: 502 })]
  ])('says to retry when %s, and keeps the key', async (_name, fault) => {
    await create('helper');
    const before = readAgent('helper');
    await fault(auth);
    const session = await agentSession({ store, name: 'helper', env: {} });
    expect(session).toMatchObject({ kind: 'agent-unusable', reason: 'mint-failed' });
    if (session.kind === 'agent-unusable') expect(session.fix).toContain('Retry');
    expect(readAgent('helper')).toEqual(before);
  });

  it('never uses an agent whose context now names other endpoints, and says which plane differs', async () => {
    await create('helper');
    const file = path.join(home, '.constructive', 'config', 'contexts', `${auth.context()}.json`);
    const ctx = JSON.parse(fs.readFileSync(file, 'utf8'));
    ctx.targets.modules.endpoint = 'http://modules.evil.localhost/graphql';
    fs.writeFileSync(file, JSON.stringify(ctx));
    const calls = auth.calls.length;
    const session = await agentSession({ store, name: 'helper', env: {} });
    expect(session).toMatchObject({ kind: 'agent-unusable', reason: 'issuer-mismatch' });
    if (session.kind === 'agent-unusable') expect(session.problem).toContain('modules endpoint');
    expect(auth.calls.length).toBe(calls);
  });

  it('is a conflict when the environment would decide the session', async () => {
    await create('helper');
    const env = { CONSTRUCTIVE_USER_ID: 'u', CONSTRUCTIVE_ACCESS_TOKEN: 't' };
    expect(await agentSession({ store, env, name: 'helper' })).toMatchObject({ kind: 'conflict', variable: 'CONSTRUCTIVE_USER_ID' });
  });

  it.each<[string, string, string]>([
    ['a record that is not valid JSON', '{ "name": "helper", ', 'not valid JSON'],
    ['a record without a key', JSON.stringify({ name: 'helper', principalId: 'p', refreshToken: 'r' }), 'lacks the principal, the key or the backend']
  ])('answers set-up-again for %s, names the file, and lists it instead of crashing', async (_name, content, problem) => {
    await create('helper');
    fs.writeFileSync(agentFile('helper'), content, { mode: 0o600 });
    const session = await agentSession({ store, name: 'helper', env: {} });
    expect(session).toMatchObject({ kind: 'agent-unusable', reason: 'set-up-again' });
    if (session.kind === 'agent-unusable') {
      expect(session.problem).toContain(agentFile('helper'));
      expect(session.fix).toContain('Remove the agent');
    }
    expect(listAgents({ store })).toEqual([{ name: 'helper', context: auth.context(), state: 'set-up-again', unreadable: true, problem: expect.stringContaining(problem) }]);
    await expect(grantSchemaChanges({ store, session: personSession(), name: 'helper' })).rejects.toMatchObject({ kind: 'unreadable-record' });
    await expect(removeAgent({ store, session: personSession(), name: 'helper' })).resolves.toMatchObject({ kind: 'entry-removed', problem: expect.stringContaining('Delete the principal "helper" in the app') });
    expect(fs.existsSync(agentFile('helper'))).toBe(false);
  });

  it('says an agent that does not exist is not found', async () => {
    expect(await agentSession({ store, name: 'nobody', env: {} })).toMatchObject({ kind: 'agent-unusable', reason: 'not-found' });
  });
});

describe('the tools host as an agent', () => {
  it('gives a minted agent token as the person, uses a token another process cached, and mints when the cache is near its end', async () => {
    await create('helper');
    const host = sessionToolsHost({ signInHint: 'Sign in.', agent: 'helper', env: { CONSTRUCTIVE_STASH_DIR: home } });
    const agent = { name: 'helper', principalId: readAgent('helper').principalId };
    const first = await host.account();
    expect(first).toEqual({ userId: 'person-1', agent, accessToken: readCache('helper').accessToken });
    expect(host.backendConfig()).toMatchObject({ apiEndpoint: auth.endpoint });
    const personal = await sessionToolsHost({ signInHint: 'Sign in.', env: { CONSTRUCTIVE_STASH_DIR: home } }).account();
    expect(personal).toMatchObject({ userId: 'person-1', email: 'owner@example.com', apiKey: 'person-api-key' });
    expect(personal).not.toHaveProperty('agent');

    expireCache('helper');
    const elsewhere = await signedIn('helper');
    const minted = mints().length;
    expect(await host.account()).toEqual({ userId: 'person-1', agent, accessToken: elsewhere.account.accessToken });
    expect(mints()).toHaveLength(minted);

    expireCache('helper');
    const account = await host.account();
    expect(auth.live(account!.accessToken)).toBe(true);
    expect(account!.accessToken).not.toBe(elsewhere.account.accessToken);
    expect(account).not.toHaveProperty('apiKey');
  });

  it('throws the reason from both getters when the agent must be set up again, so a tool reports it', async () => {
    await create('helper');
    fs.writeFileSync(agentFile('helper'), JSON.stringify({ ...readAgent('helper'), keyExpiresAt: new Date(Date.now() - 1000).toISOString() }), { mode: 0o600 });
    const host = sessionToolsHost({ signInHint: 'Sign in.', agent: 'helper', env: { CONSTRUCTIVE_STASH_DIR: home } });
    await expect(host.account()).rejects.toThrow('The key of the agent "helper" ended');
    expect(() => host.backendConfig()).toThrow('The key of the agent "helper" ended');
  });
});

describe('schema changes and removal', () => {
  it('grants and revokes schema changes with the scope call, and records it', async () => {
    await create('helper');
    const principalId = readAgent('helper').principalId;
    expect(await grantSchemaChanges({ store, session: personSession(), name: 'helper' })).toMatchObject({ schemaChanges: true });
    expect(auth.calls.at(-1)).toMatchObject({ op: 'setPrincipalScope', bearer: 'person-api-key', input: { principalId, membershipType: 2, allowedMask: null, useAdminOwner: false } });
    expect(await revokeSchemaChanges({ store, session: personSession(), name: 'helper' })).toMatchObject({ schemaChanges: false });
    expect(auth.calls.at(-1)).toMatchObject({ op: 'setPrincipalScope', input: { allowedMask: SCHEMA_READ_ONLY_MASK, useAdminOwner: false } });
    expect(readAgent('helper').schemaChanges).toBe(false);
  });

  it('names the sign-in step when a scope change needs a fresh sign-in', async () => {
    await create('helper');
    auth.fail.setPrincipalScope = { code: 'STEP_UP_REQUIRED_MFA' };
    await expect(grantSchemaChanges({ store, session: personSession(), name: 'helper' })).rejects.toMatchObject({ kind: 'step-up-required' });
    expect(readAgent('helper').schemaChanges).toBe(false);
  });

  it('deletes the principal, which ends its key and cached token at once, then the stored entry, and keeps the entry when the delete fails', async () => {
    await create('helper');
    const { apiKey } = readAgent('helper');
    const token = (await signedIn('helper')).account.accessToken;
    auth.fail.deletePrincipal = { status: 502 };
    await expect(removeAgent({ store, session: personSession(), name: 'helper' })).rejects.toMatchObject({ kind: 'server-error' });
    expect(fs.existsSync(agentFile('helper'))).toBe(true);

    delete auth.fail.deletePrincipal;
    await expect(removeAgent({ store, session: personSession(), name: 'helper' })).resolves.toEqual({ kind: 'removed', name: 'helper' });
    expect(auth.live(token)).toBe(false);
    expect(auth.keyLive(apiKey)).toBe(false);
    expect(fs.existsSync(agentFile('helper'))).toBe(false);
    expect(fs.existsSync(cacheFile('helper'))).toBe(false);
    expect(auth.principals.size).toBe(0);
    expect(listAgents({ store })).toEqual([]);
  });

  it('removes the entry of a principal that is already gone', async () => {
    await create('helper');
    auth.fail.deletePrincipal = { code: 'PRINCIPAL_NOT_FOUND' };
    await expect(removeAgent({ store, session: personSession(), name: 'helper' })).resolves.toEqual({ kind: 'already-gone', name: 'helper' });
    expect(fs.existsSync(agentFile('helper'))).toBe(false);
  });
});

describe('renewAgentKey', () => {
  it('gives the same principal a new capped 30-day key, keeps its grants, drops the cached token, and ends the old key and its tokens', async () => {
    await create('helper');
    await grantSchemaChanges({ store, session: personSession(), name: 'helper' });
    const old = readAgent('helper');
    const scope = auth.scopes.get(`${old.principalId}:2`);
    const oldToken = (await signedIn('helper')).account.accessToken;
    const before = auth.calls.length;

    const renewal = await renewAgentKey({ store, session: personSession(), password: 'pw', name: 'helper' });

    expect(auth.calls.slice(before).map((call) => call.op)).toEqual(['signIn', 'createApiKey', 'revokeApiKey', 'signOut']);
    expect(auth.calls.at(-3)!.input).toEqual({ keyName: 'agent:helper', accessLevel: 'full_access', mfaLevel: 'none', expiresIn: { days: 30 }, principalId: old.principalId });
    expect(auth.calls.at(-2)!.input).toEqual({ keyId: old.keyId });
    expect(auth.liveSignIns()).toBe(0);
    const renewed = readAgent('helper');
    expect(renewed).toMatchObject({ principalId: old.principalId, schemaChanges: true, createdAt: old.createdAt });
    expect(renewed.keyId).not.toBe(old.keyId);
    expect(renewal).toEqual({ agent: expect.objectContaining({ principalId: old.principalId, schemaChanges: true, keyExpiresAt: renewed.keyExpiresAt, state: 'ready' }), previousKey: { kind: 'revoked', keyId: old.keyId } });
    expect(auth.scopes.get(`${old.principalId}:2`)).toEqual(scope);
    expect(fs.existsSync(cacheFile('helper'))).toBe(false);
    expect(auth.keyLive(old.apiKey)).toBe(false);
    expect(auth.live(oldToken)).toBe(false);

    const session = await signedIn('helper');
    expect(mints().at(-1)).toMatchObject({ bearer: renewed.apiKey, input: { principalId: old.principalId } });
    expect(auth.live(session.account.accessToken)).toBe(true);
  });

  it('keeps the old key when no new key can be made', async () => {
    await create('helper');
    const old = readAgent('helper');
    auth.fail.createApiKey = { code: 'API_KEY_LIMIT_REACHED' };
    await expect(renewAgentKey({ store, session: personSession(), password: 'pw', name: 'helper' })).rejects.toMatchObject({ kind: 'refused', code: 'API_KEY_LIMIT_REACHED' });
    expect(readAgent('helper')).toEqual(old);
    expect(auth.keyLive(old.apiKey)).toBe(true);
    expect(auth.liveSignIns()).toBe(0);
  });
});

describe('secrets', () => {
  it('keeps the key and every token in 0600 files of the store, and out of every result and error', async () => {
    await create('helper');
    await signedIn('helper');
    const agentFiles = allFiles().filter((file) => file.includes(`${path.sep}agents${path.sep}`));
    expect(agentFiles).toHaveLength(2);
    for (const file of agentFiles) expect([file, fs.statSync(file).mode & 0o777]).toEqual([file, 0o600]);
    auth.fail.setPrincipalScope = { code: 'NOT_OWNER', message: 'violates policy on constructive_memberships_private.org_memberships_sprt' };
    const error = await grantSchemaChanges({ store, session: personSession(), name: 'helper' }).catch((err) => err);
    expect(`${error.message} ${JSON.stringify(error)}`).not.toMatch(/cnc_live|person-access-token|person-api-key|person-signin|_private/);
    expect(error.message).toContain('NOT_OWNER');
    expect(JSON.stringify(listAgents({ store }))).not.toMatch(/cnc_live/);
    auth.keys[0].revoked = true;
    expireCache('helper');
    expect(JSON.stringify(await agentSession({ store, name: 'helper', env: {} }))).not.toMatch(/cnc_live/);
  });
});

describe('the fake api plane', () => {
  const listDatabases = (bearer: string | undefined) =>
    fetch(auth.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
      body: JSON.stringify({ query: 'query ListDatabases { databases(first: 100, orderBy: [CREATED_AT_DESC]) { nodes { id name ownerId createdAt } } }' })
    }).then((r) => r.json());

  it('lists the databases the test sets for the person and for a live agent token, and refuses any other bearer', async () => {
    const db = { id: 'db-1', name: 'hcli-db', ownerId: 'person-1', createdAt: '2026-11-26T00:00:00Z' };
    auth.databases = [db];
    await create('helper');
    const token = (await signedIn('helper')).account.accessToken;
    const expected = { data: { databases: { nodes: [db] } } };
    expect(await listDatabases('person-access-token')).toEqual(expected);
    expect(await listDatabases(token)).toEqual(expected);
    for (const bearer of [undefined, 'not-a-token']) {
      expect((await listDatabases(bearer)).errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    }
    expect(auth.ops().filter((op) => op === 'databases')).toHaveLength(4);
  });
});
