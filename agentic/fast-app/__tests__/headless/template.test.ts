import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { APP_SPEC_SCHEMA_FILE } from '../../src/app-spec';
import { cloneTemplate } from '../../src/headless/template';
import { COMPOSE_MARKER } from '../../src/pipeline/snapshot-clone';

let tree: string;
let app: string;

beforeEach(() => {
  tree = mkdtempSync(path.join(tmpdir(), 'headless-template-'));
  app = path.join(tree, 'packages', 'app');
});
afterEach(() => rmSync(tree, { recursive: true, force: true }));

function composeApp({ installed }: { installed: boolean }) {
  mkdirSync(path.join(app, '.constructive'), { recursive: true });
  writeFileSync(path.join(app, COMPOSE_MARKER), '{}');
  writeFileSync(path.join(app, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
  if (installed) {
    // What db-tools reads as a finished install, so no command runs.
    mkdirSync(path.join(app, 'node_modules', '.bin'), { recursive: true });
    writeFileSync(path.join(app, 'node_modules', '.modules.yaml'), '');
    writeFileSync(path.join(app, 'node_modules', '.bin', 'graphql-codegen'), '');
  }
}

test('a clone without packages/app fails with what to do, and composes nothing', async () => {
  await assert.rejects(cloneTemplate(tree).materialize(tree), (err: Error) => {
    assert.match(err.message, /packages\/app is missing/);
    assert.match(err.message, /never composes the app template: open the project in Constructive Desktop/);
    return true;
  });
});

test('an app that is not composed fails, and is left as it is', async () => {
  mkdirSync(app, { recursive: true });
  writeFileSync(path.join(app, 'package.json'), '{}');
  await assert.rejects(cloneTemplate(tree).materialize(tree), /is not a composed app: it has no \.constructive\/compose\.json/);
});

test('a composed app is only installed; a finished install runs nothing', async () => {
  composeApp({ installed: true });
  await cloneTemplate(tree).materialize(tree);
});

test('another folder than the run’s work tree is refused', async () => {
  composeApp({ installed: true });
  await assert.rejects(cloneTemplate(tree).materialize(path.join(tree, 'other')), /builds the app in .* only/);
});

test("the AppSpec schema is the app's own copy, and none without it", async () => {
  const template = cloneTemplate(tree);
  assert.equal(template.available(), true);
  assert.equal(await template.schemaFile(), null);
  const own = path.join(app, APP_SPEC_SCHEMA_FILE);
  mkdirSync(path.dirname(own), { recursive: true });
  writeFileSync(own, '{}');
  assert.equal(await template.schemaFile(), own);
});
