import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { MemoryRunLogStore } from '@agentic-kit/run-log';

import {
  checkOptions,
  DEFAULT_APPROVAL_TIMEOUT_MS,
  type HeadlessAppBuildingOptions,
  HeadlessOptionsError
} from '../../src/headless/options';

const ACCOUNT_KEY = 'acct-key-0123456789abcdef';
const OWNER_KEY = 'owner-key-0123456789abcdef';

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'headless-options-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function options(patch: Partial<HeadlessAppBuildingOptions> = {}): HeadlessAppBuildingOptions {
  return {
    cwd: root,
    stateDir: path.join(tmpdir(), 'headless-state'),
    databaseId: '6f1f8a52-7c1e-4a51-9d5b-3c1b2a9e4d10',
    account: { email: 'owner@example.com', apiKey: ACCOUNT_KEY },
    ownerKey: OWNER_KEY,
    endpoints: { api: 'http://api.localhost/graphql', modules: 'http://modules.localhost/graphql' },
    runLog: { store: new MemoryRunLogStore(), runId: 'run-1', flush: async () => {} },
    ...patch
  };
}

function problemsOf(input: HeadlessAppBuildingOptions): string[] {
  try {
    checkOptions(input);
  } catch (err) {
    assert.ok(err instanceof HeadlessOptionsError);
    return err.problems;
  }
  return [];
}

test('valid options come back resolved, with the 30-minute card wait by default', () => {
  const checked = checkOptions(options());
  assert.equal(checked.cwd, root);
  assert.equal(checked.approvalTimeoutMs, DEFAULT_APPROVAL_TIMEOUT_MS);
  assert.equal(checkOptions(options({ approvalTimeoutMs: 5_000 })).approvalTimeoutMs, 5_000);
});

test('stateDir inside the work tree is refused, since the agent commits that tree', () => {
  assert.deepEqual(problemsOf(options({ stateDir: path.join(root, '.state') })), [
    'stateDir must be outside cwd'
  ]);
  assert.deepEqual(problemsOf(options({ stateDir: root })), ['stateDir must be outside cwd']);
});

test('every problem is listed at once, and no key value is ever in the message', () => {
  const input = options({
    cwd: 'relative/path',
    databaseId: 'not-a-uuid',
    account: { email: 'nobody', apiKey: `Bearer ${ACCOUNT_KEY}` },
    ownerKey: '',
    endpoints: { api: 'ftp://api.localhost', modules: 'nope' },
    runLog: { store: {} as never, runId: '', flush: undefined as never },
    chromiumPath: 'chromium',
    approvalTimeoutMs: -1
  });
  let message = '';
  try {
    checkOptions(input);
  } catch (err) {
    message = (err as Error).message;
  }
  assert.deepEqual(problemsOf(input), [
    'cwd must be an absolute path',
    'databaseId must be a UUID',
    'account.email must be an email address',
    'account.apiKey must be a bare key, with no spaces (no "Bearer " prefix)',
    'ownerKey is missing',
    'endpoints.api must be an http or https URL',
    'endpoints.modules must be an http or https URL',
    'runLog.store must be a run-log store (append and read)',
    'runLog.runId is missing',
    'runLog.flush must be a function',
    'chromiumPath must be an absolute path',
    'approvalTimeoutMs must be a number of milliseconds between 1 and 2147483647'
  ]);
  assert.ok(!message.includes(ACCOUNT_KEY));
});

test('the account key given as the owner key is refused: it does not work on the app realm', () => {
  assert.deepEqual(problemsOf(options({ ownerKey: ACCOUNT_KEY })), [
    "ownerKey must be the owner's key in the app database's realm, not the account key"
  ]);
});

test("an endpoint whose first host label isn't its plane's is refused, so no derived host leaves the domain", () => {
  const endpoints = (api: string, modules = 'http://modules.localhost/graphql') => options({ endpoints: { api, modules } });
  // auth.com and auth-<db>.com would be someone else's.
  assert.deepEqual(problemsOf(endpoints('https://example.com/graphql')), [
    'endpoints.api must be on a api.<domain> host, such as https://api.example.com/graphql'
  ]);
  // A bare `auth` host could resolve to any service the pod's DNS search finds.
  assert.equal(problemsOf(endpoints('http://localhost:3000/graphql')).length, 1);
  assert.equal(problemsOf(endpoints('https://api/graphql')).length, 1);
  assert.deepEqual(problemsOf(endpoints('https://api.example.com/graphql', 'https://api.example.com/graphql')), [
    'endpoints.modules must be on a modules.<domain> host, such as https://modules.example.com/graphql'
  ]);
  assert.deepEqual(problemsOf(endpoints('https://api.launchql.dev/graphql', 'https://modules.launchql.dev/graphql')), []);
});

test('a cwd that is not a folder is refused', () => {
  assert.deepEqual(problemsOf(options({ cwd: path.join(root, 'missing') })), [
    `cwd ${path.join(root, 'missing')} is not a folder`
  ]);
});
