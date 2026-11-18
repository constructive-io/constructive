import { spawn } from 'node:child_process';

import { scrubEnv } from '@agentic-kit/permissions';

import { startActivity } from './activity';

export type CommandResult = {
  ok: boolean;
  code: number | null;
  /** stdout and stderr interleaved, trimmed to the last `maxOutput` characters. */
  output: string;
  /** It ran past its timeout and was stopped. Never true with `aborted`: the first cause wins. */
  timedOut: boolean;
  /** The caller's signal stopped it. */
  aborted: boolean;
  ms: number;
};

export type CommandOptions = {
  cwd: string;
  env?: Record<string, string | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxOutput?: number;
  onOutput?: (chunk: string) => void;
};

const DEFAULT_MAX_OUTPUT = 64_000;
// A command still running this long after it was told to stop is killed.
const KILL_GRACE_MS = 5_000;

/**
 * The environment of a build command (install, gen, tsc, the dev server, the
 * CRUD smoke): the desktop's own without anything secret, which keeps the
 * provider keys and tokens from the user's shell away from the app's code and
 * its dependencies, plus `extra`. An `undefined` in `extra` unsets a variable.
 */
export function childEnv(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: Record<string, string | undefined> = { ...scrubEnv(process.env), ...extra };
  for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key];
  return env;
}

// Runs a command in its own process group, so a timeout or an abort stops
// everything it started (pnpm → node → workers), not only the first process.
export async function runCommand(
  command: string,
  args: readonly string[],
  options: CommandOptions,
): Promise<CommandResult> {
  // Inside a build step, the command goes on the step's list on the card.
  const finish = startActivity({
    kind: 'command',
    label: commandLine(command, args),
    cwd: options.cwd,
  });
  const result = await spawnCommand(command, args, options);
  const ended = result.timedOut ? 'timed out' : result.aborted ? 'stopped' : null;
  finish({
    ...(ended ? { detail: ended } : result.code !== null ? { exit: result.code } : {}),
    failed: !result.ok,
    output: result.output,
    ms: result.ms,
  });
  return result;
}

/** A command and its arguments as a shell would show them, quoting what has spaces. */
export function commandLine(command: string, args: readonly string[]): string {
  return [command, ...args]
    .map((arg) => (/[\s"']/.test(arg) ? JSON.stringify(arg) : arg))
    .join(' ');
}

function spawnCommand(
  command: string,
  args: readonly string[],
  options: CommandOptions,
): Promise<CommandResult> {
  const started = Date.now();
  const maxOutput = options.maxOutput ?? DEFAULT_MAX_OUTPUT;
  return new Promise((resolve) => {
    let output = '';
    let cause: 'timeout' | 'stopped' | null = null;
    let settled = false;
    let hardKill: NodeJS.Timeout | null = null;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: childEnv(options.env),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    const append = (chunk: Buffer) => {
      const text = chunk.toString();
      options.onOutput?.(text);
      output = (output + text).slice(-maxOutput);
    };
    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    const stop = (why: 'timeout' | 'stopped') => {
      if (cause || settled) return;
      cause = why;
      killTree(child.pid);
      hardKill = setTimeout(() => killTree(child.pid, 'SIGKILL'), KILL_GRACE_MS);
      hardKill.unref();
    };
    const timer = options.timeoutMs ? setTimeout(() => stop('timeout'), options.timeoutMs) : null;
    const onAbort = () => stop('stopped');
    options.signal?.addEventListener('abort', onAbort, { once: true });
    if (options.signal?.aborted) onAbort();

    // `error` and `close` can both come: the first one ends the command.
    const finish = (code: number | null, error?: Error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (hardKill) clearTimeout(hardKill);
      options.signal?.removeEventListener('abort', onAbort);
      if (error) output = `${output}\n${error.message}`.slice(-maxOutput);
      resolve({
        ok: code === 0 && cause === null,
        code,
        output,
        timedOut: cause === 'timeout',
        aborted: cause === 'stopped',
        ms: Date.now() - started,
      });
    };
    child.on('error', (error) => finish(null, error));
    child.on('close', (code) => finish(code));
  });
}

export function killTree(pid: number | undefined, signal: NodeJS.Signals = 'SIGTERM'): void {
  if (!pid) return;
  try {
    if (process.platform === 'win32') process.kill(pid, signal);
    else process.kill(-pid, signal);
  } catch {
    // Already gone.
  }
}

/** The last lines of a command's output, for an error message the model reads. */
export function outputTail(output: string, lines = 30): string {
  return output.trimEnd().split('\n').slice(-lines).join('\n');
}
