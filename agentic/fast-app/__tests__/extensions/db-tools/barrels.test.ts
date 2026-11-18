// Tests for Turbopack barrel normalization. Run with:
//   pnpm test -- __tests__/extensions/db-tools/barrels.test.ts

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { normalizeSdkBarrels } from '@agentic-kit/db-tools/run-codegen/barrels';

function makeFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'barrels-'));
  // root/index.ts re-exports a sibling DIRECTORY ./hooks and a sibling FILE ./types
  mkdirSync(path.join(root, 'hooks'));
  writeFileSync(path.join(root, 'hooks', 'index.ts'), 'export const a = 1;\n');
  writeFileSync(path.join(root, 'types.ts'), 'export type T = string;\n');
  writeFileSync(
    path.join(root, 'index.ts'),
    [
      "export * from './hooks';", // directory -> should become ./hooks/index
      "export * from './types';", // file -> should be left alone
      "import { x } from './hooks/index';", // already normalized -> untouched
      "export * from './types.ts';", // explicit extension -> untouched
    ].join('\n') + '\n',
  );
  return root;
}

test('rewrites directory specifiers to /index, leaving files alone', () => {
  const root = makeFixture();
  try {
    const changed = normalizeSdkBarrels(root);
    assert.equal(changed, 1, 'one file (index.ts) rewritten');
    const out = readFileSync(path.join(root, 'index.ts'), 'utf8');
    assert.ok(out.includes("export * from './hooks/index';"), 'directory specifier normalized');
    assert.ok(out.includes("export * from './types';"), 'sibling file specifier left alone');
    assert.ok(out.includes("import { x } from './hooks/index';"), 'already-normalized untouched');
    assert.ok(out.includes("export * from './types.ts';"), 'explicit-extension untouched');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('is idempotent — a second run rewrites nothing', () => {
  const root = makeFixture();
  try {
    assert.equal(normalizeSdkBarrels(root), 1);
    assert.equal(normalizeSdkBarrels(root), 0, 'second run is a no-op');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('returns 0 when the root does not exist', () => {
  assert.equal(normalizeSdkBarrels(path.join(tmpdir(), 'does-not-exist-xyz')), 0);
});
