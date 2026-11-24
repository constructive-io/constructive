// An error names a key, never shows it.

import { statSync } from 'node:fs';
import path from 'node:path';

import type { RunLogStore } from '@agentic-kit/run-log';
import type { ExtensionFactory } from '@earendil-works/pi-coding-agent';

export interface HeadlessAppBuildingOptions {
  /** The project root that holds packages/app. */
  cwd: string;
  /** Never inside `cwd`. */
  stateDir: string;
  databaseId: string;
  /** The platform account that owns the database. */
  account: { email: string; apiKey: string };
  /** The owner's personal API key of the app database's realm, not a principal's. */
  ownerKey: string;
  /** The per-database hosts are derived from `api` by swapping its first label. */
  endpoints: { api: string; modules: string };
  runLog: {
    store: RunLogStore;
    runId: string;
    flush: () => Promise<void>;
  };
  /** Absent: the render check reports "skipped". */
  chromiumPath?: string;
  /** Default 30 minutes. */
  approvalTimeoutMs?: number;
}

export interface HeadlessAppBuilding {
  /** Load after the lanes. */
  extensions: ExtensionFactory[];
  toolNames: string[];
  systemPrompt: string;
  /** Call when the turn ends. */
  dispose(): Promise<void>;
}

export const DEFAULT_APPROVAL_TIMEOUT_MS = 30 * 60_000;

export type CheckedOptions = Omit<HeadlessAppBuildingOptions, 'approvalTimeoutMs'> & {
  approvalTimeoutMs: number;
};

export class HeadlessOptionsError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(
      `The app-building tools can't start, because the launch passed values they can't use: ${problems.join('; ')}. ` +
        'Check the APP_BUILD_* config of the run\'s database (Set up Cloud in Constructive Desktop writes it) and what the Job passes from it.'
    );
    this.name = 'HeadlessOptionsError';
    this.problems = problems;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// setTimeout's limit; a longer wait would fire at once.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isDirectory = (dir: string): boolean => {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
};

const isHttpUrl = (value: unknown): boolean => {
  if (!isText(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Why an endpoint can't be used, or null. The keys go to hosts made from the
 * api endpoint by swapping its first label (`auth.`, `auth-<db>.`,
 * `api-<db>.`), so that label must be the plane's own, under a domain of at
 * least one more label: then a derived host stays in the backend's domain.
 */
function endpointProblem(name: 'api' | 'modules', label: string, value: unknown): string | null {
  if (!isHttpUrl(value)) return `endpoints.${name} must be an http or https URL`;
  const labels = new URL(value as string).hostname.split('.');
  if (labels.length < 2 || labels[0] !== label || labels.some((part) => !part)) {
    return `endpoints.${name} must be on a ${label}.<domain> host, such as https://${label}.example.com/graphql`;
  }
  return null;
}

export function isWithin(parent: string, child: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// A key is one token: the Job sends it as `Bearer <value>`.
function keyProblem(name: string, value: unknown): string | null {
  if (!isText(value)) return `${name} is missing`;
  if (/\s/.test(value)) return `${name} must be a bare key, with no spaces (no "Bearer " prefix)`;
  return null;
}

export function checkOptions(options: HeadlessAppBuildingOptions): CheckedOptions {
  if (!options || typeof options !== 'object') {
    throw new HeadlessOptionsError(['the options are missing']);
  }
  const problems: string[] = [];
  const { cwd, stateDir, databaseId, account, ownerKey, endpoints, runLog } = options;

  if (!isText(cwd) || !path.isAbsolute(cwd)) problems.push('cwd must be an absolute path');
  else if (!isDirectory(cwd)) problems.push(`cwd ${cwd} is not a folder`);
  if (!isText(stateDir) || !path.isAbsolute(stateDir)) {
    problems.push('stateDir must be an absolute path');
  } else if (isText(cwd) && (isWithin(cwd, stateDir) || isWithin(stateDir, cwd))) {
    // The agent commits the work tree: no cache, pid file or browser profile goes in it.
    problems.push('stateDir must be outside cwd');
  }
  if (!isText(databaseId) || !UUID.test(databaseId)) problems.push('databaseId must be a UUID');

  if (!account || typeof account !== 'object') {
    problems.push('account is missing');
  } else {
    if (!isText(account.email) || !account.email.includes('@')) {
      problems.push('account.email must be an email address');
    }
    const accountKey = keyProblem('account.apiKey', account.apiKey);
    if (accountKey) problems.push(accountKey);
  }
  const owner = keyProblem('ownerKey', ownerKey);
  if (owner) problems.push(owner);
  else if (account && ownerKey === account.apiKey) {
    // The account's key works on the control plane only; the app's rows need the owner's own.
    problems.push('ownerKey must be the owner\'s key in the app database\'s realm, not the account key');
  }

  if (!endpoints || typeof endpoints !== 'object') {
    problems.push('endpoints are missing');
  } else {
    for (const [name, label] of [['api', 'api'], ['modules', 'modules']] as const) {
      const problem = endpointProblem(name, label, endpoints[name]);
      if (problem) problems.push(problem);
    }
  }

  if (!runLog || typeof runLog !== 'object') {
    problems.push('runLog is missing');
  } else {
    const { store } = runLog;
    if (!store || typeof store.append !== 'function' || typeof store.read !== 'function') {
      problems.push('runLog.store must be a run-log store (append and read)');
    }
    if (!isText(runLog.runId)) problems.push('runLog.runId is missing');
    if (typeof runLog.flush !== 'function') problems.push('runLog.flush must be a function');
  }

  if (options.chromiumPath !== undefined && (!isText(options.chromiumPath) || !path.isAbsolute(options.chromiumPath))) {
    problems.push('chromiumPath must be an absolute path');
  }
  const timeout = options.approvalTimeoutMs;
  if (
    timeout !== undefined &&
    (typeof timeout !== 'number' || !Number.isFinite(timeout) || timeout <= 0 || timeout > MAX_TIMEOUT_MS)
  ) {
    problems.push(`approvalTimeoutMs must be a number of milliseconds between 1 and ${MAX_TIMEOUT_MS}`);
  }

  if (problems.length) throw new HeadlessOptionsError(problems);
  return {
    ...options,
    cwd: path.resolve(cwd),
    stateDir: path.resolve(stateDir),
    approvalTimeoutMs: timeout ?? DEFAULT_APPROVAL_TIMEOUT_MS
  };
}
