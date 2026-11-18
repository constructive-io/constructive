// One dev server process of a generated app: its command, the process group
// the desktop owns, and the promise of its URL. It knows nothing of which
// start owns it; dev-server.ts moves each app's slot from what this reports.

import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { childEnv, killTree } from './command';
import { devServerUrl, INITIAL_DEV_OUTPUT, parseDevOutput } from './dev-server-ready';

const READY_TIMEOUT_MS = 90_000;
const LOG_TAIL = 16_000;

export type DevProcess = {
  appDir: string;
  port: number;
  child: ChildProcess;
  /** The server's URL once it answers; rejects when it fails, times out or exits first. */
  ready: Promise<string>;
  /** What it printed, its last `LOG_TAIL` characters. */
  log: string;
};

// The app's own `dev` script, run in a process group the desktop owns. Going
// through `pnpm dev` would not do: pnpm starts the script in a group of its
// own, so stopping pnpm's group leaves Next running.
/** The app's dev command, from its package.json; what the dev server runs. */
export function devScript(appDir: string): string {
  try {
    const pkg = JSON.parse(readFileSync(path.join(appDir, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    return pkg.scripts?.dev ?? 'next dev';
  } catch {
    return 'next dev';
  }
}

// A desktop that is killed (SIGTERM on macOS ends Electron without running
// any of its JavaScript) can't stop its children, so the group's own shell
// watches the desktop and kills the whole group a second after it is gone,
// or when the dev server exits by itself.
export function watchdogScript(script: string, desktopPid: number): string {
  return [
    `${script} &`,
    'dev=$!',
    `while kill -0 ${desktopPid} 2>/dev/null && kill -0 "$dev" 2>/dev/null; do sleep 1; done`,
    'kill -KILL 0',
  ].join('\n');
}

/** Spawns the app's dev server on `port`. */
export function startDevProcess(appDir: string, port: number): DevProcess {
  // NODE_ENV from the desktop's own environment must not leak into Next.
  const bin = path.join(appDir, 'node_modules', '.bin');
  const child = spawn('sh', ['-c', watchdogScript(devScript(appDir), process.pid)], {
    cwd: appDir,
    env: childEnv({
      PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
      PORT: String(port),
      NODE_ENV: undefined,
      FORCE_COLOR: '0',
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  const server: DevProcess = { appDir, port, child, log: '', ready: Promise.resolve('') };
  server.ready = new Promise<string>((resolve, reject) => {
    let output = INITIAL_DEV_OUTPUT;
    let settled = false;
    const settle = (error: Error | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(devServerUrl(output, port));
    };
    const timer = setTimeout(
      () => settle(new Error(`The dev server was not ready after ${READY_TIMEOUT_MS / 1000} s.`)),
      READY_TIMEOUT_MS,
    );
    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      server.log = (server.log + text).slice(-LOG_TAIL);
      output = parseDevOutput(output, text);
      if (output.error) settle(new Error(`The dev server failed to start: ${output.error}`));
      else if (output.ready) settle(null);
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('error', (err) => settle(err));
    child.on('exit', (code) =>
      settle(new Error(`The dev server exited with code ${code} before it was ready.`)),
    );
  });
  // Callers that never await `ready` must not see an unhandled rejection.
  server.ready.catch(() => {});
  return server;
}

/** Resolves once the process has exited, at once when it has already. */
export function exitOf(child: ChildProcess): Promise<void> {
  return new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) resolve();
    else child.once('exit', () => resolve());
  });
}

// A dev server outlives a desktop that was killed instead of quit (a crash, a
// forced restart), so each one's process group is written to a pid file and
// the next start stops whatever is left. A group is only killed while one of
// its processes still names the app directory, so a reused id is left alone.

/** Kills the groups a pid file names that still run their app. */
export function reapGroups(file: string): void {
  for (const [appDir, pid] of Object.entries(readPids(file))) {
    if (groupStillOurs(pid, appDir)) killTree(pid, 'SIGKILL');
  }
}

export function writePids(file: string, pids: Record<string, number>): void {
  try {
    writeFileSync(file, JSON.stringify(pids));
  } catch (err) {
    console.warn(`[fast-app] could not record dev servers: ${(err as Error).message}`);
  }
}

function readPids(file: string): Record<string, number> {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, number>;
  } catch {
    return {};
  }
}

function groupStillOurs(pgid: number, appDir: string): boolean {
  try {
    const pids = execFileSync('pgrep', ['-g', String(pgid)], { encoding: 'utf8' })
      .trim()
      .split('\n');
    return pids.some((pid) =>
      execFileSync('ps', ['-o', 'command=', '-p', pid], { encoding: 'utf8' }).includes(appDir),
    );
  } catch {
    return false;
  }
}
