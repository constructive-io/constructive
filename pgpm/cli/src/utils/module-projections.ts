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

/** Resolved `--emit-sql` / `--emit-bundle` projection targets for a command. */
export interface EmitProjectionTargets {
  /** Linear SQL target (absolute path, or `-` for stdout). */
  emitSql?: string;
  /** Bundle archive target (absolute path). */
  emitBundle?: string;
}

/**
 * Parse the shared `--emit-sql` / `--emit-bundle` projection flags off a parsed
 * argv, resolving file targets against `cwd` (the `-` stdout sentinel for SQL is
 * preserved). Keeps every command's projection flags identical.
 */
export const parseEmitProjectionTargets = (
  argv: Record<string, unknown>,
  cwd: string
): EmitProjectionTargets => {
  const sqlRaw = argv['emit-sql'] ?? argv.emitSql;
  const emitSql =
    typeof sqlRaw === 'string' && sqlRaw
      ? sqlRaw === STDOUT_TARGET
        ? STDOUT_TARGET
        : path.resolve(cwd, sqlRaw)
      : undefined;
  const bundleRaw = argv['emit-bundle'] ?? argv.emitBundle;
  const emitBundle =
    typeof bundleRaw === 'string' && bundleRaw ? path.resolve(cwd, bundleRaw) : undefined;
  return { emitSql, emitBundle };
};

/** Whether any projection target was requested. */
export const hasEmitProjection = (targets: EmitProjectionTargets): boolean =>
  Boolean(targets.emitSql || targets.emitBundle);

/**
 * Run the requested SQL/bundle projections against a written module directory.
 * `onSuccess` (when provided) is invoked with a human-readable line per emitted
 * artifact; it is skipped for stdout SQL so the stream stays valid SQL.
 */
export const projectModule = async (
  moduleDir: string,
  targets: EmitProjectionTargets,
  onSuccess?: (message: string) => void
): Promise<void> => {
  if (targets.emitSql) {
    await emitModuleSql(moduleDir, targets.emitSql);
    if (targets.emitSql !== STDOUT_TARGET) {
      onSuccess?.(`wrote linear SQL to ${targets.emitSql}`);
    }
  }
  if (targets.emitBundle) {
    await emitModuleBundle(moduleDir, targets.emitBundle);
    onSuccess?.(`wrote bundle to ${targets.emitBundle}`);
  }
};
