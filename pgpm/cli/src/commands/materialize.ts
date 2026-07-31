import { materializeWorkspaceTarget, PgpmPackage } from '@pgpmjs/core';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'fs';
import { CLIOptions, Inquirerer } from 'inquirerer';
import { tmpdir } from 'os';
import { join, relative, resolve } from 'path';

const materializeUsageText = `
Materialize Command:

  pgpm materialize <target> [OPTIONS]

  Transpile an apply-proxy module (pgpm.apply.json) once and write the result
  as a plain, deployable PGPM module (deploy/revert/verify + pgpm.plan +
  .control, with the transforms baked into the SQL). The output has no
  pgpm.apply.json and deploys like any hand-written module.

  The proxy stays in the repo as the recipe; the materialized module is its
  committed build artifact. Re-run when the source or provider binding changes.

Arguments:
  target                  Name of the apply-proxy module in the workspace.

Options:
  --help, -h              Show this help message
  --output <dir>          Output directory (default: <workspace>/materialized/<name>)
  --overwrite             Replace an existing output directory
  --check                 Re-materialize to a temp dir and diff against --output;
                          exit non-zero on any difference (drift gate for CI)
  --cwd <directory>       Working directory (default: current directory)

Examples:
  pgpm materialize vendor-app-ported
  pgpm materialize vendor-app-ported --output extensions/vendor-app-ported --overwrite
  pgpm materialize vendor-app-ported --check
`;

/** Recursively list files in a directory as workspace-relative POSIX paths. */
function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(relative(dir, full).replace(/\\/g, '/'));
    }
  };
  walk(dir);
  return out.sort();
}

/** Byte-level diff between two materialized module directories. */
function diffDirs(expectedDir: string, actualDir: string): string[] {
  const expected = new Set(listFiles(expectedDir));
  const actual = new Set(listFiles(actualDir));
  const diffs: string[] = [];

  for (const file of actual) {
    if (!expected.has(file)) diffs.push(`missing from output: ${file}`);
  }
  for (const file of expected) {
    if (!actual.has(file)) {
      diffs.push(`stale in output: ${file}`);
      continue;
    }
    const a = readFileSync(join(expectedDir, file));
    const b = readFileSync(join(actualDir, file));
    if (!a.equals(b)) diffs.push(`content differs: ${file}`);
  }
  return diffs.sort();
}

export default async (
  argv: Partial<Record<string, any>>,
  _prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(materializeUsageText);
    process.exit(0);
  }

  const cwd = argv.cwd ?? process.cwd();
  const target = argv._?.[0] ?? argv.target;
  if (!target) {
    console.error('Error: a target apply-proxy module name is required.');
    console.log(materializeUsageText);
    process.exit(1);
  }

  const project = new PgpmPackage(cwd);
  project.ensureWorkspace();
  const workspacePath = project.workspacePath!;
  const moduleMap = project.getModuleMap();

  const check = Boolean(argv.check);
  const overwrite = Boolean(argv.overwrite);
  const outDir = argv.output
    ? resolve(cwd, argv.output)
    : resolve(workspacePath, 'materialized', String(target));

  if (check) {
    if (!existsSync(outDir)) {
      console.error(`Error: --check requires an existing output at ${outDir}. Run \`pgpm materialize ${target}\` first.`);
      process.exit(1);
    }
    const tmp = mkdtempSync(join(tmpdir(), `pgpm-materialize-check-`));
    try {
      const { spec } = await materializeWorkspaceTarget({ workspacePath, moduleMap, target, outDir: tmp });
      const diffs = diffDirs(outDir, tmp);
      if (diffs.length > 0) {
        console.error(`Drift: materialized "${target}" (from "${spec.source.module}") differs from ${outDir}:`);
        for (const d of diffs) console.error(`  - ${d}`);
        console.error(`\nRe-run \`pgpm materialize ${target} --overwrite\` and commit the result.`);
        process.exit(1);
      }
      console.log(`✔ ${target} is up to date with ${outDir} (byte-identical).`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    return argv;
  }

  if (existsSync(outDir) && !overwrite) {
    console.error(`Error: ${outDir} already exists. Pass --overwrite to replace it.`);
    process.exit(1);
  }
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });

  const { bundle, spec } = await materializeWorkspaceTarget({ workspacePath, moduleMap, target, outDir });

  console.log(`✔ Materialized "${target}" from "${spec.source.module}"`);
  console.log(`  Output:  ${outDir}`);
  console.log(`  Changes: ${bundle.changes.length}`);
  console.log(`  Digest:  ${bundle.manifest.digest}`);
  console.log(`\nDeploy it as a plain module (no pgpm.apply.json needed).`);

  return argv;
};
