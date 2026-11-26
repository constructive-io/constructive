/**
 * Host contract for the Constructive database tools.
 *
 * The typed db tools were extracted from Constructive Desktop, where they read
 * an Electron-side `runtime` singleton (account store, backend config, data-auth
 * broker, preview token). Hosts now inject the same surface here once at
 * startup (`configureHost`); the tool modules stay module-level `HarnessTool`
 * consts and read it lazily via `getHost()`.
 *
 * Nothing here is harness-specific: the host is the *application* a tool acts
 * on behalf of, so the same contract serves whichever adapter runs the tools.
 */

import type { PlanAgent, ToolCallSuggestion } from '@agentic-kit/harness';

import { failureText, noBackendFailure, type Result, suggest } from './failure';
import { thrownText } from './graphql-http';

export type HostAccount = {
  userId: string;
  /** Shown beside the user id in a plan, when the host knows it. */
  email?: string;
  /** The agent of the person the session acts as, when it acts as one; a plan names it beside the account. */
  agent?: PlanAgent;
  accessToken: string;
  apiKey?: string;
};

export type HostBackendConfig = {
  apiEndpoint?: string;
  modulesEndpoint?: string;
  agentEndpoint?: string;
  computeEndpoint?: string;
};

/**
 * The tools never default to a backend: with no configured endpoint they fail
 * and say so, rather than sending the account credential to a guessed host.
 */
export function noBackendReason(hint?: string): string {
  return failureText(noBackendFailure(hint));
}

export type ActiveDataToken = {
  token: string;
  userId?: string;
  expiresAt: number;
  origin?: string;
};

/**
 * Optional data-plane token broker: remembers per-database end-user tokens
 * across tool calls and invalidates declined/expired ones. Hosts without a
 * broker fall back to the preview-token harvest on every call.
 */
export interface DataAuthBroker {
  getActiveToken(databaseId: string): ActiveDataToken | undefined | null;
  isInvalidToken(databaseId: string, token: string): boolean;
  adoptToken(databaseId: string, token: ActiveDataToken): void;
}

/** Token harvested from the host's app preview (end-user sign-in). */
export type PreviewToken = {
  accessToken: string;
  accessTokenExpiresAt?: string;
  userId?: string;
};

/**
 * Overlay layered over the pinned base preset when provisioning a database.
 * Structurally the `ProvisionOverlay` from `provision-database/resolve`; typed
 * loosely here to keep `host.ts` free of provision-internal imports.
 */
export interface HostProvisionOverlay {
  preset?: string;
  add?: (string | [string, Record<string, unknown>])[];
  remove?: string[];
}

/**
 * A minted secret handed to the host for out-of-band delivery (.env write +
 * one-time reveal). The plaintext never enters tool results or the transcript;
 * the harness forgets it after this call.
 */
export type SecretDelivery = {
  databaseId: string;
  /** Project directory whose `.env` receives the key. */
  cwd: string;
  envVar: string;
  plaintext: string;
  keyId: string;
  expiresAt?: string;
};

/**
 * Context for a host-side step-up: enough to derive the per-database auth
 * endpoint and look up the app session without re-resolving the project.
 */
export type StepUpRequest = {
  databaseId: string;
  databaseName: string;
  apiEndpoint: string;
};

/**
 * The database a project is bound to, handed to the host before provisioning
 * writes it to the project's `.env`, so a host that keeps its own record of
 * the binding never ends up with a `.env` it doesn't know about.
 */
export type ProjectBinding = {
  cwd: string;
  databaseId: string;
  databaseName: string;
  ownerId: string;
  apiEndpoint: string;
  modulesEndpoint: string;
  /** The database this binding replaced (replace mode). */
  replaces?: string;
  /** True when the existing binding was kept: nothing was provisioned. */
  skipped?: boolean;
};

export interface ToolsHost {
  /**
   * Signed-in platform account, or null/undefined when signed out. It may be a promise: a host that mints a
   * short-lived token answers once it has one. A rejection reads as signed out, like a throw.
   */
  account(): HostAccount | null | undefined | Promise<HostAccount | null | undefined>;
  /** Host-configured backend endpoints (env-aware). */
  backendConfig(): HostBackendConfig | null | undefined;
  /** Optional data-plane token broker (see DataAuthBroker). */
  dataAuthBroker?: DataAuthBroker;
  /**
   * Host-specific sign-in instruction, substituted into signed-out failure
   * reasons (e.g. the CLI's "Run `agent login` to sign in."). Absent hosts get
   * the desktop wording.
   */
  signInHint?: string;
  /** Harvest an end-user token from the host's app preview, if it has one. */
  previewToken?(): Promise<PreviewToken | null>;
  /** Treat tokens expiring within this window as already expired. Default 30s. */
  dataTokenSkewMs?: number;
  /**
   * How long provision_database waits for a provision ticket to complete.
   * Default 240s, which keeps an agent tool call under a 5-minute tool
   * timeout; a host that calls the tool outside such a timeout (e.g. a
   * pipeline) can wait longer for a cold provision on a loaded backend.
   */
  provisionPollDeadlineMs?: number;
  /**
   * Optional provision overlay: pick a base preset and/or layer module
   * add/remove on top of it. The base module list always comes from the pinned
   * `node-type-registry` preset — this only customizes it. Distributed as data
   * (e.g. materialized from appstash / a pinned git ref), never as code.
   */
  provisionOverlay?():
    | HostProvisionOverlay
    | null
    | undefined
    | Promise<HostProvisionOverlay | null | undefined>;
  /**
   * Complete MFA step-up for the database's app session in the host's own
   * process (password dialog + verifyPassword). The password never passes
   * through the harness or the model. Resolve true when step-up succeeded.
   */
  requestStepUp?(request: StepUpRequest): Promise<boolean>;
  /**
   * Deliver a minted secret to the user (.env write + one-time reveal).
   * Required for create_api_key — without it the tool refuses to mint.
   */
  deliverSecret?(delivery: SecretDelivery): Promise<void>;
  /**
   * What to tell the agent to do about a database that is gone or belongs to
   * another account, in place of the default advice to bind the directory to
   * a new database.
   */
  reprovisionHint?: string;
  /**
   * Whether the agent may replace a binding through replace_database. Default
   * true. A host that replaces databases only after the user approves (calling
   * `provisionDatabase` in replace mode itself) sets false, and the tool then
   * refuses.
   */
  toolReprovision?: boolean;
  /**
   * Whether the tools prepare packages/app: provision_database clones the app
   * template and installs it while the backend provisions, and run_codegen
   * creates or installs the app it generates into. Default true. A host that
   * prepares the app itself, or not at all, sets false: then nothing is cloned
   * or installed, and run_codegen only generates into an app that is there.
   */
  prewarmApp?: boolean;
  /**
   * Save a binding in the host's own store. Provisioning calls it before
   * writing `.env`, on a new binding and on a kept one (`skipped`). If it
   * throws, `.env` is left alone, the provision ticket stays recorded, and
   * the call fails with `binding-not-saved`.
   */
  persistBinding?(binding: ProjectBinding): Promise<void>;
}

export const DEFAULT_DATA_TOKEN_SKEW_MS = 30_000;

const DEFAULT_REPROVISION_ADVICE =
  'Bind the directory to a new database in place of this one: the schema is rebuilt from the project, and records do not carry over.';

/** The advice for a database that is gone or under another account. */
export function reprovisionAdvice(host: ToolsHost): string {
  if (host.reprovisionHint) return host.reprovisionHint;
  if (host.toolReprovision === false) return 'Ask the user to re-provision it from the app.';
  return DEFAULT_REPROVISION_ADVICE;
}

/** The call that binds the directory to a new database in place of its own, when the agent may make it. */
export function replaceCall(host: ToolsHost): { calls?: ToolCallSuggestion[] } {
  return host.toolReprovision === false ? {} : { calls: [suggest('replace_database', {}, 'Bind the directory to a new, empty database in place of this one', ['database_name'])] };
}

let currentHost: ToolsHost | null = null;

export function configureHost(host: ToolsHost): void {
  currentHost = host;
}

// A host callback may throw (a backend override that is not a URL, a locked
// keychain); a tool returns a failure instead.

/** The host's backend config, or `no-backend` when the host could not give it. */
export function readBackendConfig(host: ToolsHost): Result<HostBackendConfig | null | undefined> {
  try {
    return { kind: 'ok', value: host.backendConfig() };
  } catch (err) {
    return {
      kind: 'failed',
      failure: {
        code: 'no-backend',
        message: `Could not read the backend settings: ${thrownText(err)}`,
        hint: 'Fix the backend settings, then retry.',
      },
    };
  }
}

/** The signed-in account, or `signed-out` when the host could not give it (it threw, or its promise rejected). */
export async function readAccount(host: ToolsHost): Promise<Result<HostAccount | null | undefined>> {
  try {
    return { kind: 'ok', value: await host.account() };
  } catch (err) {
    return {
      kind: 'failed',
      failure: {
        code: 'signed-out',
        message: `Could not read the signed-in account: ${thrownText(err)}`,
        hint: host.signInHint ?? 'Sign in again, then retry.',
      },
    };
  }
}

export function getHost(): ToolsHost {
  if (!currentHost) {
    throw new Error(
      '@agentic-kit/db-tools host not configured. Call configureHost() (or createDbTools(host)) before using the db tools.'
    );
  }
  return currentHost;
}
