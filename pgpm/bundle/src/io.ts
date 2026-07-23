import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

import { parseControlContent } from '@pgpmjs/ast/files/extension/reader';
import { parsePlanContent } from '@pgpmjs/ast/files/plan/parser';
import { parsePgpmHeader } from '@pgpmjs/ast/files/sql/header';
import { Change } from '@pgpmjs/ast/files/types';
import { readModule } from '@pgpmjs/ast/module/reader';
import {
  PgpmChangeAst,
  PgpmControlAst,
  PgpmModuleAst,
  PgpmScriptAst
} from '@pgpmjs/ast/module/types';
import { writeModule } from '@pgpmjs/ast/module/writer';
import { mapScripts } from '@pgpmjs/traverse';
import { createBundle, CreateBundleOptions } from './create';
import { BundleScript, MigrationBundle } from './types';

/** Default file name for a serialized bundle artifact. */
export const BUNDLE_FILE_NAME = 'pgpm-bundle.json';

/**
 * Build a bundle straight from a module directory on disk (readModule → createBundle).
 */
export function bundleFromModule(
  moduleDir: string,
  options?: CreateBundleOptions
): MigrationBundle {
  return createBundle(readModule(moduleDir), options);
}

/**
 * Serialize a bundle to a single JSON artifact file (stable 2-space formatting).
 */
export function writeBundleFile(bundle: MigrationBundle, filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(bundle, null, 2) + '\n');
}

/**
 * Read a bundle artifact JSON file back into memory.
 */
export function readBundleFile(filePath: string): MigrationBundle {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as MigrationBundle;
}

function scriptAstFromBundleScript(script: BundleScript): PgpmScriptAst {
  const { header, body } = parsePgpmHeader(script.sql);
  return { kind: script.kind, header, body, raw: script.sql };
}

/**
 * Hydrate a bundle back into a {@link PgpmModuleAst} — the inverse of
 * `createBundle`. Composes the existing plan/control/SQL-header parsers over
 * the bundle's byte-exact contents; every leaf keeps the bundle text as its
 * `raw`, so `writeModule` reproduces the bundle losslessly.
 */
export function moduleFromBundle(bundle: MigrationBundle, dir = ''): PgpmModuleAst {
  const parsed = parsePlanContent(bundle.plan);
  if (!parsed.data) {
    const detail = parsed.errors
      .map(e => `line ${e.line}: ${e.message}`)
      .join('; ');
    throw new Error(`Failed to parse bundle plan for ${bundle.manifest.name}: ${detail}`);
  }
  const plan = parsed.data;
  const planEntries = new Map(plan.changes.map(change => [change.name, change]));

  let control: PgpmControlAst | null = null;
  if (bundle.control) {
    const { requires, version } = parseControlContent(bundle.control.content);
    control = {
      fileName: bundle.control.fileName,
      name: bundle.manifest.name,
      requires,
      version,
      raw: bundle.control.content
    };
  }

  const changes: PgpmChangeAst[] = bundle.changes.map(change => {
    const planEntry: Change =
      planEntries.get(change.name) ?? { name: change.name, dependencies: change.dependencies };
    const { deploy, revert, verify } = mapScripts(change, scriptAstFromBundleScript);
    return { name: change.name, plan: planEntry, deploy, revert, verify };
  });

  return {
    dir,
    name: bundle.manifest.name,
    plan,
    planRaw: bundle.plan,
    control,
    changes
  };
}

/**
 * Materialize a bundle back into a real, deployable pgpm module directory:
 * `pgpm.plan`, the `.control` file (when present), and each change's
 * deploy/revert/verify script at its `deploy/<change>.sql` path.
 *
 * The inverse of {@link bundleFromModule}; the emitted directory can be read
 * back with `readModule` or deployed with `PgpmMigrate`. Implemented as
 * {@link moduleFromBundle} → `writeModule` (byte-exact `raw` leaves), so the
 * bundle write path is the module AST writer — not a parallel one.
 */
export function materializeBundle(bundle: MigrationBundle, outDir: string): void {
  writeModule(moduleFromBundle(bundle, outDir), { outDir });
}
