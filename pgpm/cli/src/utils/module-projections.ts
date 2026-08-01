/**
 * Projections of an emitted pgpm module directory.
 *
 * A module directory is the canonical artifact the dials pipeline produces
 * (`writeModule` from `@pgpmjs/transform`). "Linear SQL" and "bundle" are not
 * separate emitters — they are pure projections of that one module, produced
 * by the same battle-tested machinery `pgpm package` uses:
 *
 *   - {@link emitModuleSql}    -> consolidated single-file SQL (`packageModule`)
 *   - {@link emitModuleBundle} -> content-addressed bundle (`buildExecutableBundle`)
 *
 * They live in the CLI (not `@pgpmjs/transform`) because they reuse packaging
 * and bundle code from `@pgpmjs/core`, and `core` already depends on
 * `transform`.
 */
import { buildExecutableBundle, packageModule, writeBundleArchiveFile } from '@pgpmjs/core';
import * as fs from 'fs';
import * as path from 'path';

/** Sentinel meaning "write to stdout" for a file-valued emit target. */
export const STDOUT_TARGET = '-';

/**
 * Consolidate an emitted module directory into a single linear SQL script.
 * Statements are resolved in plan order and deparsed once (comments and
 * per-change file boundaries collapse away). When `target` is `-` the SQL is
 * written to stdout; otherwise it is written to the given file path.
 */
export const emitModuleSql = async (moduleDir: string, target: string): Promise<void> => {
  const { sql } = await packageModule(moduleDir, { extension: false, usePlan: true, pretty: true });
  if (target === STDOUT_TARGET) {
    process.stdout.write(sql.endsWith('\n') ? sql : sql + '\n');
    return;
  }
  const resolved = path.resolve(target);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, sql.endsWith('\n') ? sql : sql + '\n');
};

/**
 * Project an emitted module directory into a content-addressed bundle archive
 * (`.bundle.tar.gz`) at `target` — the same executable bundle `pgpm package`
 * stores beside the packaged SQL, but written to an arbitrary path.
 */
export const emitModuleBundle = async (moduleDir: string, target: string): Promise<void> => {
  const bundle = await buildExecutableBundle(moduleDir, { createdWith: '@pgpmjs/cli' });
  const resolved = path.resolve(target);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  writeBundleArchiveFile(bundle, resolved);
};
