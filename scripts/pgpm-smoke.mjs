#!/usr/bin/env node
/**
 * Cross-platform pgpm end-to-end smoke test.
 *
 * Creates a throwaway workspace (in a directory whose name contains a space),
 * then runs deploy → verify → revert through the built pgpm CLI. Exercises
 * workspace/module discovery, plan resolution, and migration execution on the
 * host platform — the codepaths that silently broke on Windows because glob
 * patterns were built with native path separators.
 *
 * Usage: node scripts/pgpm-smoke.mjs
 * Requires: pgpm/cli built (pnpm --filter pgpm... build) and a reachable
 * PostgreSQL (standard PG* env vars).
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repoRoot, 'pgpm', 'cli', 'dist', 'index.js');

if (!fs.existsSync(cli)) {
  console.error(`pgpm CLI not built at ${cli} — run: pnpm --filter pgpm... build`);
  process.exit(1);
}

const MODULE = 'smoke_mod';
const database = `pgpm_smoke_${Date.now()}`;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm smoke '));
const workspace = path.join(root, 'workspace');
const moduleDir = path.join(workspace, 'packages', MODULE);

const write = (file, contents) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
};

write(path.join(workspace, 'pgpm.json'), JSON.stringify({ packages: ['packages/*'] }, null, 2));
write(
  path.join(moduleDir, `${MODULE}.control`),
  `# ${MODULE} extension\ncomment = 'pgpm smoke module'\ndefault_version = '0.0.1'\nrequires = 'plpgsql'\nrelocatable = false\nsuperuser = false\n`
);
write(
  path.join(moduleDir, 'pgpm.plan'),
  `%syntax-version=1.0.0\n%project=${MODULE}\n%uri=${MODULE}\n\n` +
    `schema 2024-01-01T00:00:00Z smoke <smoke@example.com> # Create schema\n` +
    `widgets [schema] 2024-01-02T00:00:00Z smoke <smoke@example.com> # Create widgets\n`
);
write(
  path.join(moduleDir, 'deploy', 'schema.sql'),
  `-- Deploy ${MODULE}:schema to pg\n\nBEGIN;\n\nCREATE SCHEMA ${MODULE};\n\nCOMMIT;\n`
);
write(
  path.join(moduleDir, 'deploy', 'widgets.sql'),
  `-- Deploy ${MODULE}:widgets to pg\n\n-- requires: schema\n\nBEGIN;\n\nCREATE TABLE ${MODULE}.widgets (\n    id SERIAL PRIMARY KEY,\n    name TEXT NOT NULL\n);\n\nCOMMIT;\n`
);
write(path.join(moduleDir, 'revert', 'schema.sql'), `-- Revert ${MODULE}:schema\n\nBEGIN;\n\nDROP SCHEMA ${MODULE};\n\nCOMMIT;\n`);
write(path.join(moduleDir, 'revert', 'widgets.sql'), `-- Revert ${MODULE}:widgets\n\nBEGIN;\n\nDROP TABLE ${MODULE}.widgets;\n\nCOMMIT;\n`);
write(
  path.join(moduleDir, 'verify', 'schema.sql'),
  `-- Verify ${MODULE}:schema\n\nBEGIN;\n\nSELECT 1 / count(*) FROM information_schema.schemata WHERE schema_name = '${MODULE}';\n\nROLLBACK;\n`
);
write(
  path.join(moduleDir, 'verify', 'widgets.sql'),
  `-- Verify ${MODULE}:widgets\n\nBEGIN;\n\nSELECT 1 / count(*) FROM information_schema.tables WHERE table_schema = '${MODULE}' AND table_name = 'widgets';\n\nROLLBACK;\n`
);

const run = (label, args) => {
  console.log(`\n=== ${label}: pgpm ${args.join(' ')}`);
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: workspace,
    stdio: 'inherit',
    env: { ...process.env, CI: 'true' }
  });
  if (result.status !== 0) {
    console.error(`pgpm ${args.join(' ')} failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
};

let failed = false;
try {
  run('deploy', ['deploy', '--createdb', '--database', database, '--yes', '--package', MODULE, '--cwd', workspace]);
  run('verify', ['verify', '--database', database, '--yes', '--package', MODULE, '--cwd', workspace]);
  run('revert', ['revert', '--database', database, '--yes', '--package', MODULE, '--cwd', workspace]);
  console.log('\npgpm smoke test passed');
} catch (err) {
  failed = true;
  console.error(err);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
