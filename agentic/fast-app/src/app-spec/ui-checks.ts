// The spec's `ui`, checked against the tables a page can show. A link's table
// gets no page: the screen generator leaves junctions out and shows a link as
// chips on both records. So a sidebar row, a dashboard tile or page settings
// that name one would promise a page the app won't have.

import { normalizeKey } from './contract/app-spec.types';
import { singular } from './names';
import type { ModelTable, SpecModel } from './spec-model';
import type { AppSpec, AppSpecError } from './types';

// The generator finds a table under any spelling of its name, its route or
// its singular (`volunteer-shifts`, `volunteer_shift`), so a link is found
// the same way.
function linkNamed(model: SpecModel, name: string): ModelTable | undefined {
  const key = normalizeKey(name);
  const tables = [...model.tables.values()];
  const table =
    model.tables.get(name) ??
    tables.find((t) => normalizeKey(t.name) === key) ??
    tables.find((t) => normalizeKey(singular(t.name)) === key);
  return table?.origin === 'link' ? table : undefined;
}

const sides = (table: ModelTable) => table.link?.between ?? [];

const noPage = (table: ModelTable, then: string) =>
  `"${table.name}" is the link between ${sides(table).join(' and ')}; a link shows as chips on both records and gets no page, so ${then}`;

export function checkUi(model: SpecModel, spec: AppSpec, errors: AppSpecError[]) {
  (spec.ui?.nav ?? []).forEach((name, i) => {
    const table = linkNamed(model, name);
    if (table)
      errors.push({ path: `ui.nav[${i}]`, message: noPage(table, 'leave it out of the sidebar') });
  });
  for (const name of Object.keys(spec.ui?.resources ?? {})) {
    const table = linkNamed(model, name);
    if (table)
      errors.push({
        path: `ui.resources.${name}`,
        message: noPage(table, 'it takes no page settings; remove this entry'),
      });
  }
  (spec.ui?.dashboard?.tiles ?? []).forEach((tile, i) => {
    const table = linkNamed(model, tile.resource);
    if (table)
      errors.push({
        path: `ui.dashboard.tiles[${i}].resource`,
        message: noPage(
          table,
          `no tile can show it; point the tile at ${sides(table).join(' or ')}`,
        ),
      });
  });
}

type Ui = NonNullable<AppSpec['ui']>;

/** `ui` without the entries checkUi refuses, for the view the desktop writes itself. */
export function withoutLinkPages(model: SpecModel, ui: Ui | undefined): Ui | undefined {
  if (!ui) return undefined;
  const page = (name: string) => !linkNamed(model, name);
  const nav = ui.nav?.filter(page);
  const resources = Object.entries(ui.resources ?? {}).filter(([name]) => page(name));
  const tiles = ui.dashboard?.tiles.filter((tile) => page(tile.resource));
  const out: Ui = {
    ...(nav?.length && { nav }),
    ...(resources.length && { resources: Object.fromEntries(resources) }),
    ...(tiles?.length && { dashboard: { tiles } }),
    // Scope screens name membership scopes, never a table, so no link touches them.
    ...(ui.workspace && { workspace: ui.workspace }),
    ...(ui.access?.length && { access: ui.access }),
  };
  return Object.keys(out).length ? out : undefined;
}
