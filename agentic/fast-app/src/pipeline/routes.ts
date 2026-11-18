// The routes an App Router app serves, read from its page files, so
// verify_app checks every page the template and the generator wrote without
// knowing either one's layout.

import type { LiveMetaTable } from '../extensions/db-tools/live-meta';
import {
  MetaIndex,
  normalizeKey,
  tableKeys,
} from '../extensions/db-tools/live-meta-index';
import type { GenResource } from './gen';
import type { SeededIds } from './seed';

/** What a detail route opens when its resource has no seeded row. */
export const NIL_ID = '00000000-0000-0000-0000-000000000000';

export type AppRoute = {
  /** The URL path to fetch. */
  path: string;
  /** The page file it came from, relative to the app. */
  file: string;
  /** The screen whose record the page opens, when it is a record page. */
  record?: string;
};

/**
 * The last segment of a static export's record page, `<screen>/view/`, which
 * reads the record's id from `?id=` because a static export has no dynamic
 * routes. Apps generated before the static export use `<screen>/[id]/`.
 */
export const RECORD_VIEW_SEGMENT = 'view';

const PAGE_FILE = /(?:^|\/)page\.(?:tsx|ts|jsx|js|mdx)$/;

// `(group)` segments don't appear in the URL; `@slot` and `_private` folders
// aren't routes; a catch-all can't be fetched without knowing its shape. A
// record page is a `[param]` under a screen, or `view` under one of
// `recordScreens`, which gets the screen's sample id as `?id=`.
export function routesFromPageFiles(
  files: readonly string[],
  sampleParam: (segments: readonly string[], param: string) => string,
  appDir = 'src/app',
  recordScreens: ReadonlySet<string> = new Set(),
): AppRoute[] {
  const routes: AppRoute[] = [];
  const prefix = `${appDir.replace(/\/$/, '')}/`;
  for (const file of files) {
    const normalized = file.replace(/\\/g, '/');
    if (!normalized.startsWith(prefix) || !PAGE_FILE.test(normalized)) continue;
    const segments = normalized.slice(prefix.length).split('/').slice(0, -1);
    if (
      segments.some(
        (s) =>
          s.startsWith('@') || s.startsWith('_') || s.startsWith('[...') || s.startsWith('[[...'),
      )
    ) {
      continue;
    }
    const urlSegments: string[] = [];
    let record: string | undefined;
    for (const segment of segments) {
      if (/^\(.*\)$/.test(segment)) continue;
      const param = segment.match(/^\[(.+)\]$/);
      if (param) record ??= urlSegments.at(-1);
      urlSegments.push(param ? sampleParam(urlSegments, param[1]) : segment);
    }
    let path = `/${urlSegments.join('/')}`;
    const screen = urlSegments.at(-2);
    if (
      !record &&
      urlSegments.at(-1) === RECORD_VIEW_SEGMENT &&
      screen &&
      recordScreens.has(screen)
    ) {
      record = screen;
      path = `${path}/?id=${encodeURIComponent(sampleParam(urlSegments.slice(0, -1), 'id'))}`;
    }
    routes.push(record ? { path, file: normalized, record } : { path, file: normalized });
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * A seeded row's id per route segment, for the detail pages. A resource names
 * its table by the GraphQL type ("Shift") and the record by the spec's table
 * ("shifts"), so the lookup tries every name `_meta` gives the table.
 */
export function sampleIdsFor(
  resources: readonly GenResource[],
  tables: readonly LiveMetaTable[],
  seeded: Readonly<SeededIds>,
): Record<string, string> {
  const index = new MetaIndex(tables);
  const ids: Record<string, string> = {};
  for (const resource of resources) {
    const table = index.find(resource.table);
    const keys = table ? tableKeys(table) : [normalizeKey(resource.tableName ?? resource.table)];
    const id = keys
      .map((key) => seeded[key]?.find((row): row is string => Boolean(row)))
      .find(Boolean);
    // The route the generator wrote, which differs from the name for a reserved one.
    const segment = resource.route.split('/').filter(Boolean).at(-1) ?? resource.name;
    if (id) ids[segment] = id;
  }
  return ids;
}

/** The screens whose table `_meta` no longer has: deleted outside the app since gen made them. */
export function resourcesGone<R extends Pick<GenResource, 'table'>>(
  resources: readonly R[],
  tables: readonly LiveMetaTable[],
): R[] {
  const index = new MetaIndex(tables);
  return resources.filter((resource) => !index.find(resource.table));
}

/** The route segment of each generated screen, the ones whose `view` page is a record page. */
export function recordScreensOf(
  resources: readonly Pick<GenResource, 'route' | 'name'>[] | undefined,
): Set<string> {
  return new Set(
    (resources ?? []).map(
      (resource) => resource.route.split('/').filter(Boolean).at(-1) ?? resource.name,
    ),
  );
}

/** The id a detail route opens: the sample of the segment before its param. */
export const sampleParam =
  (ids: Readonly<Record<string, string>>) =>
    (segments: readonly string[]): string =>
      ids[segments[segments.length - 1] ?? ''] ?? NIL_ID;
