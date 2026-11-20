// Which seed tables already have rows. A build whose record knows of no
// sample row in a table (an app adopted from its database, or a table the
// builds never seeded) inserts its sample rows there only while the table is
// empty, so it never mixes them into rows that people added. One request
// counts them all as the owner: an aliased `totalCount` per table.

import {
  createGraphqlExecute,
  type LiveMetaTable,
} from '../extensions/db-tools/live-meta';
import { MetaIndex } from '../extensions/db-tools/live-meta-index';

/** One aliased `totalCount` per list query of `_meta` (`query.all`), `c<i>` in order. */
export function countDocument(queries: readonly string[]): string {
  return `query SeedCounts { ${queries.map((all, i) => `c${i}: ${all} { totalCount }`).join(' ')} }`;
}

/** The counts in countDocument's order; null where the answer has none (a rejected alias). */
export function parseCounts(data: unknown, size: number): Array<number | null> {
  const answer = (data ?? {}) as Record<string, { totalCount?: unknown } | null | undefined>;
  return Array.from({ length: size }, (_, i) => {
    const count = answer[`c${i}`]?.totalCount;
    return typeof count === 'number' ? count : null;
  });
}

/** Rows per table, by the name the spec gives it; null for a table that couldn't be counted. */
export async function countRows(
  tables: readonly string[],
  meta: readonly LiveMetaTable[],
  session: { endpoint: string; token: string },
): Promise<Map<string, number | null>> {
  const index = new MetaIndex(meta);
  const queries = tables.map((table) => index.find(table)?.query?.all ?? null);
  const asked = tables.filter((_, i) => queries[i]);
  const counts = new Map<string, number | null>(tables.map((table): [string, number | null] => [table, null]));
  if (!asked.length) return counts;
  const execute = createGraphqlExecute(session.endpoint, session.token);
  const result = await execute(countDocument(queries.filter((q): q is string => Boolean(q))));
  parseCounts(result.data, asked.length).forEach((count, i) => counts.set(asked[i], count));
  return counts;
}
