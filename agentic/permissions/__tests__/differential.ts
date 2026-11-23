import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * A seeded random source for the differential tests: mulberry32, with `int(n)`
 * from the high bits. It records which entry of each list it drew, so a test
 * can check that every entry came up.
 */
export function seeded(seed: number) {
  let state = seed | 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const drawn = new Map<readonly unknown[], Set<number>>();
  const int = (n: number): number => Math.floor(next() * n);
  const pick = <T>(list: readonly T[]): T => {
    const k = int(list.length);
    let seen = drawn.get(list);
    if (!seen) drawn.set(list, (seen = new Set()));
    seen.add(k);
    return list[k];
  };
  /** The entries of the named lists that were never drawn; a test expects none. */
  const undrawn = (lists: Record<string, readonly unknown[]>): string[] =>
    Object.entries(lists).flatMap(([name, list]) => list.flatMap((_, k) => (drawn.get(list)?.has(k) ? [] : [`${name}[${k}]`])));
  return { int, pick, undrawn };
}

/** Launchers a real tool could use to open an app, a browser or an editor; in the fence each one does nothing. */
const LAUNCHERS = ['open', 'xdg-open', 'osascript', 'gio', 'vi', 'vim', 'nano', 'emacs', 'less', 'more'];

/**
 * The environment a test runs real bash in: PATH starts with no-op launchers,
 * HOME and TMPDIR sit under `root`, and every editor and pager is `true`, so
 * nothing a case runs can open an app or touch files outside the test.
 */
export function fencedEnv(root: string, home: string, extra: Record<string, string> = {}): Record<string, string> {
  const shims = path.join(root, 'launchers');
  const tmp = path.join(root, 'tmp');
  mkdirSync(tmp, { recursive: true });
  mkdirSync(shims, { recursive: true });
  for (const name of LAUNCHERS) writeFileSync(path.join(shims, name), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const quiet = '/usr/bin/true';
  return { PATH: `${shims}:/usr/bin:/bin`, HOME: home, TMPDIR: tmp, EDITOR: quiet, VISUAL: quiet, PAGER: quiet, BROWSER: quiet, ...extra };
}

const END = '@END';

/**
 * Run a script in bash and return its stdout. The script must reach its end:
 * a run that fails to start, is killed, times out, or never prints the
 * `@END` marker after the script is an error, not an empty result.
 */
export function runBash(bash: string, script: string, options: { cwd: string; env: Record<string, string>; timeout?: number }): string {
  const r = spawnSync(bash, ['-c', `${script}\nprintf '\\n${END}\\n'`], { cwd: options.cwd, env: options.env, encoding: 'utf8', timeout: options.timeout ?? 30_000 });
  if (r.error || r.signal || !r.stdout.includes(`\n${END}\n`)) {
    const why = r.error?.message ?? (r.signal ? `it was killed by ${r.signal}` : `it exited ${r.status} before the ${END} marker`);
    throw new Error(`bash did not run the whole test script: ${why}. Check the script for a syntax error or an exit, or raise the timeout.\nstderr: ${r.stderr}`);
  }
  return r.stdout.slice(0, r.stdout.lastIndexOf(`\n${END}\n`));
}

/**
 * Run one command in bash in its own process group, and wait until every job
 * it left in the background has exited too, or the timeout kills the group.
 */
export function runInGroup(bash: string, command: string, options: { cwd: string; env: Record<string, string>; timeout?: number }): Promise<void> {
  const timeout = options.timeout ?? 3000;
  return new Promise((done, fail) => {
    const child = spawn(bash, ['-c', command], { cwd: options.cwd, env: options.env, detached: true, stdio: 'ignore' });
    const { pid } = child;
    if (pid === undefined) {
      child.on('error', (error) => fail(new Error(`bash did not start: ${error.message}. Check that ${bash} exists.`)));
      return;
    }
    const kill = () => {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch {
        // The group is gone.
      }
    };
    const deadline = Date.now() + timeout;
    const timer = setTimeout(kill, timeout);
    child.on('exit', async () => {
      for (;;) {
        try {
          process.kill(-pid, 0);
        } catch {
          break;
        }
        if (Date.now() > deadline) break;
        await new Promise((r) => setTimeout(r, 5));
      }
      kill();
      clearTimeout(timer);
      done();
    });
  });
}
