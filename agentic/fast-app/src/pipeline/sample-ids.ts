// The rows verify opens the detail pages on: the first row of each screen's
// table, read as the owner when verify starts. A row the database has now
// opens whoever added it, so an adopted app, or one whose sample rows were
// deleted outside it, opens a real row too. One request asks for them all:
// an aliased `first: 1` per table.

import {
  createGraphqlExecute,
  type LiveMetaTable,
} from '../extensions/db-tools/live-meta';
import { MetaIndex, normalizeKey } from '../extensions/db-tools/live-meta-index';
import type { GenResource } from './gen';
import type { SeededIds } from './seed';

/** One aliased list query: the table it reads, by normalized key, and its primary key. */
export type SampleQuery = { alias: string; key: string; pk: string };

/** The query for one row of each resource's table; null when no table can be listed. */
export function sampleDocument(
  resources: readonly Pick<GenResource, 'table'>[],
  tables: readonly LiveMetaTable[],
): { document: string; asked: SampleQuery[] } | null {
  const index = new MetaIndex(tables);
  const asked: SampleQuery[] = [];
  const selections: string[] = [];
  for (const resource of resources) {
    const table = index.find(resource.table);
    const all = table?.query?.all;
    const pk = table ? index.primaryKeyOf(table) : null;
    const key = table ? normalizeKey(table.name) : '';
    if (!all || !pk || asked.some((q) => q.key === key)) continue;
    const alias = `s${asked.length}`;
    asked.push({ alias, key, pk });
    selections.push(`${alias}: ${all}(first: 1) { nodes { ${pk} } }`);
  }
  return asked.length ? { document: `query SampleIds { ${selections.join(' ')} }`, asked } : null;
}

/** Each table's first row id, by normalized key, as `sampleIdsFor` reads them; an empty or rejected table has none. */
export function parseSampleIds(data: unknown, asked: readonly SampleQuery[]): SeededIds {
  const answer = (data ?? {}) as Record<
    string,
    { nodes?: Array<Record<string, unknown> | null> } | null | undefined
  >;
  const ids: SeededIds = {};
  for (const { alias, key, pk } of asked) {
    const id = answer[alias]?.nodes?.[0]?.[pk];
    if (typeof id === 'string' || typeof id === 'number') ids[key] = [String(id)];
  }
  return ids;
}

/** One row id per resource's table, read live as the owner. */
export async function fetchSampleIds(
  resources: readonly Pick<GenResource, 'table'>[],
  tables: readonly LiveMetaTable[],
  session: { endpoint: string; token: string },
): Promise<SeededIds> {
  const query = sampleDocument(resources, tables);
  if (!query) return {};
  const result = await createGraphqlExecute(session.endpoint, session.token)(query.document);
  return parseSampleIds(result.data, query.asked);
}
