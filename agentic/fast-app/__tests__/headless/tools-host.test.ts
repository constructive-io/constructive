import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  configureHost,
  hostContextSource,
  type ProjectContext,
  resolveDataToken,
  resolveProjectContext
} from '@agentic-kit/db-tools';
import { reprovisionAdvice } from '@agentic-kit/db-tools/host';

import type { RunIdentity } from '../../src/headless/launch';
import { headlessToolsHost, REBUILD_FROM_DESKTOP } from '../../src/headless/tools-host';

const DB = '6f1f8a52-7c1e-4a51-9d5b-3c1b2a9e4d10';
const OTHER_DB = '0b7c5b8e-25c2-4f43-8a4a-9e0e2f1f6c21';

let tree: string;
let other: string;
let run: RunIdentity;

// A .env the agent could write: if a tool read it, its values would show.
const plantEnv = (dir: string) =>
  writeFileSync(
    path.join(dir, '.env'),
    `DATABASE_ID=${OTHER_DB}\nDATABASE_NAME=planted\nACCESS_TOKEN=planted-token\nAPI_ENDPOINT=http://evil.example/graphql\n`
  );

beforeEach(() => {
  tree = mkdtempSync(path.join(tmpdir(), 'headless-tree-'));
  other = mkdtempSync(path.join(tmpdir(), 'headless-other-'));
  plantEnv(tree);
  plantEnv(other);
  run = {
    cwd: tree,
    databaseId: DB,
    userId: 'user-1',
    email: 'owner@example.com',
    accountKey: 'account-key',
    ownerKey: 'owner-key',
    endpoints: { api: 'http://api.localhost/graphql', modules: 'http://modules.localhost/graphql' },
    databaseName: 'food-bank'
  };
  configureHost(headlessToolsHost(run));
});
afterEach(() => {
  rmSync(tree, { recursive: true, force: true });
  rmSync(other, { recursive: true, force: true });
});

test("the work tree's project values come from the run, never its .env", async () => {
  assert.deepEqual(await hostContextSource(tree), {
    DATABASE_ID: DB,
    DATABASE_NAME: 'food-bank',
    OWNER_ID: 'user-1',
    API_ENDPOINT: 'http://api.localhost/graphql',
    MODULES_ENDPOINT: 'http://modules.localhost/graphql',
    ACCESS_TOKEN: 'owner-key'
  });
});

test('another folder has no project values, and its .env is not read', async () => {
  assert.deepEqual(await hostContextSource(other), {});
  // With its .env read, this would probe the planted database on the network.
  const resolved = await resolveProjectContext(other);
  assert.equal(resolved.context, null);
  assert.equal(resolved.code, 'missing-credentials');
});

test("the owner key is the active data token for the run's database only", async () => {
  const forRun = await resolveDataToken({ databaseId: DB } as ProjectContext);
  assert.deepEqual(forRun, { token: 'owner-key', userId: 'user-1' });
  const forOther = await resolveDataToken({ databaseId: OTHER_DB } as ProjectContext);
  assert.equal(forOther.token, undefined);
  assert.match(forOther.reason ?? '', /set up Cloud again/);
});

test('the control plane gets the account key, and a gone database is rebuilt from desktop', () => {
  const host = headlessToolsHost(run);
  assert.deepEqual(host.account(), { userId: 'user-1', accessToken: 'account-key', apiKey: 'account-key' });
  assert.equal(host.toolReprovision, false);
  assert.equal(reprovisionAdvice(host), REBUILD_FROM_DESKTOP);
  // A headless host mints no secret and harvests no preview token.
  assert.equal(host.deliverSecret, undefined);
  assert.equal(host.previewToken, undefined);
});
