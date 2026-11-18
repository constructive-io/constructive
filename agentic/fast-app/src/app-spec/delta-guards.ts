// Where the planner stops at what app-spec.json only shows: a column the spec
// can't describe, a table under custom policies, and a curated table deleted
// outside the app. Each guard refuses the change and says why; without
// `options.protect` none of them ever fires.

import { refuse, type Run } from './delta-run';
import { sqlAddedText } from './delta-skew';
import type { ModelTable } from './spec-model';

/**
 * Refuses a spec that declares a column the view left out; true when it did.
 * One added with SQL the spec can only leave as it is: that's a warning.
 */
export function guardProtected(run: Run, table: string, column: string, path: string): boolean {
  if (run.options.skew?.metaOnly.get(table)?.has(column)) {
    run.delta.warnings.push(sqlAddedText(table, column));
    return true;
  }
  const reason = run.options.protect?.columns.get(table)?.get(column);
  if (reason === undefined) return false;
  refuse(
    run,
    path,
    `${table}.${column} is a column app-spec.json can't describe (${reason}), and plan_app keeps it as it is. Use another name, or ask the user before changing it with the schema tools.`,
  );
  return true;
}

/** Refuses a change of who sees the rows of a table under custom policies; true when it did. */
export function guardAccess(run: Run, table: string, path: string): boolean {
  if (!run.options.protect?.access.has(table)) return false;
  refuse(
    run,
    path,
    `${table} has policies app-spec.json can't describe, so plan_app can't change who sees its rows. Leave access out for it.`,
  );
  return true;
}

/**
 * Refuses additions to a curated table deleted outside the app, and keys or
 * links that point at one. True when the table is such a table: there's
 * nothing of it to compare.
 */
export function guardCuratedGone(run: Run, table: ModelTable): boolean {
  const gone = run.options.protect?.curatedGone;
  if (!gone?.size) return false;
  const text = (name: string) =>
    `${name}, a table of the ${run.after.blueprint?.slug} blueprint, was deleted outside the app; plan_app can't add to it or recreate it.`;
  if (table.origin === 'blueprint' && gone.has(table.name)) {
    if (table.fields.size || table.keys.size) refuse(run, table.path, text(table.name));
    return true;
  }
  for (const { key, path } of table.keys.values()) {
    if (gone.has(key.to)) refuse(run, path, text(key.to));
  }
  return false;
}

/** The columns of a table the view leaves out, which deleting the table loses too. */
export const protectedColumns = (run: Run, table: string): string[] => [
  ...(run.options.protect?.columns.get(table)?.keys() ?? []),
];
