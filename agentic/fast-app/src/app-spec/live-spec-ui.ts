// The overlay's UI hints as the spec's `ui`, by the names tables and columns
// have now. A hint on a table or column that's gone falls away; a dashboard
// tile whose table or filter column is gone goes with it.

import { normalizeKey } from './contract/app-spec.types';
import { type LiveModel, type LiveTable, namedTables, tableWithId } from './live-model';
import { type IntentOverlay, type TableIntent, unresolvedName } from './overlay';
import type { AppSpec, DashboardTileSpec, FieldUiSpec, ResourceUiSpec } from './types';

type Ui = NonNullable<AppSpec['ui']>;

const tableName = (model: LiveModel, ref: string) =>
  unresolvedName(ref) ?? tableWithId(model, ref)?.name ?? null;

const fieldName = (table: LiveTable, ref: string) =>
  unresolvedName(ref) ?? table.columns.find((c) => c.id === ref)?.name ?? null;

function names(resolve: (ref: string) => string | null, refs: string[] | undefined) {
  return [...new Set((refs ?? []).map(resolve).filter((n): n is string => n !== null))];
}

function resourceUi(
  intent: TableIntent | undefined,
  resolve: (ref: string) => string | null,
): ResourceUiSpec | null {
  if (!intent) return null;
  const { titleField, columns, formFields, ...rest } = intent.ui ?? {};
  const out: ResourceUiSpec = { ...rest };
  const title = titleField ? resolve(titleField) : null;
  if (title) out.titleField = title;
  const listed = names(resolve, columns);
  if (listed.length) out.columns = listed;
  const form = names(resolve, formFields);
  if (form.length) out.formFields = form;
  const fields: Record<string, FieldUiSpec> = {};
  for (const [ref, { ui }] of Object.entries(intent.fields)) {
    const name = ui && resolve(ref);
    if (name) fields[name] = ui;
  }
  if (Object.keys(fields).length) out.fields = fields;
  return Object.keys(out).length ? out : null;
}

export function uiOf(
  model: LiveModel,
  overlay: IntentOverlay | null,
  excludedTables: Iterable<string>,
): Ui | undefined {
  if (!overlay) return undefined;
  const excluded = new Set([...excludedTables].map(normalizeKey));
  const hasPage = (name: string) => !excluded.has(normalizeKey(name));
  const ui: Ui = {};
  const nav = names((ref) => tableName(model, ref), overlay.nav).filter(hasPage);
  if (nav.length) ui.nav = nav;
  const resources: Record<string, ResourceUiSpec> = {};
  for (const table of namedTables(model)) {
    if (!hasPage(table.name)) continue;
    const hints = resourceUi(overlay.tables[table.id], (ref) => fieldName(table, ref));
    if (hints) resources[table.name] = hints;
  }
  // A table only the API lists keeps its hints by name, as an older build kept an entity type's.
  for (const [ref, intent] of Object.entries(overlay.tables)) {
    const name = unresolvedName(ref);
    if (!name || !hasPage(name) || !model.metaTableNames.has(name)) continue;
    const hints = resourceUi(intent, unresolvedName);
    if (hints) resources[name] = hints;
  }
  if (Object.keys(resources).length) ui.resources = resources;
  const tiles = (overlay.dashboard ?? []).flatMap((tile): DashboardTileSpec[] => {
    const resource = tableName(model, tile.table);
    const table = tableWithId(model, tile.table);
    if (!resource || !hasPage(resource)) return [];
    const label = tile.label ? { label: tile.label } : {};
    if (tile.kind === 'recent')
      return [{ kind: 'recent', resource, ...label, ...(tile.limit && { limit: tile.limit }) }];
    const filters = Object.entries(tile.filters ?? {}).map(
      ([ref, value]) => [table ? fieldName(table, ref) : unresolvedName(ref), value] as const,
    );
    if (filters.some(([name]) => !name)) return [];
    return [
      {
        kind: 'count',
        resource,
        ...label,
        ...(filters.length && { filters: Object.fromEntries(filters) }),
      },
    ];
  });
  if (overlay.dashboard && tiles.length) ui.dashboard = { tiles };
  if (overlay.workspace) ui.workspace = { scope: overlay.workspace.scope };
  if (overlay.access?.length) ui.access = [...overlay.access];
  return Object.keys(ui).length ? ui : undefined;
}
