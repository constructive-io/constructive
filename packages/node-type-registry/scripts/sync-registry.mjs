#!/usr/bin/env node
// constructive-db owns the registry source; this package publishes a copy of it. This script copies src/ from a
// constructive-db checkout. With --check it changes nothing, lists each file that differs, and exits 1 if one does.
//
//   node scripts/sync-registry.mjs [--check] <constructive-db checkout>

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The files under src/ that only one repository has: constructive-db's seed SQL generator and audit, and this
// package's generators of its JSON files and reference pages. Each repository keeps its own tests.
const OWN = {
  'constructive-db': ['src/audit/', 'src/generate.ts'],
  constructive: ['src/codegen/generate-json.ts', 'src/codegen/generate-reference.ts']
};

const args = process.argv.slice(2);
const check = args.includes('--check');
const [checkout, ...extra] = args.filter((arg) => arg !== '--check');
if (!checkout || extra.length) fail('Usage: node scripts/sync-registry.mjs [--check] <constructive-db checkout>');

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const upstream = join(checkout, 'packages', 'node-type-registry');
if (!existsSync(join(upstream, 'src', 'index.ts'))) {
  fail(`${upstream} has no registry source (src/index.ts). Give the path of a constructive-db checkout.`);
}

const owned = (repo, file) => OWN[repo].some((path) => (path.endsWith('/') ? file.startsWith(path) : file === path));
const files = (root) => readdirSync(join(root, 'src'), { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name).slice(root.length + 1).split('\\').join('/'))
  .sort();

const shared = files(upstream).filter((file) => !owned('constructive-db', file));
const clash = shared.filter((file) => owned('constructive', file));
if (clash.length) {
  fail(`constructive-db now has ${clash.join(', ')}, which this package keeps as its own. Rename one of them, or take it out of OWN.`);
}
const kept = new Set(shared);
const changes = [
  ...shared.filter((file) => !existsSync(join(here, file))).map((file) => ({ kind: 'missing', file })),
  ...shared
    .filter((file) => existsSync(join(here, file)) && !readFileSync(join(here, file)).equals(readFileSync(join(upstream, file))))
    .map((file) => ({ kind: 'changed', file })),
  ...files(here).filter((file) => !owned('constructive', file) && !kept.has(file)).map((file) => ({ kind: 'extra', file }))
];

if (check) {
  if (!changes.length) {
    console.log(`The registry source matches ${upstream}.`);
    process.exit(0);
  }
  for (const { kind, file } of changes) console.log(`${kind.padEnd(7)} ${file}`);
  console.error(
    `\nThe registry source differs from ${upstream} in ${changes.length} file(s). ` +
      'Make the change in constructive-db, then run node scripts/sync-registry.mjs <constructive-db checkout> here.'
  );
  process.exit(1);
}

for (const { kind, file } of changes) {
  if (kind === 'extra') rmSync(join(here, file));
  else {
    mkdirSync(dirname(join(here, file)), { recursive: true });
    copyFileSync(join(upstream, file), join(here, file));
  }
  console.log(`${kind === 'extra' ? 'removed' : 'copied '} ${file}`);
}
console.log(
  `\n${changes.length} file(s) synced. Build and test this package, then check the skills pages: ` +
    'ts-node src/codegen/generate-reference.ts --check --outdir <constructive-skills checkout>/.agents/skills'
);

function fail(message) {
  console.error(message);
  process.exit(2);
}
