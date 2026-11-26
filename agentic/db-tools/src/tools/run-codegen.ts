import { existsSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { type HarnessTool, type HarnessToolResult, strictObject, type ToolFailure } from '@agentic-kit/harness';
import { z } from 'zod';

import {
  type AppKind,
  composedInstallComplete,
  detectAppKind,
  ensureAppScaffold,
  ensureComposedInstall,
  ensureWorkspaceConfig,
  IGNORED_BUILDS_RE,
  pinCodegenLatest,
  prewarmAppWorkspace,
  run,
  type RunCommand,
  settlePrewarm,
} from '../app-workspace';
import type { ProjectContext } from '../context';
import { failedResult, failureText, type Result, suggest } from '../failure';
import { classifyBackendErrors, postGraphQL } from '../graphql-http';
import { getHost } from '../host';
import { projectReady } from '../ready';
import { normalizeSdkBarrels } from '../run-codegen/barrels';
import { codegenEndpointEnv, derivePlaneEndpoints, envLocalContent } from '../run-codegen/endpoints';


const RunCodegenZod = strictObject('the input', {});
type Params = z.infer<typeof RunCodegenZod>;

/** Wall-clock milliseconds per step; a step that didn't run reports 0. */
export type RunCodegenTimings = {
  scaffoldMs: number;
  installMs: number;
  codegenMs: number;
  barrelsMs: number;
  totalMs: number;
};

export type RunCodegenDetails = {
  success: boolean;
  message: string;
  barrelsRewritten?: number;
  generatedSubmodules?: string[];
  /** `composed` when packages/app carries .constructive/compose.json. */
  appKind?: 'composed' | 'template';
  /** False when a composed app's node_modules was already there. */
  installed?: boolean;
  codegenAttempts?: number;
  timings?: RunCodegenTimings;
  /** The app API answered ACCESS_SUSPENDED: the database is deleted or suspended. */
  code?: 'database-unavailable';
  /** With `app-missing`: the app data plane endpoint the SDK is generated from. */
  appEndpoint?: string;
};

type ToolResult = HarnessToolResult<RunCodegenDetails>;

function fail(failure: ToolFailure, extra?: Omit<RunCodegenDetails, 'success' | 'message'>): ToolResult {
  return failedResult<RunCodegenDetails>(failure, { ...extra, success: false, message: failureText(failure) });
}

const failed = (message: string): ToolFailure => ({ code: 'failed', message });

const FETCH_RESET_RE = /Failed to fetch schema|Connection reset|ECONNRESET|socket hang up/i;
// A refusal is an answer, not a dropped connection: retrying it only waits.
const REFUSED_RE = /\b403\b|Forbidden|ACCESS_SUSPENDED/;

// A composed marker that is not sound: the template fixups would rewrite a composed app, so nothing runs.
const invalidApp = (reason: string): ToolFailure => ({
  code: 'failed',
  message: reason,
  hint: 'Recompose packages/app, or remove the marker to use the template flow.',
});

/** What run_codegen runs on: the project's database, the app in packages/app, and what it does to the app first. */
export type RunCodegenReady = {
  context: ProjectContext;
  app: Exclude<AppKind, { kind: 'invalid' }>;
  /** Whether this host lets run_codegen create packages/app and install its packages (`ToolsHost.prewarmApp`). */
  preparesApp: boolean;
  /** What the plan says it runs, in words: the project's own code generator, and the steps it takes on the app first when the host prepares the app. */
  notes: string[];
};

// The app's steps before codegen, when the host lets run_codegen prepare the app.
function appStepsOf(app: RunCodegenReady['app'], scaffolded: boolean): string[] {
  if (app.kind === 'composed') {
    return ["This writes the app's endpoints to packages/app/.env.local and installs the app's packages from its lockfile when they are missing, then generates the SDK."];
  }
  return [
    scaffolded
      ? "This writes the app's endpoints to packages/app/.env.local, sets the workspace's package settings, moves the code generator to its latest version and installs the packages, then generates the SDK."
      : "This creates packages/app from the app template, writes the app's endpoints to packages/app/.env.local, sets the workspace's package settings and installs the packages, then generates the SDK.",
  ];
}

/**
 * The endpoints codegen reads, from the API endpoint the session trusts: never from an API_ENDPOINT pin in the
 * project's .env, since the schema at the endpoint decides the code that lands in the project.
 */
const planesOf = (context: ProjectContext) => derivePlaneEndpoints(context.controlApiEndpoint, context.databaseName);

// The app data plane endpoint codegen reads: the per-database api host.
const appEndpointOf = (context: ProjectContext): string | undefined => planesOf(context)?.app;

/** What the plan says before any app step: the generator is the project's own code, which runs as the person. */
const PROJECT_CODEGEN =
  "This runs the project's own code generator in packages/app: graphql-codegen with the project's graphql-codegen.config.ts, or the app's own codegen script. That is code from the project, and it runs on this machine as you.";

// A host that prepares no app runs codegen only in an app that is there and installed.
function noApp(context: ProjectContext, message: string, hint: string): ToolFailure {
  const appEndpoint = appEndpointOf(context);
  return { code: 'app-missing', message, hint, ...(appEndpoint ? { context: { appEndpoint } } : {}) };
}

/**
 * What run_codegen checks before it changes anything: the project's database
 * on the data plane (codegen reads the app's own API, as the Preview does), by
 * name, and the app in packages/app. Its API endpoint is the .env pin when
 * there is one, as the data plane resolves it. A host that prepares no app
 * (`prewarmApp: false`) needs an app there, installed when it is composed.
 */
export async function runCodegenReady(cwd: string): Promise<Result<RunCodegenReady>> {
  const ready = await projectReady(cwd, 'data');
  if (ready.kind === 'failed') return ready;
  const appDir = path.join(cwd, 'packages', 'app');
  const app = detectAppKind(appDir);
  if (app.kind === 'invalid') return { kind: 'failed', failure: invalidApp(app.reason) };
  if (!ready.value.databaseName) {
    return {
      kind: 'failed',
      failure: {
        code: 'missing-credentials',
        message: 'DATABASE_NAME is missing from .env, and the backend reported no name for the database.',
        hint: "Add DATABASE_NAME with the database's name to .env, then call again.",
        calls: [suggest('run_codegen', {}, 'Generate the SDK once DATABASE_NAME is in .env')],
      },
    };
  }
  const preparesApp = getHost().prewarmApp !== false;
  const scaffolded = existsSync(path.join(appDir, 'package.json'));
  if (!preparesApp && !scaffolded) {
    return {
      kind: 'failed',
      failure: noApp(
        ready.value,
        'There is no app in packages/app to generate the SDK into, and this host does not create one, so nothing was written.',
        'Generate the SDK from the endpoint in the result, or add an app in packages/app, then call again.',
      ),
    };
  }
  if (!preparesApp && app.kind === 'composed' && !composedInstallComplete(appDir)) {
    return {
      kind: 'failed',
      failure: noApp(
        ready.value,
        'The app in packages/app has no installed packages, and this host does not install them, so nothing was written.',
        "Install the app's packages from its lockfile, then call again.",
      ),
    };
  }
  return { kind: 'ok', value: { context: ready.value, app, preparesApp, notes: [PROJECT_CODEGEN, ...(preparesApp ? appStepsOf(app, scaffolded) : [])] } };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Ask the app API itself; a 403 from codegen alone could be anything.
async function isDatabaseUnavailable(appEndpoint: string): Promise<boolean> {
  const answer = await postGraphQL({ endpoint: appEndpoint, query: '{ __typename }' });
  return classifyBackendErrors(answer.errors) === 'suspended';
}

const CODEGEN_ARGS = ['generate', '--config', './graphql-codegen.config.ts'];

// The template flow resolves codegen through npx. A composed app runs the codegen
// its lockfile pinned: the linked bin, or the app's own `codegen` script when the
// bin isn't linked, so nothing is resolved over the network.
function codegenCommand(appDir: string, composed: boolean): { cmd: string; args: string[] } {
  if (!composed) return { cmd: 'npx', args: ['@constructive-io/graphql-codegen', ...CODEGEN_ARGS] };
  const bin = path.join(appDir, 'node_modules', '.bin', 'graphql-codegen');
  return existsSync(bin) ? { cmd: bin, args: CODEGEN_ARGS } : { cmd: 'pnpm', args: ['run', 'codegen'] };
}

// The codegen CLI introspects three live vhosts (admin/auth/app). Under load the
// Constructive backend intermittently resets a connection mid-introspection
// ("Failed to fetch schema: Connection reset"), which is transient — a retry
// almost always clears it. Re-run the whole generate (it rebuilds all targets)
// up to `attempts` times, only on a fetch/reset failure; any other failure is
// real and returned immediately.
async function runCodegenWithRetry(
  appDir: string,
  env: Record<string, string>,
  exec: RunCommand,
  composed: boolean,
  attempts = 4,
): Promise<{ ok: boolean; out: string; attempts: number }> {
  const sdk = path.join(appDir, 'src', 'graphql', 'sdk');
  const { cmd, args } = codegenCommand(appDir, composed);
  let last: { ok: boolean; out: string } = { ok: false, out: 'codegen never ran' };
  for (let i = 1; i <= attempts; i++) {
    // A composed app ships SDK stubs so it builds before codegen; codegen prunes
    // its own stale files, so the stubs stay until a run replaces them.
    if (!composed) {
      for (const sub of ['admin', 'auth', 'app']) {
        await rm(path.join(sdk, sub), { recursive: true, force: true });
      }
    }
    last = await exec(cmd, args, appDir, env);
    if (last.ok || !FETCH_RESET_RE.test(last.out) || REFUSED_RE.test(last.out)) return { ...last, attempts: i };
    if (i < attempts) await sleep(2000 * i);
  }
  return { ...last, attempts };
}

// `exec` runs every child process (clone, install, codegen); tests inject it.
export function createRunCodegenTool(
  exec: RunCommand = run,
): HarnessTool<typeof RunCodegenZod, RunCodegenDetails> {
  return {
    name: 'run_codegen',
    label: 'Run codegen',
    description:
      "Generate the typed GraphQL SDK of the project's app (packages/app) from the database: run the project's own code generator (its graphql-codegen.config.ts, or the app's codegen script), retrying transient backend connection resets, and normalize the SDK barrels. " +
      "Where the host prepares the app, it first creates packages/app from the app template when it is missing, writes the app's endpoints to packages/app/.env.local and installs the packages; " +
      'a composed app (packages/app/.constructive/compose.json) installs from its own lockfile only when its packages are missing. ' +
      'Where the host prepares no app, it runs the codegen of the app that is there and installs nothing, and answers app-missing, with the endpoint to generate from, when there is no app. Run after the schema changes.',
    promptSnippet: "run_codegen: regenerate the typed SDK of the project's app after schema changes. Gated.",
    parameters: RunCodegenZod,
    effect: 'write',
    async execute(_params: Params, ctx): Promise<ToolResult> {
      const started = Date.now();
      const since = (t: number) => Date.now() - t;
      const cwd = ctx.cwd;
      const ready = await runCodegenReady(cwd);
      if (ready.kind === 'failed') {
        const appEndpoint = ready.failure.code === 'app-missing' ? (ready.failure.context?.appEndpoint as string) : undefined;
        return fail(ready.failure, appEndpoint ? { appEndpoint } : undefined);
      }
      const { databaseName: dbName } = ready.value.context;
      const { preparesApp } = ready.value;
      const appDir = path.join(cwd, 'packages', 'app');
      // A prewarm provision_database started may still be installing; let it
      // finish so this run's install never races it.
      await settlePrewarm(cwd);
      const app = detectAppKind(appDir);
      if (app.kind === 'invalid') return fail(invalidApp(app.reason));
      const composed = app.kind === 'composed';
      const appKind: RunCodegenDetails['appKind'] = composed ? 'composed' : 'template';
      const timings: RunCodegenTimings = {
        scaffoldMs: 0,
        installMs: 0,
        codegenMs: 0,
        barrelsMs: 0,
        totalMs: 0,
      };
      let installed: boolean | undefined;
      let codegenAttempts: number | undefined;
      const stepDetails = () => ({
        appKind,
        installed,
        codegenAttempts,
        timings: { ...timings, totalMs: since(started) },
      });

      // Materialize packages/app if it isn't there yet. When provision_database
      // prewarmed it, this no-ops.
      if (preparesApp && !composed) {
        const t = Date.now();
        const scaffold = await ensureAppScaffold(cwd, exec);
        timings.scaffoldMs = since(t);
        if (!scaffold.ok) return fail(failed(scaffold.out), stepDetails());
      }

      const planes = planesOf(ready.value.context);

      // The dev server reads .env.local (NEXT_PUBLIC_DB_NAME + per-DB endpoint
      // overrides so it doesn't fall back to localhost vhosts on a remote
      // backend); the codegen config reads process.env (passed directly below).
      if (preparesApp) {
        try {
          await writeFile(path.join(appDir, '.env.local'), envLocalContent(dbName, planes));
        } catch (err) {
          return fail(failed(`Failed to write packages/app/.env.local: ${err instanceof Error ? err.message : String(err)}`));
        }
      }

      const tInstall = Date.now();
      if (!preparesApp) {
        installed = false;
      } else if (composed) {
        const install = await ensureComposedInstall(cwd, exec);
        timings.installMs = since(tInstall);
        installed = install.installed;
        if (!install.ok) return fail(failed(install.out), stepDetails());
      } else {
        // Hoist the graphql override to the root workspace and pin codegen to
        // latest before the single clean install. When prewarmed these are
        // idempotent and the install is a fast no-op.
        await ensureWorkspaceConfig(cwd);
        await pinCodegenLatest(appDir);
        const install = await exec('pnpm', ['install', '--no-frozen-lockfile'], cwd);
        timings.installMs = since(tInstall);
        installed = true;
        if (!install.ok && !IGNORED_BUILDS_RE.test(install.out)) return fail(failed(`pnpm install failed:\n${install.out}`), stepDetails());
      }

      const tCodegen = Date.now();
      const codegen = await runCodegenWithRetry(
        appDir,
        {
          NEXT_PUBLIC_DB_NAME: dbName,
          ...(planes ? codegenEndpointEnv(planes) : {}),
        },
        exec,
        composed,
      );
      timings.codegenMs = since(tCodegen);
      codegenAttempts = codegen.attempts;
      if (!codegen.ok) {
        // A refused introspection may be the database itself: deleted or
        // suspended databases answer ACCESS_SUSPENDED on every app API.
        if (REFUSED_RE.test(codegen.out) && planes && (await isDatabaseUnavailable(planes.app))) {
          return fail(
            {
              code: 'database-unavailable',
              message: `codegen failed: the app database "${dbName}" is unavailable: it was deleted or is suspended. Running it again won't help until it is restored.`,
            },
            { ...stepDetails(), code: 'database-unavailable' },
          );
        }
        // A reset that survives every internal retry is a backend outage, not a code
        // or install problem, and running the tool again cannot fix it: say so, so
        // an agent stops instead of looping on the tool.
        if (FETCH_RESET_RE.test(codegen.out)) {
          return fail(
            {
              code: 'backend-unreachable',
              message:
                'codegen failed: the Constructive backend reset the connection during schema introspection, and it stayed down ' +
                'across every retry. The backend is down; this is not a code or install problem, and running it again now will ' +
                'not fix it. Check that the backend answers once, then wait for it to recover.\n\n' +
                codegen.out,
            },
            stepDetails(),
          );
        }
        return fail(failed(`codegen failed:\n${codegen.out}`), stepDetails());
      }

      // Normalize directory barrels so Turbopack can resolve them.
      // Only directories that exist are rewritten, so a config without an admin
      // target leaves nothing pointing at one.
      const tBarrels = Date.now();
      const sdkRoot = path.join(appDir, 'src', 'graphql', 'sdk');
      const barrelsRewritten = normalizeSdkBarrels(sdkRoot);
      timings.barrelsMs = since(tBarrels);

      // Report which app submodules actually generated — a bare scaffold with only
      // index.ts means codegen had no schema to generate against.
      const appSdk = path.join(sdkRoot, 'app');
      const generatedSubmodules = ['hooks', 'orm', 'types'].filter((sub) =>
        existsSync(path.join(appSdk, sub)),
      );

      if (generatedSubmodules.length === 0) {
        return fail(
          {
            code: 'failed',
            message: `Codegen ran, but no app submodules (hooks/orm/types) were generated — the database may have no entity tables yet. Normalized ${barrelsRewritten} barrel file(s).`,
            hint: 'Create tables first, then generate the SDK again.',
          },
          { barrelsRewritten, generatedSubmodules, ...stepDetails() },
        );
      }

      const message = `Codegen complete. Generated app submodules: ${generatedSubmodules.join(', ')}. Normalized ${barrelsRewritten} barrel file(s).`;
      return {
        content: [{ type: 'text', text: message }],
        details: {
          success: true,
          message,
          barrelsRewritten,
          generatedSubmodules,
          ...stepDetails(),
        },
      };
    },
  };
}

export const runCodegenTool = createRunCodegenTool();

// Re-exported so provision_database can prewarm the same deterministic scaffold +
// install concurrently with its backend mutation (kept off run_codegen's path).
export { prewarmAppWorkspace };
