// What each build step ran: the db-tools calls, the commands, the checks, the
// files and the commit, each with its own time, for the card's details. A
// step's log travels with the step's async work (AsyncLocalStorage), so the
// code that runs a command or a call records it where it happens, and the SDK
// and the sample rows, which run at the same time, each fill their own list.
// Every label, argument, detail and excerpt goes through redact.ts on the way
// in, so what the card shows and copies is redacted already.

import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'node:path';

import type { StepActivity, StepActivityKind } from './app-plan';
import { outputExcerpt, redact, redactCommand, redactJson } from './redact';

/** A step's list, and what its redaction knows. BuildProgress makes one per step. */
export type StepLog = {
  /** The project folder: a working dir shows relative to it. */
  root: string | undefined;
  /** Values taken out wherever they appear: the owner's password, the .env's secrets. */
  secrets(): readonly string[];
  push(entry: StepActivity): StepActivity;
  /** An entry changed in place: stream the details again. */
  changed(): void;
};

const current = new AsyncLocalStorage<StepLog>();

/** Runs a step's work with its log in scope. */
export const withStepLog = <T>(log: StepLog, work: () => Promise<T>): Promise<T> =>
  current.run(log, work);

/**
 * `text` as a step's log would keep it: the running step's secrets and
 * anything shaped like one taken out. For text that reaches the result some
 * other way than an activity, such as a failure message.
 */
export const redactInStep = (text: string): string =>
  redact(text, current.getStore()?.secrets() ?? []);

export type ActivityStart = {
  /** How the card draws it. A command's line drops its leading env assignments and shortens absolute paths. */
  kind: StepActivityKind;
  label: string;
  /** A call's arguments in a few words. */
  args?: string;
  /** A call's arguments in full; kept as JSON, redacted and capped. */
  params?: unknown;
  cwd?: string;
  detail?: string;
};

export type ActivityEnd = {
  detail?: string;
  failed?: boolean;
  exit?: number;
  /** A command's output, kept as its last lines; another item's only when it failed. */
  output?: string;
  checks?: StepActivity['checks'];
  sha?: string;
  lists?: StepActivity['lists'];
  ms?: number;
};

const LABEL_CHARS = 240;
const LIST_ITEMS = 200;
/** A call's arguments past this are cut, and the item says where; a blueprint's definition can run long. */
export const PARAMS_CHARS = 8192;

const capped = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

// An absolute path in a command line: relative to the command's working dir
// when it's inside the project, as the command would take it, else its last
// part (a temp file's folder says nothing).
function shortPaths(line: string, cwd: string | undefined, root: string | undefined): string {
  return line.replace(/(?<=^|\s)\/[^\s'"]+/g, (p) => {
    const inside = [root, cwd].some((base) => base && (p === base || p.startsWith(`${base}/`)));
    const base = cwd ?? root;
    return inside && base ? path.relative(base, p) || '.' : `…/${path.basename(p)}`;
  });
}

function relativeCwd(cwd: string | undefined, root: string | undefined): string | undefined {
  if (!cwd) return undefined;
  if (!root) return path.basename(cwd);
  const rel = path.relative(root, cwd);
  return rel.startsWith('..') ? path.basename(cwd) : rel || '.';
}

// A call's arguments as JSON that still parses; past the cap, an excerpt
// that says where it was cut.
function paramsOf(
  params: unknown,
  secrets: readonly string[],
): Pick<StepActivity, 'params' | 'paramsCutAt'> {
  if (params === undefined) return {};
  const text = JSON.stringify(redactJson(params, secrets), null, 2) ?? '';
  return text.length > PARAMS_CHARS
    ? { params: text.slice(0, PARAMS_CHARS), paramsCutAt: PARAMS_CHARS }
    : { params: text };
}

function cleanLists(
  lists: StepActivity['lists'],
  secrets: readonly string[],
): StepActivity['lists'] {
  return lists?.map((list) => ({
    label: list.label,
    items: list.items.slice(0, LIST_ITEMS).map((item) => redact(item, secrets)),
    ...(list.items.length > LIST_ITEMS ? { more: list.items.length - LIST_ITEMS } : {}),
  }));
}

function cleanChecks(
  checks: StepActivity['checks'],
  secrets: readonly string[],
): StepActivity['checks'] {
  return checks?.slice(0, LIST_ITEMS).map((check) => ({
    name: redact(check.name, secrets),
    status: redact(check.status, secrets),
    ...(check.failed ? { failed: true as const } : {}),
    ...(check.note ? { note: capped(redact(check.note, secrets), LABEL_CHARS) } : {}),
  }));
}

// Starts an item; `timed` false notes it done, with no time of its own.
function begin(start: ActivityStart, timed: boolean): (end?: ActivityEnd) => void {
  const log = current.getStore();
  if (!log) return () => {};
  const secrets = log.secrets();
  const label =
    start.kind === 'command'
      ? shortPaths(redactCommand(start.label, secrets), start.cwd, log.root)
      : redact(start.label, secrets);
  const cwd = relativeCwd(start.cwd, log.root);
  const params = paramsOf(start.params, secrets);
  const entry = log.push({
    kind: start.kind,
    label: capped(label, LABEL_CHARS),
    ...(start.args ? { args: capped(redact(start.args, secrets), LABEL_CHARS) } : {}),
    ...params,
    ...(cwd ? { cwd } : {}),
    ...(start.detail ? { detail: redact(start.detail, secrets) } : {}),
    ...(timed ? { running: true as const } : {}),
  });
  log.changed();
  const started = Date.now();
  let done = false;
  return (end = {}) => {
    if (done) return;
    done = true;
    const secretsNow = log.secrets();
    delete entry.running;
    if (timed) entry.ms = end.ms ?? Date.now() - started;
    if (end.detail) entry.detail = redact(end.detail, secretsNow);
    if (end.exit !== undefined) entry.exit = end.exit;
    if (end.failed) entry.failed = true;
    if (end.output?.trim() && (entry.kind === 'command' || end.failed)) {
      entry.output = outputExcerpt(end.output, secretsNow);
    }
    if (end.checks?.length) entry.checks = cleanChecks(end.checks, secretsNow);
    if (end.sha) entry.sha = end.sha;
    if (end.lists?.length) entry.lists = cleanLists(end.lists, secretsNow);
    log.changed();
  };
}

/**
 * Starts an item in the running step's list and returns its finish. Outside
 * a step (a check of the app, a test) it records nothing.
 */
export const startActivity = (start: ActivityStart) => begin(start, true);

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Times `work` as one item. A throw marks it failed, with the error's last lines. */
export async function recordActivity<T>(
  start: ActivityStart,
  work: () => Promise<T>,
  end?: (result: T) => ActivityEnd,
): Promise<T> {
  const finish = startActivity(start);
  try {
    const result = await work();
    finish(end?.(result));
    return result;
  } catch (err) {
    finish({ failed: true, output: messageOf(err) });
    throw err;
  }
}

/** Something the step learned, with no wait of its own: the files gen wrote, what a check found. */
export function noteActivity(start: ActivityStart, end: ActivityEnd = {}): void {
  begin(start, false)(end);
}
