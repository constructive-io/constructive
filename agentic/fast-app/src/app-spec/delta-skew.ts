// Raw SQL changes the database and not the platform's schema records
// (metaschema), which the schema tools read and change. In a table both list,
// a column only `_meta` has was added with SQL (live-model.ts). A call on it
// fails in the database, so the plan skips it and says why, and the rest of
// the build goes on. A column only metaschema has counts as there: the API is
// most likely behind, and if SQL did drop it, the call fails with the
// database's own error.
//
// Pure, and it imports only by relative path, so the pnpm test runner loads it.

import type { AppSpecDelta, DeltaCall, DestructiveChange } from './delta-types';
import type { SchemaSkew } from './live-model';

export const sqlAddedText = (table: string, column: string) =>
  `${table}.${column} is in the database but not in the platform's schema records (changed with SQL); plan_app left it as it is.`;

type Target = { table: string; column: string };

// The columns a call reads or makes; a status node names its column.
function targetsOf(call: DeltaCall): Target[] {
  switch (call.tool) {
  case 'create_field':
  case 'delete_field':
    return [{ table: call.params.table_name, column: call.params.field_name }];
  case 'update_field': {
    const { table_name: table, field_name: column, new_name: renamed } = call.params;
    return [{ table, column }, ...(renamed ? [{ table, column: renamed }] : [])];
  }
  case 'secure_table_provision':
    return (call.params.nodes ?? []).flatMap((node) => {
      const column = typeof node === 'object' ? node.data?.field_name : undefined;
      return typeof column === 'string' ? [{ table: call.params.table_name, column }] : [];
    });
  default:
    return [];
  }
}

/**
 * The delta without the calls and keys on a column changed with SQL, each
 * named in `warnings`, and without the card lines of what they would have added.
 */
export function applySkew(delta: AppSpecDelta, skew: SchemaSkew): AppSpecDelta {
  const warnings = [...delta.warnings];
  const skipped = new Set<string>();
  // Whether a call on `targets` can run; when it can't, says why once.
  const runs = (targets: Target[]): boolean => {
    const added = targets.find((t) => skew.metaOnly.get(t.table)?.has(t.column));
    if (!added) return true;
    for (const t of targets) skipped.add(`${t.table}.${t.column}`);
    const text = sqlAddedText(added.table, added.column);
    if (!warnings.includes(text)) warnings.push(text);
    return false;
  };

  const calls = delta.calls.flatMap((call): DeltaCall[] => {
    if (call.tool !== 'provision_blueprint') return runs(targetsOf(call)) ? [call] : [];
    const { tables, relations = [] } = call.params.definition;
    const kept = relations.filter((r) => runs([{ table: r.source_table, column: r.field_name }]));
    if (kept.length === relations.length) return [call];
    if (!tables.length && !kept.length) return [];
    const definition = { ...call.params.definition, relations: kept };
    if (!kept.length) delete definition.relations;
    return [{ ...call, params: { ...call.params, definition } }];
  });

  const destructive = delta.destructive.flatMap((change): DestructiveChange[] => {
    if (!runs(targetsOf(change.call))) return [];
    const { fallback } = change;
    if (fallback && !runs(targetsOf(fallback))) {
      return [{ ...change, fallback: undefined }];
    }
    return [change];
  });

  // An addition's id is `<kind>:<table>.<column>` for a column it adds or changes.
  const additions = delta.additions.filter((a) => !skipped.has(a.id.slice(a.id.indexOf(':') + 1)));
  return {
    ...delta,
    additions,
    calls,
    destructive,
    warnings,
    uiOnly: !additions.length && !destructive.length && delta.seed.rows === 0,
  };
}
