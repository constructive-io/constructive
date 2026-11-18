// Seed rows point at other seeded rows with "@<table>[<index>]". Link rows may
// name their keys by the linked entities (`{ "volunteers": "@volunteers[0]" }`)
// instead of the key columns the translator derives (`volunteer_id`).

import { linkKey } from './names';
import type { ModelTable } from './spec-model';
import type { SeedRow } from './types';

export type SeedRef = { table: string; index: number };

const REF_RE = /^@([a-z][a-z0-9_]*)\[(\d+)\]$/;

export function parseSeedRef(value: unknown): SeedRef | null {
  if (typeof value !== 'string') return null;
  const match = value.match(REF_RE);
  return match ? { table: match[1], index: Number(match[2]) } : null;
}

/** A string that starts like a reference but doesn't parse as one. */
export const looksLikeRef = (value: unknown): boolean =>
  typeof value === 'string' && value.startsWith('@') && !parseSeedRef(value);

/** A link table's rows with entity-named keys renamed to their key columns; other rows as they are. */
export function normalizeSeedRows(table: ModelTable | undefined, rows: SeedRow[]): SeedRow[] {
  const link = table?.link;
  if (!link) return rows;
  const keys = new Map(link.between.map((side) => [side, linkKey(side)]));
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([column, value]) => [keys.get(column) ?? column, value]),
    ),
  );
}

/** A row's text with its keys in order: key order doesn't change what a row inserts. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : 1,
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
