// verify_app: the app type-checks, every page returns 200 from the managed dev
// server, and every table survives create → get → update → delete through the
// generated ORM as the owner (verify-crud.ts). The three checks run in parallel.
// What a pass left unchecked comes back as its gaps (verify-gaps.ts).

import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

import type { LiveMetaTable } from '../extensions/db-tools/live-meta';
import type { FieldRules } from '../extensions/db-tools/live-meta-index';
import { normalizeKey } from '../extensions/db-tools/live-meta-index';
import type { RenderCheckSummary, VerifyGaps } from './app-plan';
import { outputTail, runCommand } from './command';
import type { GenResource } from './gen';
import {
  type AppRoute,
  recordScreensOf,
  routesFromPageFiles,
  sampleIdsFor,
  sampleParam,
} from './routes';
import type { SeededIds } from './seed';
import { checkCrud, type CrudCheck, type HeldRow } from './verify-crud';
import { classified, type VerifyFault } from './verify-fault';
import { gapsOf } from './verify-gaps';

const TYPES_TIMEOUT_MS = 180_000;
const ROUTE_TIMEOUT_MS = 120_000;
const MAX_TYPE_ERRORS = 20;

export type VerifyFailure = {
  check: 'types' | 'route' | 'render' | 'crud' | 'setup';
  message: string;
  /** Whose fault it is when not the app's (verify-fault.ts); set where the failure is made. */
  fault?: VerifyFault;
  file?: string;
  route?: string;
  resource?: string;
  op?: 'create' | 'get' | 'update' | 'delete';
};

const renderFailure = (f: { route: string; message: string }): VerifyFailure =>
  classified({ check: 'render', route: f.route, message: f.message });

export type VerifyResult = {
  ok: boolean;
  failures: VerifyFailure[];
  routes: string[];
  /** The pages the render check opened, in order. */
  opened?: string[];
  crud: { tested: string[]; skipped: Array<{ table: string; reason: string }> };
  render: RenderCheckSummary;
  gaps: VerifyGaps;
};

export type CrudOwner = { endpoint: string; token: string; userId: string };

const NO_CRUD: CrudCheck = { failures: [], tested: [], skipped: [], readOnly: [], leftover: [] };

export type VerifyInput = {
  appDir: string;
  devUrl: string;
  tables: readonly LiveMetaTable[];
  /** The app plane endpoint (api-<db>) and the owner's session on it; without one, no CRUD smoke runs. */
  owner: CrudOwner | null;
  /** Route segment → a row id, for detail pages (`sampleIdsFor`). */
  sampleIds: Record<string, string>;
  /** The generated screens, to open the record pages of empty tables on the CRUD check's test rows. */
  resources?: readonly GenResource[];
  /** Routes not to check, with every route under them: the screens of tables that are gone. */
  skipRoutes?: readonly string[];
  /** Limit the CRUD smoke to these tables (the generated resources); all tables without. */
  tablesUnderTest?: readonly string[];
  /** Starts a fresh dev server and returns its URL (see checkRoutes). */
  restartDev: () => Promise<string>;
  /** Opens pages as the owner and reports data errors (see render-check.ts). */
  renderCheck: (
    devUrl: string,
    routes: readonly string[],
  ) => Promise<
    RenderCheckSummary & { failures: Array<{ route: string; message: string }>; opened?: string[] }
  >;
  /** Field hints the CRUD smoke honors (see field-hints.ts). */
  rules: FieldRules;
  /** The SQL names of the entity types' tables, which the CRUD smoke only reads (entity-tables.ts). */
  entityTables?: readonly string[];
  signal?: AbortSignal;
};

const TSC_ERROR = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

export function parseTypeErrors(output: string): VerifyFailure[] {
  const failures: VerifyFailure[] = [];
  for (const line of output.split('\n')) {
    const match = line.trim().match(TSC_ERROR);
    if (!match) continue;
    const [, file, row, col, code, message] = match;
    failures.push({
      check: 'types',
      file: `${file}:${row}:${col}`,
      message: `${code}: ${message}`,
    });
  }
  return failures;
}

async function checkTypes(input: VerifyInput): Promise<VerifyFailure[]> {
  const result = await runCommand('pnpm', ['--silent', 'lint:types'], {
    cwd: input.appDir,
    signal: input.signal,
    timeoutMs: TYPES_TIMEOUT_MS,
  });
  if (result.ok) return [];
  const errors = parseTypeErrors(result.output);
  if (!errors.length) {
    return [{ check: 'types', message: `lint:types failed:\n${outputTail(result.output, 15)}` }];
  }
  const shown = errors.slice(0, MAX_TYPE_ERRORS);
  if (errors.length > shown.length) {
    shown.push({
      check: 'types',
      message: `…and ${errors.length - shown.length} more type errors`,
    });
  }
  return shown;
}

export async function listPageFiles(appDir: string, rel = 'src/app'): Promise<string[]> {
  const entries = await readdir(path.join(appDir, rel), { withFileTypes: true }).catch((): Dirent[] => []);
  const files: string[] = [];
  for (const entry of entries) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await listPageFiles(appDir, child)));
    else files.push(child);
  }
  return files;
}

// A dev server can miss route folders written while it ran and answer 404
// for them until it restarts; one restart and a recheck of those routes tells
// that apart from a page that really isn't there.
// `settle` gets the dev server the checks go on with, as soon as the route
// check has decided (restarted or not), and also when it fails.
async function checkRoutes(
  input: VerifyInput,
  routes: string[],
  renderRoutes: string[],
  settle: (url: string) => void,
): Promise<{ failures: VerifyFailure[]; render: RenderCheckSummary; opened: string[] }> {
  let url = input.devUrl;
  let failures: VerifyFailure[];
  try {
    failures = await fetchRoutes(input, url, routes);
    const missing = failures.filter((f) => f.message.startsWith('HTTP 404'));
    if (missing.length) {
      url = await input.restartDev();
      const again = await fetchRoutes(
        input,
        url,
        missing.map((f) => f.route as string),
      );
      failures = [...failures.filter((f) => !missing.includes(f)), ...again];
    }
  } finally {
    settle(url);
  }
  // Pages that answered are compiled now; open them and watch their data.
  const broken = new Set(failures.map((f) => f.route));
  const rendered = await input.renderCheck(
    url,
    renderRoutes.filter((r) => !broken.has(r)),
  );
  return {
    failures: [...failures, ...rendered.failures.map(renderFailure)],
    render: {
      pages: rendered.pages,
      ...(rendered.skipped ? { skipped: rendered.skipped } : {}),
    },
    opened: rendered.opened ?? [],
  };
}

async function fetchRoutes(
  input: VerifyInput,
  devUrl: string,
  routes: string[],
): Promise<VerifyFailure[]> {
  const results = await Promise.all(
    routes.map(async (route): Promise<VerifyFailure | null> => {
      const signal = AbortSignal.any([
        AbortSignal.timeout(ROUTE_TIMEOUT_MS),
        ...(input.signal ? [input.signal] : []),
      ]);
      try {
        const response = await fetch(new URL(route, devUrl), { signal });
        if (response.status === 200) return null;
        const body = await response.text().catch(() => '');
        return {
          check: 'route',
          route,
          message: `HTTP ${response.status}${body ? `: ${firstErrorLine(body)}` : ''}`,
        };
      } catch (err) {
        return { check: 'route', route, message: (err as Error).message };
      }
    }),
  );
  return results.filter((f): f is VerifyFailure => f !== null);
}

// A Next.js error page carries the error in its HTML; the first line that
// reads like one is enough for the model to find it.
function firstErrorLine(body: string): string {
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const match = text.match(/(?:Error|error)[:\s][^.]{0,240}/);
  return (match?.[0] ?? text.slice(0, 240)).trim();
}

export function onlyNextTypes(failures: readonly VerifyFailure[]): boolean {
  const located = failures.filter((f) => f.file);
  return located.length > 0 && located.every((f) => f.file?.startsWith('.next/'));
}

/**
 * One record page per screen, the shortest one, opened on the row the route
 * check uses: `open` holds their paths, `noRow` the screens whose table has
 * no row to open.
 */
export function detailPages(
  routes: readonly AppRoute[],
  sampleIds: Readonly<Record<string, string>>,
): { open: string[]; noRow: string[] } {
  const shortest = new Map<string, AppRoute>();
  for (const route of routes) {
    const screen = route.record;
    if (!screen) continue;
    const known = shortest.get(screen);
    if (!known || route.file.length < known.file.length) shortest.set(screen, route);
  }
  const open: string[] = [];
  const noRow: string[] = [];
  for (const [screen, route] of shortest) {
    if (sampleIds[screen]) open.push(route.path);
    else noRow.push(screen);
  }
  return { open, noRow };
}

export async function verifyApp(input: VerifyInput): Promise<VerifyResult> {
  const pages = await listPageFiles(input.appDir);
  const skip = input.skipRoutes ?? [];
  const recordScreens = recordScreensOf(input.resources);
  const pageRoutes = routesFromPageFiles(
    pages,
    sampleParam(input.sampleIds),
    undefined,
    recordScreens,
  ).filter((r) => !skip.some((route) => r.path === route || r.path.startsWith(`${route}/`)));
  const routes = pageRoutes.map((r) => r.path);
  // The signed-in pages: the ones that load lists and reports, and one detail
  // page per screen. Sign-in pages are left to the route check.
  const signedIn = pageRoutes.filter((r) => !r.file.includes('/(auth)/'));
  const detail = detailPages(
    signedIn.filter((r) => r.record),
    input.sampleIds,
  );
  const renderRoutes = [...signedIn.filter((r) => !r.record).map((r) => r.path), ...detail.open];

  // The route check may restart the dev server; the pages on the CRUD check's
  // rows wait for its answer, so they never load on a server that is going away.
  const settled = Promise.withResolvers<string>();
  const onRows = emptyTablePages(input, pages, detail.noRow, settled.promise);
  const [firstTypes, routeCheck, crud] = await Promise.all([
    checkTypes(input),
    checkRoutes(input, routes, renderRoutes, settled.resolve),
    input.owner ? checkCrud(input, input.owner, onRows.open) : NO_CRUD,
  ]);
  // Next writes its route types under .next/ while a fresh dev server compiles
  // its first pages, so a check that raced it fails there and nowhere else.
  // The pages have compiled once the route checks end; check again then.
  const types = onlyNextTypes(firstTypes) ? await checkTypes(input) : firstTypes;
  const failures = [...types, ...routeCheck.failures, ...onRows.failures, ...crud.failures];
  // Every page opened counts, also those on test rows after a main check that couldn't run.
  const render = { ...routeCheck.render, pages: routeCheck.render.pages + onRows.opened.length };
  return {
    ok: failures.length === 0,
    failures,
    routes,
    opened: [...routeCheck.opened, ...onRows.opened],
    crud: { tested: crud.tested, skipped: crud.skipped },
    render,
    gaps: gapsOf({
      render: routeCheck.render,
      detail: {
        open: detail.open,
        noRow: detail.noRow.filter((screen) => !onRows.screens.includes(screen)),
        onTestRows: onRows.screens.length,
      },
      crud,
      why: { ...skipReasons(input, crud.skipped), ...onRows.skipped },
    }),
  };
}

/**
 * The record pages of screens whose table is empty, opened on the rows the
 * CRUD check creates there while it holds them. `open` is the hold callback;
 * the other fields fill in as it runs, and stay empty when it never does.
 */
function emptyTablePages(
  input: VerifyInput,
  pageFiles: readonly string[],
  noRow: readonly string[],
  devUrl: Promise<string>,
) {
  const state = {
    open: undefined as ((rows: HeldRow[]) => Promise<void>) | undefined,
    screens: [] as string[],
    opened: [] as string[],
    failures: [] as VerifyFailure[],
    /** Screen → why its page on a test row wasn't opened, when the check on them couldn't run. */
    skipped: {} as Record<string, string>,
  };
  const { resources } = input;
  if (!resources?.length || !noRow.length) return state;
  state.open = async (rows) => {
    const seeded: SeededIds = {};
    for (const row of rows) seeded[normalizeKey(row.table)] = [row.id];
    const ids = sampleIdsFor(resources, input.tables, seeded);
    const held = Object.fromEntries(
      noRow.flatMap((screen) => (ids[screen] ? [[screen, ids[screen]]] : [])),
    );
    if (!Object.keys(held).length) return;
    const skip = input.skipRoutes ?? [];
    const routes = routesFromPageFiles(
      pageFiles,
      sampleParam(held),
      undefined,
      recordScreensOf(resources),
    ).filter(
      (r) =>
        r.record &&
        !r.file.includes('/(auth)/') &&
        !skip.some((route) => r.path === route || r.path.startsWith(`${route}/`)),
    );
    const { open } = detailPages(routes, held);
    const rendered = await input.renderCheck(await devUrl, open);
    if (rendered.skipped) {
      for (const screen of Object.keys(held)) {
        state.skipped[screen] = `its page on a test row wasn't opened: ${rendered.skipped}`;
      }
      return;
    }
    state.opened = rendered.opened ?? open;
    state.screens = Object.keys(held);
    state.failures = rendered.failures.map(renderFailure);
  };
  return state;
}

/** Why the CRUD check made no row in a screen's table, by screen, from its skip list. */
function skipReasons(
  input: VerifyInput,
  skipped: readonly { table: string; reason: string }[],
): Record<string, string> {
  const why: Record<string, string> = {};
  if (!input.resources?.length || !skipped.length) return why;
  for (const { table, reason } of skipped) {
    const seeded: SeededIds = { [normalizeKey(table)]: ['skipped'] };
    for (const screen of Object.keys(sampleIdsFor(input.resources, input.tables, seeded))) {
      why[screen] ??= reason;
    }
  }
  return why;
}

export function formatVerifyFailures(failures: readonly VerifyFailure[]): string {
  return failures
    .map((f) => {
      const where =
        f.file ?? f.route ?? (f.resource ? `${f.resource}${f.op ? ` ${f.op}` : ''}` : '');
      return `- [${f.check}]${where ? ` ${where}` : ''}: ${f.message}`;
    })
    .join('\n');
}
