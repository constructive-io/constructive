// The words AppSpec checks share: how a list of names reads in a message, the
// columns every table gets, whether a value fits a column type, the spellings
// of "now", and the known name a typo most likely meant.

import type { SpecFieldType } from './types';

/** `"a", "b", "c"`, the way every message lists names and values. */
export const quoted = (names: Iterable<string>) => [...names].map((n) => `"${n}"`).join(', ');

export function missingBlueprintTable(slug: string, table: string, names: string[]): string {
  const start = `${slug} has no table "${table}"`;
  const guess = closestName(table, names);
  if (guess) return `${start}; did you mean "${guess}"?`;
  return names.length
    ? `${start}; its tables are ${quoted(names)}.`
    : `${start}; it has no named tables.`;
}

// Every app table gets these from the translator's nodes.
export const SYSTEM_COLUMNS = new Set(['id', 'owner_id', 'created_at', 'updated_at']);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Why a value can't go into a column of this type, or null when it can. */
export function misfit(type: SpecFieldType, value: unknown): string | null {
  if (value === null) return null;
  switch (type) {
  case 'integer':
    return Number.isInteger(value) ? null : 'must be a whole number';
  case 'decimal':
  case 'money':
    return typeof value === 'number' ||
        (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)))
      ? null
      : 'must be a number';
  case 'boolean':
    return typeof value === 'boolean' ? null : 'must be true or false';
  case 'date':
    return typeof value === 'string' && DATE_RE.test(value)
      ? null
      : 'must be a date like "2026-10-19"';
  case 'timestamp':
    return typeof value === 'string' && !isNaN(Date.parse(value))
      ? null
      : 'must be an ISO date-time like "2026-10-19T09:00:00Z"';
  case 'json':
    return null;
  default:
    return typeof value === 'string' ? null : 'must be a string';
  }
}

// The defaults that mean "when the row is inserted", per column type, and the
// expression each becomes. Validation and translation both read this table, so
// a spelling either passes and becomes the expression or fails before the card.
export const NOW_DEFAULTS: Readonly<
  Record<'timestamp' | 'date', { expression: 'now()' | 'CURRENT_DATE'; spellings: string[] }>
> = {
  timestamp: { expression: 'now()', spellings: ['now', 'now()', 'current_timestamp'] },
  date: { expression: 'CURRENT_DATE', spellings: ['today', 'now', 'now()', 'current_date'] },
};

const isTimeType = (type: SpecFieldType): type is keyof typeof NOW_DEFAULTS => type in NOW_DEFAULTS;

/** Whether a default spells "now" for some column type, so it isn't a literal value. */
export const isNowSpelling = (value: unknown): value is string =>
  typeof value === 'string' &&
  Object.values(NOW_DEFAULTS).some(({ spellings }) => spellings.includes(value.toLowerCase()));

/** The expression a "now" default becomes for this column type, or null when it isn't one. */
export function nowDefault(type: SpecFieldType, value: unknown): 'now()' | 'CURRENT_DATE' | null {
  if (!isTimeType(type) || typeof value !== 'string') return null;
  const { expression, spellings } = NOW_DEFAULTS[type];
  return spellings.includes(value.toLowerCase()) ? expression : null;
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

/** The closest known name, when one is close enough to be a typo or a doubled word. */
export function closestName(name: string, known: Iterable<string>): string | null {
  let best: { name: string; score: number } | null = null;
  for (const candidate of known) {
    const score =
      name.includes(candidate) || candidate.includes(name) ? 0.5 : distance(name, candidate);
    if (score <= Math.max(2, Math.floor(name.length / 3)) && (!best || score < best.score)) {
      best = { name: candidate, score };
    }
  }
  return best?.name ?? null;
}
