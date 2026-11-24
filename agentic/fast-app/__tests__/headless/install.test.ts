// A cloud turn runs in a fresh clone with no packages/app/node_modules. A fake
// pnpm on PATH stands in for the install: it logs each run, takes a moment, and
// leaves what db-tools reads as a finished install (or fails).

import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { MemoryRunLogStore } from '@agentic-kit/run-log';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

import { afterInstall, headlessExtensions } from '../../src/headless/extensions';
import { headlessHost } from '../../src/headless/host';
import type { RunIdentity } from '../../src/headless/launch';
import type { CheckedOptions } from '../../src/headless/options';
import { cloneTemplate } from '../../src/headless/template';

let root: string;
let tree: string;
let app: string;
let log: string;

const runs = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').length : 0);

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'headless-install-'));
  tree = path.join(root, 'clone');
  app = path.join(tree, 'packages', 'app');
  log = path.join(root, 'pnpm.log');
  const bin = path.join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(
    path.join(bin, 'pnpm'),
    `#!/bin/sh
echo run >> "${log}"
sleep "\${FAKE_PNPM_SLEEP:-0.3}"
if [ -n "$FAKE_PNPM_FAIL" ]; then echo "ERR_PNPM_FETCH_404 the registry refused @constructive/ui"; exit 1; fi
mkdir -p node_modules/.bin && touch node_modules/.modules.yaml node_modules/.bin/graphql-codegen
`
  );
  chmodSync(path.join(bin, 'pnpm'), 0o755);
  process.env.PATH = `${bin}${path.delimiter}${process.env.PATH}`;
  delete process.env.FAKE_PNPM_FAIL;
  delete process.env.FAKE_PNPM_SLEEP;
  // A composed app as desktop commits it, without its node_modules. Its dev
  // server only comes up once the packages are in.
  mkdirSync(path.join(app, '.constructive'), { recursive: true });
  writeFileSync(path.join(app, '.constructive', 'compose.json'), '{}');
  writeFileSync(path.join(app, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
  const dev = `sh -c 'test -f node_modules/.modules.yaml || exit 1; echo "  - Local:        http://localhost:$PORT"; echo " ✓ Ready in 1ms"; exec sleep 30'`;
  writeFileSync(path.join(app, 'package.json'), JSON.stringify({ scripts: { dev } }));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

test('the app is installed once from the start, and every tool that needs it joins that install', async () => {
  const template = cloneTemplate(tree);
  template.start();
  await Promise.all([template.materialize(tree), template.installed(), template.installed()]);
  assert.equal(runs(), 1);
  assert.ok(existsSync(path.join(app, 'node_modules', '.modules.yaml')));
});

test("verify_app's dev server in a fresh clone starts once the app's packages are in", async () => {
  const run: RunIdentity = {
    cwd: tree,
    databaseId: '6f1f8a52-7c1e-4a51-9d5b-3c1b2a9e4d10',
    userId: 'user-1',
    email: 'owner@example.com',
    accountKey: 'account-key',
    ownerKey: 'owner-key',
    endpoints: { api: 'http://api.localhost/graphql', modules: 'http://modules.localhost/graphql' },
    databaseName: 'food-bank'
  };
  const options = {
    cwd: tree,
    stateDir: path.join(root, 'state'),
    runLog: { store: new MemoryRunLogStore(), runId: 'run-1', flush: async () => {} },
    approvalTimeoutMs: 60_000
  } as unknown as CheckedOptions;
  mkdirSync(options.stateDir);
  const { host, dispose } = headlessHost(run, options);
  try {
    const { url } = await host.services()!.devServers.ensure(app);
    assert.match(url, /^http:\/\/localhost:\d+/);
    assert.equal(runs(), 1);
  } finally {
    await dispose();
  }
}, 30_000);

test('a failed install is the waiting tool\'s error, with the cause and what to do, and the next call installs again', async () => {
  const unhandled: unknown[] = [];
  const record = (reason: unknown): void => void unhandled.push(reason);
  process.on('unhandledRejection', record);
  try {
    process.env.FAKE_PNPM_FAIL = '1';
    const template = cloneTemplate(tree);
    template.start();
    await new Promise((resolve) => setTimeout(resolve, 600));
    await assert.rejects(template.installed(), (err: Error) => {
      assert.match(err.message, /^The app's packages could not be installed in .*packages\/app/);
      assert.match(err.message, /ERR_PNPM_FETCH_404 the registry refused @constructive\/ui/);
      assert.match(err.message, /call the tool again/);
      return true;
    });
    delete process.env.FAKE_PNPM_FAIL;
    await template.materialize(tree);
    assert.ok(runs() >= 2);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', record);
  }
});

test('a tool that needs the app waits for its install, and fails with the install when it failed', async () => {
  let release!: () => void;
  let ran = 0;
  const tool = afterInstall(
    {
      name: 'run_codegen',
      label: '',
      description: '',
      parameters: {} as never,
      execute: async () => {
        ran += 1;
        return { content: [], details: {} };
      }
    },
    () => new Promise<void>((resolve) => (release = resolve))
  );
  const call = tool.execute('call-1', {}, undefined, undefined, {} as never);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(ran, 0);
  release();
  await call;
  assert.equal(ran, 1);

  const failing = afterInstall(tool, () => Promise.reject(new Error('The app\'s packages could not be installed')));
  await assert.rejects(failing.execute('call-2', {}, undefined, undefined, {} as never), /could not be installed/);
  assert.equal(ran, 1);
});

test("the run's run_codegen is one of those tools", async () => {
  const tools = new Map<string, { execute: (...args: unknown[]) => Promise<unknown> }>();
  const pi = {
    registerTool: (tool: { name: string; execute: (...args: unknown[]) => Promise<unknown> }): void =>
      void tools.set(tool.name, tool),
    on: (): void => {}
  } as unknown as ExtensionAPI;
  for (const extension of headlessExtensions(() => Promise.reject(new Error('install failed here')))) {
    await extension(pi);
  }
  await assert.rejects(tools.get('run_codegen')!.execute('call-1', {}, undefined, undefined, { cwd: tree }), /install failed here/);
});
