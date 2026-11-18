// The keys are bare values, which no shape pattern catches: only their values can redact them.

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { configureHost } from '@agentic-kit/db-tools';

import type { RunIdentity } from '../../src/headless/launch';
import { headlessToolsHost } from '../../src/headless/tools-host';
import type { DevServerManager } from '../../src/pipeline/dev-server';
import { configureFastAppHost, type FastAppHost, type FastAppServices } from '../../src/pipeline/host';
import { ProjectLocks } from '../../src/pipeline/project-lock';
import { runVerifyPipeline, verifyProgress } from '../../src/pipeline/verify-pipeline';

const OWNER_KEY = 'ownerkeyvalue0123456789abcdefghij';
const ACCOUNT_KEY = 'accountkeyvalue0123456789abcdefgh';

let cwd: string;

beforeEach(() => {
  cwd = mkdtempSync(path.join(tmpdir(), 'headless-verify-'));
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

test('a verify_app step log carries neither the owner key nor the account key', async () => {
  const run: RunIdentity = {
    cwd,
    databaseId: '6f1f8a52-7c1e-4a51-9d5b-3c1b2a9e4d10',
    userId: 'user-1',
    email: 'owner@example.com',
    accountKey: ACCOUNT_KEY,
    ownerKey: OWNER_KEY,
    endpoints: { api: 'http://api.localhost/graphql', modules: 'http://modules.localhost/graphql' },
    databaseName: 'food-bank'
  };
  configureHost(headlessToolsHost(run));
  // A dev server whose log shows both keys, as an app's debug output could.
  const devServers = {
    ensure: async () => ({ url: 'http://localhost:4100', port: 4100, reused: false }),
    log: () => `ready on 4100\nauth ${OWNER_KEY}\naccount ${ACCOUNT_KEY}\n`
  } as unknown as DevServerManager;
  const services = { devServers, locks: new ProjectLocks() } as unknown as FastAppServices;
  configureFastAppHost({
    account: () => ({ userId: 'user-1', email: 'owner@example.com' }),
    services: () => services,
    // No binding: the check goes straight to the dev server, then finds no owner session.
    projects: { get: (): undefined => undefined, at: (): undefined => undefined, binding: async (): Promise<null> => null },
    owner: { resume: async (): Promise<null> => null },
    preview: false
  } as unknown as FastAppHost);

  const outcome = await runVerifyPipeline(
    { cwd, services, project: undefined, signal: undefined, commitMessage: undefined, touchedFiles: () => [] },
    verifyProgress({ mark: () => {}, update: () => {} })
  );
  const dev = outcome.details.phases.find((phase) => phase.phase === 'dev');
  assert.equal(dev?.status, 'done');
  const shown = JSON.stringify(outcome.details);
  assert.match(shown, /auth \[redacted\]/);
  assert.ok(!shown.includes(OWNER_KEY), 'the owner key is in the details');
  assert.ok(!shown.includes(ACCOUNT_KEY), 'the account key is in the details');
});
