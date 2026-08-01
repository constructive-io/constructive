/**
 * Input ingestion + migration emission for `pgpm diff`.
 *
 * A diff side can be a pgpm module directory, a raw .sql file, or a live
 * database (handled by the CLI via pg_dump; the dump text lands here through
 * {@link sqlToDiffChanges}). Every side normalizes to the same
 * `DiffInputChange[]` seam the semantic diff driver consumes, so the
 * comparison is source- and dial-invariant.
 */
import { PgpmRow } from '@pgpmjs/core';
import { alterationPathFor } from '@pgpmjs/naming-spec';
import type { DiffInputChange, SemanticDeltaChange } from '@pgpmjs/transform';
import * as fs from 'fs';
import * as path from 'path';

import { loadModuleSource, stripTransactionWrapper } from './module-source';

/** What a diff side spec resolves to. */
export type DiffSideKind = 'module' | 'sql' | 'database';

/** A diff side normalized to the semantic diff driver's input seam. */
export interface DiffSide {
  kind: DiffSideKind;
  /** Human-readable label for messages (module name, file, db). */
  label: string;
  changes: DiffInputChange[];
  warnings: string[];
}

/**
 * Classify a side spec: `db:<name>` or a postgres:// / postgresql://
 * connection string is a live database; a directory containing pgpm.plan is
 * a module; an existing file is raw SQL.
 */
export const resolveDiffSideKind = (spec: string): DiffSideKind => {
  if (/^postgres(ql)?:\/\//.test(spec) || spec.startsWith('db:')) return 'database';
  const resolved = path.resolve(spec);
  if (fs.existsSync(resolved)) {
    if (fs.statSync(resolved).isDirectory()) {
      if (fs.existsSync(path.join(resolved, 'pgpm.plan'))) return 'module';
      throw new Error(`${spec}: directory has no pgpm.plan (not a pgpm module)`);
    }
    return 'sql';
  }
  throw new Error(`${spec}: not a module directory, .sql file, db:<name>, or connection string`);
};

/** Lines pg_dump emits that carry no schema content. */
const DUMP_NOISE = [
  /^\\/,                                   // psql meta-commands (\connect, \restrict, ...)
  /^SET\s+[\w.]+\s*(=|TO)\s*[^;]*;?\s*$/i, // session SET preamble
  /^SELECT\s+pg_catalog\.set_config\(/i
];

/**
 * Strip the pg_dump session preamble (SET/set_config, psql meta-commands)
 * so the remaining text is pure DDL the classifier understands. Only whole
 * lines are stripped — SET clauses inside function bodies are untouched.
 */
export const stripDumpPreamble = (sql: string): string =>
  sql
    .split('\n')
    .filter(line => !DUMP_NOISE.some(re => re.test(line.trim())))
    .join('\n')
    .trim();

/** Wrap raw SQL text (a .sql file or a schema dump) as a single diff change. */
export const sqlToDiffChanges = (sql: string, name: string): DiffInputChange[] => [
  {
    name,
    dependencies: [],
    deploy: stripDumpPreamble(stripTransactionWrapper(sql))
  }
];

/**
 * Load an on-disk diff side (module directory or .sql file). Live databases
 * are dumped by the caller and fed through {@link sqlToDiffChanges}.
 */
export const loadDiffSideFromDisk = (spec: string): DiffSide => {
  const kind = resolveDiffSideKind(spec);
  if (kind === 'database') {
    throw new Error(`${spec}: live database sides must be dumped by the caller`);
  }
  const resolved = path.resolve(spec);
  if (kind === 'module') {
    const source = loadModuleSource(resolved);
    return {
      kind,
      label: source.name,
      changes: source.changes.map(change => ({
        name: change.name,
        dependencies: change.dependencies,
        deploy: change.deploy
      })),
      warnings: source.warnings
    };
  }
  return {
    kind,
    label: path.basename(resolved),
    changes: sqlToDiffChanges(fs.readFileSync(resolved, 'utf-8'), path.basename(resolved, '.sql')),
    warnings: []
  };
};

/**
 * Convert the semantic diff's delta changes into writable pgpm rows.
 * Plan order is the delta order (drops first, then creates/alters); when two
 * changes derive the same spec path, later occurrences get the alteration
 * convention (`alterationPathFor`), with the parent added to their deps.
 */
export const deltaChangesToRows = (changes: SemanticDeltaChange[]): PgpmRow[] => {
  const counters = new Map<string, number>();
  const taken = new Set<string>();

  return changes.map(change => {
    let deploy = change.name;
    const deps = [...change.dependencies];
    if (taken.has(deploy)) {
      let n = (counters.get(change.name) ?? 0) + 1;
      while (taken.has(alterationPathFor(change.name, n))) n++;
      counters.set(change.name, n);
      deploy = alterationPathFor(change.name, n);
      if (!deps.includes(change.name)) deps.push(change.name);
    }
    taken.add(deploy);
    return {
      name: deploy,
      deploy,
      deps: deps.filter(dep => taken.has(dep) && dep !== deploy),
      content: change.deploy,
      revert: change.revert,
      verify: change.verify
    };
  });
};
