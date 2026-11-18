// What list_blueprints tells the agent about a curated blueprint: enough to
// write an AppSpec that names it (seed rows, ui hints) without reading
// anything else. The tables come from the curated reader.

import {
  blueprintEntries,
  type CuratedBlueprint,
  curatedTables,
  SET_FOR_YOU,
} from '../blueprints/curated';

/** A curated blueprint as list_blueprints reads it. */
export type BlueprintJson = CuratedBlueprint;

function firstSentence(text: string | undefined): string {
  if (!text) return '';
  // A sentence ends at a period before a capital letter, so "e.g. an" stays.
  const end = text.search(/\.(\s+[A-Z(]|$)/);
  return end === -1 ? text : text.slice(0, end + 1);
}

/** One blueprint for list_blueprints: what it is, then each table with its columns. */
export function describeBlueprint(bp: CuratedBlueprint): string {
  const entityTypes = [...curatedTables(bp).values()].filter((table) => table.entityType);
  const notes = [bp.storage?.length ? 'uses file storage' : ''].filter(Boolean);
  const head = `## ${bp.name}: ${bp.display_name}. ${firstSentence(bp.description)}${notes.length ? ` [${notes.join('; ')}]` : ''}`;
  const tables = blueprintEntries(bp).map((entry) => {
    if (entry.kind === 'module') {
      const where = Object.values(entry.module).join(' ');
      return `- (${where}: module-managed tables; no screens or sample rows in the AppSpec)`;
    }
    const { table } = entry;
    const about = firstSentence(table.description);
    const fill = table.fill.map((c) => c.text).join(', ') || '(no columns to fill)';
    return `- ${table.name}${about ? `: ${about}` : ''}\n  ${fill}`;
  });
  const managed = entityTypes.map(
    ({ name }) =>
      `- ${name}: reference this entity table from extension tables. plan_app doesn't seed it: after the build, add sample rows with add_records, which fills their owner, then any rows that reference them. Its storage files, buckets, events, path shares and search chunks have no AppSpec screens or sample rows.`,
  );
  return [head, ...managed, ...tables].join('\n');
}

export const BLUEPRINT_LEGEND = `Each table lists the columns a seed row or a form fills: * is required, → is a key that takes a reference like "@<table>[0]", and "one of" lists the allowed values. Leave out ${SET_FOR_YOU.join(', ')} and any column a parent row fills: the database and the desktop set them. A field you add can't be named like a key without its "_id" ("owner", "entity", "company" beside company_id): the database counts those as the same name.`;
