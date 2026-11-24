// The gen phase: hand the generator the live `_meta` and the AppSpec the
// desktop rendered from the database (view-file.ts), and let it write the
// resource configs, pages, nav and routes into the app.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { generatedMetaTables } from '../blueprints/generated-tables';
import type { LiveMetaTable } from '../extensions/db-tools/live-meta';
import { isPlatformTable } from '../extensions/db-tools/live-meta';
import { outputTail, runCommand } from './command';

export const META_FILE = path.join('.constructive', 'meta.json');

const GEN_TIMEOUT_MS = 120_000;

export type GenResource = {
  name: string;
  route: string;
  /** The `_meta` table name (the GraphQL type). */
  table: string;
  tableName?: string;
  model?: string;
};

/** A file the app owns or edited that misses something gen now emits. Shown once, on the run that brings it. */
export type GenHint = { path: string; state: 'owned' | 'modified'; message: string };

/** A name app-spec.json uses that `_meta` doesn't have, where the spec uses it. */
export type SpecGap = { path: string; name: string; message: string };

export type GenSummary = {
  resources: GenResource[];
  /** Junction tables: no screens of their own, edited through their parents. */
  junctions: Array<{ table: string; between?: string[] }>;
  /**
   * skipped: files the app owns; modified: generated files edited with their
   * header on; removed: generated files of screens gen no longer makes.
   */
  files: { written: string[]; skipped: string[]; modified: string[]; removed: string[] };
  hints: GenHint[];
  /** What gen noticed about the spec against `_meta`, each spec gap too. */
  warnings: string[];
  /** app-spec.json and the API disagree: these names have no screens. */
  specGaps: SpecGap[];
  /** `_meta` tables gen made no screens for, and why. */
  skippedTables: Array<{ table: string; reason: string }>;
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const objects = <T extends object>(value: unknown, keys: readonly (keyof T)[]): T[] =>
  Array.isArray(value)
    ? value.filter(
      (item): item is T =>
        typeof item === 'object' &&
          item !== null &&
          keys.every((key) => typeof (item as Record<keyof T, unknown>)[key] === 'string'),
    )
    : [];

export async function writeMeta(
  appDir: string,
  tables: readonly LiveMetaTable[],
): Promise<GenSummary['skippedTables']> {
  await mkdir(path.join(appDir, '.constructive'), { recursive: true });
  const generated = generatedMetaTables(tables);
  // The backend's table order moves with schema changes; sorted, meta.json
  // diffs show only what changed. The platform's own tables get no screens.
  const sorted = tables
    .filter((table) => !isPlatformTable(table) && !generated.has(table))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  await writeFile(
    path.join(appDir, META_FILE),
    `${JSON.stringify({ _meta: { tables: sorted } }, null, 2)}\n`,
  );
  return [...generated].map(([table, reason]) => ({ table: table.name, reason }));
}

export async function runGen(
  appDir: string,
  specFile: string,
  signal?: AbortSignal,
): Promise<GenSummary> {
  const result = await runCommand(
    'pnpm',
    ['--silent', 'gen:resources', '--meta', META_FILE, '--spec', specFile],
    { cwd: appDir, signal, timeoutMs: GEN_TIMEOUT_MS },
  );
  if (!result.ok) throw new Error(`gen:resources failed:\n${outputTail(result.output)}`);
  const summary = lastJsonObject(result.output) as Partial<GenSummary> | null;
  if (!summary || !Array.isArray(summary.resources)) {
    throw new Error(`gen:resources printed no summary:\n${outputTail(result.output, 10)}`);
  }
  return {
    resources: summary.resources,
    junctions: Array.isArray(summary.junctions) ? summary.junctions : [],
    files: {
      written: strings(summary.files?.written),
      skipped: strings(summary.files?.skipped),
      modified: strings(summary.files?.modified),
      removed: strings(summary.files?.removed),
    },
    hints: objects<GenHint>(summary.hints, ['path', 'message']),
    warnings: strings(summary.warnings),
    specGaps: objects<SpecGap>(summary.specGaps, ['path', 'name', 'message']),
    skippedTables: objects<GenSummary['skippedTables'][number]>(summary.skippedTables, [
      'table',
      'reason',
    ]),
  };
}

// The summary is the last JSON object the CLI prints; anything a build step
// logged before it is ignored.
export function lastJsonObject(output: string): unknown {
  const text = output.trimEnd();
  for (let start = text.lastIndexOf('{'); start >= 0; start = text.lastIndexOf('{', start - 1)) {
    if (start > 0 && text[start - 1] !== '\n') continue;
    try {
      return JSON.parse(text.slice(start));
    } catch {
      // Not the start of the summary; keep looking further back.
    }
  }
  return null;
}
