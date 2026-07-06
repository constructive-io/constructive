/**
 * Detached-process + artifact-file utilities.
 *
 * New in the package port: replaces the ad-hoc nohup/python-setsid launcher and
 * the inline child-management the shell orchestrators used. A spawned process
 * outlives the launching CLI (detached + unref), its stdout/stderr go to a log
 * file, and its pid is recorded so `run soak status/stop` can find it later.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface SpawnDetachedOpts {
  name: string;
  cmd: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
  outDir: string;
}

export function spawnDetached(o: SpawnDetachedOpts): { pid: number; logPath: string; pidPath: string } {
  fs.mkdirSync(o.outDir, { recursive: true });
  const logPath = path.join(o.outDir, `${o.name}.log`);
  const pidPath = path.join(o.outDir, `${o.name}.pid`);
  // Append so a restart keeps history; both stdout and stderr share the fd.
  const logFd = fs.openSync(logPath, 'a');
  try {
    const child = spawn(o.cmd, o.args, {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      // Merge over the parent env so PATH etc. survive; o.env wins on conflicts.
      env: o.env ? { ...process.env, ...o.env } : process.env,
      cwd: o.cwd || process.cwd()
    });
    child.unref();
    const pid = child.pid;
    fs.writeFileSync(pidPath, `${pid}\n`);
    return { pid, logPath, pidPath };
  } finally {
    // The child holds its own dup of the fd; the parent's copy is done.
    fs.closeSync(logFd);
  }
}

export function isAlive(pid: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    // EPERM => the process exists but is owned by another user (still alive).
    return !!(err && err.code === 'EPERM');
  }
}

export async function stopPid(pid: number, termTimeoutMs = 15000): Promise<'term' | 'kill' | 'gone'> {
  if (!isAlive(pid)) return 'gone';
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return 'gone';
  }
  const deadline = Date.now() + termTimeoutMs;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return 'term';
    await sleep(200);
  }
  if (!isAlive(pid)) return 'term';
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    return 'gone';
  }
  const killDeadline = Date.now() + 2000;
  while (Date.now() < killDeadline) {
    if (!isAlive(pid)) return 'kill';
    await sleep(100);
  }
  return 'kill';
}

export function readPid(outDir: string, name: string): number | null {
  const pidPath = path.join(outDir, `${name}.pid`);
  try {
    const raw = fs.readFileSync(pidPath, 'utf8').trim();
    const pid = Number.parseInt(raw, 10);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

// Resolve once either loopback family accepts a connection. macOS frequently
// binds `localhost` to ::1 only, so we must probe both 127.0.0.1 and ::1.
export function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const tryConnect = (host: string): Promise<boolean> =>
    new Promise((resolve) => {
      const sock = net.connect({ host, port });
      let done = false;
      const finish = (ok: boolean): void => {
        if (done) return;
        done = true;
        sock.destroy();
        resolve(ok);
      };
      sock.setTimeout(1000);
      sock.once('connect', () => finish(true));
      sock.once('timeout', () => finish(false));
      sock.once('error', () => finish(false));
    });
  return new Promise((resolve, reject) => {
    const attempt = async (): Promise<void> => {
      if ((await tryConnect('127.0.0.1')) || (await tryConnect('::1'))) {
        resolve();
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error(`timed out waiting for port ${port} after ${timeoutMs}ms`));
        return;
      }
      setTimeout(() => { void attempt(); }, 250);
    };
    void attempt();
  });
}

// Parse a JSON-lines file, skipping blank/corrupt lines (e.g. a half-flushed
// final row from a process killed mid-write).
export function ensureParentDir(file: string): void {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
}

export function readJsonl(file: string): any[] {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const out: any[] = [];
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try {
      out.push(JSON.parse(s));
    } catch {
      // skip corrupt/partial line
    }
  }
  return out;
}

export function writeDone(outDir: string, name: string, content?: string): void {
  fs.mkdirSync(outDir, { recursive: true });
  const donePath = path.join(outDir, `${name}.done`);
  const body = content !== undefined ? content : new Date().toISOString();
  fs.writeFileSync(donePath, body.endsWith('\n') ? body : `${body}\n`);
}
