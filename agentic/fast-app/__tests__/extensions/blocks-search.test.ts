import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  appRegistry,
  describeMatch,
  rankBlocks,
  registryIndex,
  type RegistryItem,
} from '../../src/extensions/blocks-search';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

// The local registry's index, trimmed to a few blocks and primitives.
const index = JSON.parse(
  readFileSync(new URL('./__fixtures__/registry-index.json', moduleUrl), 'utf8'),
) as { items: RegistryItem[] };

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

type ProjectOptions = { components?: string; composedFrom?: string | null };

function composedProject({
  components = 'http://127.0.0.1:4005/r/{name}.json',
  composedFrom = 'http://127.0.0.1:4005/r/{name}.json',
}: ProjectOptions = {}): string {
  const cwd = mkdtempSync(path.join(tmpdir(), 'blocks-'));
  dirs.push(cwd);
  const app = path.join(cwd, 'packages', 'app');
  mkdirSync(path.join(app, '.constructive'), { recursive: true });
  writeFileSync(
    path.join(app, 'components.json'),
    JSON.stringify({ registries: { '@constructive': components } }),
  );
  writeFileSync(
    path.join(app, '.constructive', 'compose.json'),
    JSON.stringify({
      shadcn: '4.13.1',
      blocks: ['resource-kit', 'dashboard-tiles'],
      ...(composedFrom ? { registryUrl: composedFrom } : {}),
    }),
  );
  return cwd;
}

test('a domain request finds its domain blocks, with their docs and install command', () => {
  const registry = appRegistry(composedProject());
  assert.equal(registry.indexUrl, 'http://127.0.0.1:4005/r/registry.json');

  const chat = rankBlocks(index.items, 'review agent conversations and messages');
  assert.deepEqual(
    chat
      .map((m) => m.name)
      .slice(0, 2)
      .sort(),
    ['agents-builder', 'ai'],
  );
  const text = describeMatch(chat.find((m) => m.name === 'ai')!, registry);
  assert.match(text, /^- ai \(block\): AI Kit\. Presentational primitives for AI/);
  assert.match(text, /\n {2}docs: Import PromptInput, Message, Tool, Reasoning, and PlanTracker/);
  assert.match(text, /\n {2}brings: cn, button, avatar,/);
  assert.match(
    text,
    /\n {2}install \(in packages\/app\): pnpm dlx shadcn@4\.13\.1 add @constructive\/ai$/,
  );

  assert.equal(rankBlocks(index.items, 'documents shared with investors')[0].name, 'data-rooms');
  assert.equal(rankBlocks(index.items, 'organization chart of the team')[0].name, 'org-chart');
  const tiles = rankBlocks(index.items, 'dashboard with counts')[0];
  assert.equal(tiles.name, 'dashboard-tiles');
  assert.match(describeMatch(tiles, registry), /installed already/);
});

test('the index is read once per session, and an unreachable registry says what to do', async () => {
  let calls = 0;
  const read = registryIndex(async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => index };
  });
  await read('http://127.0.0.1:4005/r/registry.json');
  await read('http://127.0.0.1:4005/r/registry.json');
  assert.equal(calls, 1);

  const down = registryIndex(async () => {
    throw new TypeError('fetch failed');
  });
  await assert.rejects(down('http://127.0.0.1:4005/r/registry.json'), {
    message:
      'The blocks registry at http://127.0.0.1:4005/r/registry.json is unreachable (fetch failed). Build with the blocks already in src/components/ui until it answers.',
  });
  assert.throws(
    () => appRegistry(mkdtempSync(path.join(tmpdir(), 'no-app-'))),
    /No packages\/app\/components\.json/,
  );
});

test('only the registry the app was composed from, or the configured one, is read', () => {
  assert.throws(
    () => appRegistry(composedProject({ components: 'http://169.254.169.254/latest/{name}' })),
    {
      message:
        'packages/app/components.json points the "@constructive" registry at http://169.254.169.254, but the app was composed from http://127.0.0.1:4005. search_blocks reads only that registry.',
    },
  );
  assert.throws(
    () => appRegistry(composedProject({ components: 'file:///etc/{name}' })),
    /must be an http or https URL, not file:/,
  );
  assert.throws(
    () => appRegistry(composedProject({ composedFrom: null })),
    /compose\.json records no registry/,
  );

  const published = 'https://constructive-io.github.io/blocks/r/{name}.json';
  const registry = appRegistry(composedProject({ components: published, composedFrom: null }), {
    registryUrl: published,
  });
  assert.equal(registry.indexUrl, 'https://constructive-io.github.io/blocks/r/registry.json');
});
