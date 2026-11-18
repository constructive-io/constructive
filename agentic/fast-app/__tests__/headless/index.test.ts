// The entry point against a fake backend: db-tools' fetch sends *.localhost
// to 127.0.0.1 with the Host header, so one server answers every realm.

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { getHost, hostContextSource } from '@agentic-kit/db-tools';
import { MemoryRunLogStore } from '@agentic-kit/run-log';

import {
  createHeadlessAppBuilding,
  type HeadlessAppBuildingOptions,
  HeadlessOptionsError,
  LaunchError
} from '../../src/headless';
import { getFastAppHost, hostPreviews } from '../../src/pipeline/host';

const DB = '6f1f8a52-7c1e-4a51-9d5b-3c1b2a9e4d10';
const ACCOUNT_KEY = 'acct-key-0123456789abcdef';
const OWNER_KEY = 'owner-key-0123456789abcdef';

let server: Server;
let port: number;
let asked: Array<{ host: string; key: string }>;
let ownerKeyAccepted: boolean;
let root: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const host = (req.headers.host ?? '').split(':')[0];
      const key = (req.headers.authorization ?? '').replace(/^Bearer /, '');
      asked.push({ host, key });
      const query = JSON.parse(body || '{}').query ?? '';
      const answer = (data: unknown) => res.end(JSON.stringify({ data }));
      const refuse = () =>
        res.end(JSON.stringify({ errors: [{ message: 'You must be signed in to do that.', extensions: { code: 'UNAUTHENTICATED' } }] }));
      res.setHeader('Content-Type', 'application/json');
      if (host === 'auth.localhost') return key === ACCOUNT_KEY ? answer({ currentUserId: 'user-1' }) : refuse();
      if (host === 'api.localhost' && query.includes('databases')) {
        return answer({ databases: { nodes: [{ id: DB, name: 'food-bank', ownerId: 'user-1' }] } });
      }
      if (host === 'auth-food-bank.localhost') {
        return key === OWNER_KEY && ownerKeyAccepted ? answer({ currentUserId: 'user-1' }) : refuse();
      }
      res.statusCode = 404;
      res.end('{}');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  asked = [];
  ownerKeyAccepted = true;
  root = mkdtempSync(path.join(tmpdir(), 'headless-entry-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function options(flushes: { count: number }): HeadlessAppBuildingOptions {
  const cwd = path.join(root, 'clone');
  mkdirSync(cwd);
  return {
    cwd,
    stateDir: path.join(root, 'session', 'app-building'),
    databaseId: DB,
    account: { email: 'owner@example.com', apiKey: ACCOUNT_KEY },
    ownerKey: OWNER_KEY,
    endpoints: {
      api: `http://api.localhost:${port}/graphql`,
      modules: `http://modules.localhost:${port}/graphql`
    },
    runLog: {
      store: new MemoryRunLogStore(),
      runId: 'run-1',
      flush: async () => {
        flushes.count += 1;
      }
    }
  };
}

test('starts with both hosts configured, the tools, their names and the prompt, and never flushes', async () => {
  const flushes = { count: 0 };
  const input = options(flushes);
  const started = await createHeadlessAppBuilding(input);
  assert.equal(flushes.count, 0);
  assert.ok(existsSync(input.stateDir));
  assert.ok(started.toolNames.includes('plan_app') && started.toolNames.includes('verify_app'));
  assert.equal(started.extensions.length, 7);
  assert.match(started.systemPrompt, /^## Building an app/);
  assert.match(started.systemPrompt, /## Database and schema tools\n\nThese tools are this run's database and schema tools: `describe_schema`/);

  const host = getFastAppHost();
  assert.deepEqual(host.account(), { userId: 'user-1', email: 'owner@example.com' });
  assert.equal(host.chatId(undefined), 'run-1');
  assert.equal(host.projects.at(input.cwd)?.databaseId, DB);
  assert.deepEqual(await host.projects.binding(input.cwd, undefined), {
    databaseId: DB,
    ownerId: 'user-1',
    databaseName: 'food-bank'
  });
  assert.equal(host.renderCheck, undefined);
  assert.equal(host.appOrigins, undefined);
  assert.equal(host.appSite, undefined);
  assert.equal(host.events, undefined);
  // The pipeline then sets no previewUrl in the card's details or the results,
  // so neither the progress entries nor the results name the pod's dev server.
  assert.equal(hostPreviews(), false);
  assert.equal(host.services()?.template.available(), true);
  assert.equal(getHost().account()?.userId, 'user-1');
  assert.equal(((await hostContextSource(input.cwd)) as Record<string, string>).DATABASE_NAME, 'food-bank');

  // The owner key went to the app's realm only.
  assert.deepEqual(
    asked.filter((a) => a.key === OWNER_KEY).map((a) => a.host),
    ['auth-food-bank.localhost']
  );
  await started.dispose();
  await started.dispose();
});

test('a Chromium path gives the host its render check', async () => {
  const input = { ...options({ count: 0 }), chromiumPath: '/usr/bin/chromium' };
  const started = await createHeadlessAppBuilding(input);
  assert.equal(typeof getFastAppHost().renderCheck, 'function');
  await started.dispose();
});

test('a refused owner key fails the start', async () => {
  ownerKeyAccepted = false;
  await assert.rejects(createHeadlessAppBuilding(options({ count: 0 })), (err: Error) => {
    assert.ok(err instanceof LaunchError);
    assert.match(err.message, /APP_BUILD_OWNER_KEY/);
    assert.ok(!err.message.includes(OWNER_KEY));
    return true;
  });
});

test('options it cannot use fail before any request', async () => {
  const input = { ...options({ count: 0 }), ownerKey: '' };
  await assert.rejects(createHeadlessAppBuilding(input), HeadlessOptionsError);
  assert.equal(asked.length, 0);
});
