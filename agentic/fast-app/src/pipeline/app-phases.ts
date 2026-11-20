// App phases: generate the screens, start the managed dev server and point
// the Preview at it, and verify. Each runs in a BuildProgress phase, which
// gives its errors the phase's fix.

import path from 'node:path';

import type { LiveMetaTable } from '../extensions/db-tools/live-meta';
import type { FieldRules } from '../extensions/db-tools/live-meta-index';
import { startActivity } from './activity';
import type { RenderCheckSummary, VerifyGaps } from './app-plan';
import type { BuildRecord } from './build-record';
import { devScript } from './dev-process';
import { previewPortOf } from './dev-server-port';
import { entityTableNames } from './entity-tables';
import { type GenResource, type GenSummary, runGen, writeMeta } from './gen';
import { type FastAppServices, getFastAppHost, type OwnerSession } from './host';
import { errorMessage, PhaseError } from './progress';
import { BLOCKED_REQUEST_FIX, ENTITY_TYPES_FIX } from './result-text';
import { resourcesGone, sampleIdsFor } from './routes';
import type { RunContext } from './run-context';
import { fetchSampleIds } from './sample-ids';
import type { BuiltSchema } from './schema-phase';
import { appDirOf } from './snapshot-clone';
import { recordGenFiles, recordVerifyFacts } from './step-facts';
import { sleep } from './transient';
import { formatVerifyFailures, verifyApp, type VerifyResult } from './verify';
import { SPEC_FILE } from './view-file';

const DEV_LOG_LINES = 15;

/** The screens gen made, as the build record keeps them for verify. */
export type GenScreens = { resources: GenResource[]; junctions: string[] };

/** Generates every screen from the tables the API lists, and records them on the build. */
export async function genPhase(
  { cwd, signal }: Pick<RunContext, 'cwd' | 'signal'>,
  { tables, ledger }: Pick<BuiltSchema, 'tables' | 'ledger'>,
): Promise<{ summary: GenSummary; screens: GenScreens }> {
  const appDir = appDirOf(cwd);
  const skipped = await writeMeta(appDir, tables);
  const ran = await runGen(appDir, path.join(cwd, SPEC_FILE), signal);
  const summary = { ...ran, skippedTables: [...ran.skippedTables, ...skipped] };
  recordGenFiles(summary);
  const screens = {
    resources: summary.resources,
    junctions: summary.junctions.map((junction) => junction.table),
  };
  await ledger.update({ screens, steps: { gen: true } });
  return { summary, screens };
}

/** The port the project's Preview last used, which its next dev server keeps. */
export function savedPreviewPort(projectId: string | undefined): number | undefined {
  return previewPortOf(projectId ? getFastAppHost().projects.get(projectId) : undefined);
}

/** Saves where the app's dev server answers on the project, and tells the host's UI. */
async function recordDevServerUrl(projectId: string | undefined, url: string): Promise<void> {
  const { projects, events } = getFastAppHost();
  if (!projectId || !projects.saveDevServer || !projects.get(projectId)) return;
  const updated = await projects.saveDevServer(projectId, url);
  if (updated) events?.projectUpdated(updated);
}

// Starts the dev server while the backend phases run and compiles the app
// shell once, so the app phase only compiles the pages gen writes. Failures
// are left to the dev phase, which starts the server again and reports. It
// keeps the project's port: the database allows the Preview by its origin.
// The port is saved as soon as the server answers, because the first CORS
// write names the Preview by it: a server that stops before the dev phase
// (Next.js can stop on its first start) still leaves the port to that write
// and to the dev phase, which starts its server on it again.
export function prewarmDevServer({ cwd, services, projectId }: DevTarget): void {
  void (async () => {
    const preferredPort = savedPreviewPort(projectId);
    const { url } = await services.devServers.ensure(appDirOf(cwd), { preferredPort });
    await recordDevServerUrl(projectId, url);
    await Promise.all(
      ['/', '/sign-in'].map((route) => fetch(new URL(route, url)).then((r) => r.arrayBuffer())),
    );
  })().catch(() => {});
}

/** The app a dev server runs for: the project's folder, and the project whose Preview follows it. */
export type DevTarget = {
  cwd: string;
  services: Pick<FastAppServices, 'devServers'>;
  projectId: string | undefined;
  signal?: AbortSignal;
};

// The Preview follows the project's saved URL; the owner session reaches the
// page through the broker's pending sign-in push on its first load.
export async function devPhase(
  { cwd, services, projectId, signal }: DevTarget,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<string> {
  const { devServers } = services;
  const host = getFastAppHost();
  const project = projectId ? host.projects.get(projectId) : undefined;
  const appDir = appDirOf(cwd);
  let url: string;
  // The step's details name the dev command and where it came up.
  const finish = startActivity({ kind: 'command', label: devScript(appDir), cwd: appDir });
  const logTail = () =>
    devServers.log(appDir).trimEnd().split('\n').slice(-DEV_LOG_LINES).join('\n');
  try {
    ({ url } = await devServers.ensure(appDir, {
      preferredPort: previewPortOf(project),
      signal,
      fresh,
    }));
    finish({ detail: `${fresh ? 'started' : 'running'} on ${url}`, output: logTail() });
  } catch (err) {
    // What the server printed is where the model finds the error.
    const log = logTail();
    finish({ detail: 'failed to start', failed: true, output: log || errorMessage(err) });
    throw new Error(`${errorMessage(err)}\n${log}`);
  }
  await recordDevServerUrl(project?.id, url);
  // The Preview may still show the old port, or a page that failed to load
  // before the server listened (follow-dev-server.ts decides).
  if (projectId) host.events?.devServerUp(projectId, url);
  return url;
}

/** What verify checks: the database's tables, and the screens the build made. */
export type CheckTarget = {
  tables: readonly LiveMetaTable[];
  resources: readonly GenResource[];
  junctions: readonly string[];
  /** The routes of screens not to check, with what under them: those whose table is gone. */
  skipRoutes?: readonly string[];
};

/**
 * The screens the build record lists, against the tables the database has
 * now. The screens of a table deleted outside the app still query it, which
 * is no fault of the app's code, so they are left out and named in `gone`.
 * With no tables read (no owner session), every screen stays in.
 */
export function recordedTarget(
  record: Pick<BuildRecord, 'screens'> | null,
  tables: readonly LiveMetaTable[] | null,
): CheckTarget & { gone: GenResource[] } {
  const resources = record?.screens?.resources ?? [];
  const gone = tables ? resourcesGone(resources, tables) : [];
  return {
    tables: tables ?? [],
    resources: resources.filter((resource) => !gone.includes(resource)),
    junctions: record?.screens?.junctions ?? [],
    skipRoutes: gone.map((resource) => resource.route),
    gone,
  };
}

export type VerifyContext = CheckTarget & {
  /** The dev server under test; verify starts it fresh for routes a running one missed, and stops with its signal. */
  dev: DevTarget;
  devUrl: string;
  /** Without one, the checks that sign in to the app (the render check and the CRUD smoke) don't run. */
  session: OwnerSession | null;
  rules: FieldRules;
  /** Gets the render check's outcome, and what verify left unchecked, before it passes or fails. */
  onRenderCheck?: (summary: RenderCheckSummary, gaps: VerifyGaps) => void;
};

const SIGNED_OUT = 'there is no owner session to open the pages as';
const NO_BROWSER = 'this host has no browser to open the pages in';

// The render check is the host's: the pages open in its browser, as the owner.
function renderCheckOf(session: OwnerSession | null, signal: AbortSignal | undefined) {
  const check = getFastAppHost().renderCheck;
  return (url: string, routes: readonly string[]) => {
    if (!session) return Promise.resolve({ failures: [], pages: 0, skipped: SIGNED_OUT });
    if (!check) return Promise.resolve({ failures: [], pages: 0, skipped: NO_BROWSER });
    return check(url, routes, session, signal);
  };
}

// Without the list, the CRUD smoke would write test rows into the entity
// types' tables, which only the backend can tear down, so verify stops first.
async function entityTablesOrStop(ctx: VerifyContext): Promise<string[]> {
  try {
    return await entityTableNames(ctx.dev.cwd, ctx.dev.signal);
  } catch (err) {
    throw new PhaseError(
      'verify',
      `reading the entity types failed: ${errorMessage(err)}`,
      ENTITY_TYPES_FIX,
    );
  }
}

/** Verify's checks and what they found; verifyPhase fails the phase on a failure. */
export async function runVerify(ctx: VerifyContext): Promise<VerifyResult> {
  const { session, dev } = ctx;
  // A detail page opens a row its table has now; without one, the nil id.
  const samples = session
    ? await fetchSampleIds(ctx.resources, ctx.tables, session).catch((err: unknown) => {
      console.warn(`[fast-app] reading sample rows failed: ${errorMessage(err)}`);
      return {};
    })
    : {};
  const sampleIds = sampleIdsFor(ctx.resources, ctx.tables, samples);
  // Only the CRUD smoke uses them, and it runs only with an owner session.
  const entityTables = session ? await entityTablesOrStop(ctx) : [];
  const result = await verifyApp({
    appDir: appDirOf(dev.cwd),
    devUrl: ctx.devUrl,
    tables: ctx.tables,
    owner: session
      ? { endpoint: session.endpoint, token: session.token, userId: session.userId }
      : null,
    sampleIds,
    resources: ctx.resources,
    ...(ctx.skipRoutes?.length ? { skipRoutes: ctx.skipRoutes } : {}),
    rules: ctx.rules,
    ...(entityTables.length ? { entityTables } : {}),
    restartDev: () => devPhase(dev, { fresh: true }),
    renderCheck: renderCheckOf(session, dev.signal),
    ...(ctx.resources.length
      ? { tablesUnderTest: [...ctx.resources.map((r) => r.table), ...ctx.junctions] }
      : {}),
    signal: dev.signal,
  });
  ctx.onRenderCheck?.(result.render, result.gaps);
  recordVerifyFacts(result);
  return result;
}

const CODE_FIX =
  'Fix each failure in the app code (resource configs in src/resources first, then pages), then call verify_app.';

// The backend failing (its handler, or an error answer) is no fault of the app.
const backendFailed = (failures: VerifyResult['failures']) =>
  failures.length > 0 && failures.every((f) => f.fault === 'backend');

/** How long verify waits before it checks again a backend that failed while it rebuilt. */
export const BACKEND_RECHECK_MS = 15_000;

// The failures say where the fix is: the backend, the browser's access to the
// API (app_doctor), or the app's code.
function verifyFix(failures: VerifyResult['failures']): string {
  if (backendFailed(failures)) {
    return "The backend's API failed while it was being rebuilt, not the app's code. Call verify_app again; if it fails the same way, tell the user the backend is failing.";
  }
  const blocked = failures.filter((f) => f.fault === 'access');
  if (blocked.length === failures.length) return BLOCKED_REQUEST_FIX;
  return blocked.length > 0 ? `${BLOCKED_REQUEST_FIX} ${CODE_FIX}` : CODE_FIX;
}

/**
 * Verifies the app. The API answers 5xx for a while after a schema change, as
 * it rebuilds, so a run that only the backend failed runs once more, after a
 * wait, before the phase fails; `note` says so on the card.
 */
export async function verifyPhase(
  ctx: VerifyContext,
  note: (text: string) => void,
): Promise<VerifyResult> {
  let result = await runVerify(ctx);
  // plan_app's or verify_app's verify is newer than the host's own last check.
  getFastAppHost().events?.appVerified(ctx.dev.cwd);
  if (!result.ok && backendFailed(result.failures)) {
    note(
      `The backend's API failed while it was being rebuilt; checking again in ${BACKEND_RECHECK_MS / 1000} s.`,
    );
    await sleep(BACKEND_RECHECK_MS, ctx.dev.signal);
    result = await runVerify(ctx);
  }
  if (!result.ok) {
    throw new PhaseError(
      'verify',
      `${result.failures.length} check${result.failures.length === 1 ? '' : 's'} failed:\n${formatVerifyFailures(result.failures)}`,
      verifyFix(result.failures),
      result.failures.map((f) => ({
        check: f.check,
        ...(f.file || f.route || f.resource
          ? { where: f.file ?? f.route ?? `${f.resource}${f.op ? ` ${f.op}` : ''}` }
          : {}),
        message: f.message,
      })),
    );
  }
  return result;
}
