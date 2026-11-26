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
 * The environment a test runs real bash in. PATH is the no-op launchers in
 * `root`, then /usr/bin and /bin; TMPDIR is a dir in `root`; HOME is `home`,
 * which the caller picks and which need not be in `root`; EDITOR, VISUAL,
 * PAGER and BROWSER are `true`. It is not a sandbox: a launcher shadows only
 * its name on PATH, so a command that names `/usr/bin/open` runs it, and a
 * command can reach any file the test process can.
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
  const r = spawnSync(bash, ['-c', `${script}\nprintf '\\n${END}\\n'`], { cwd: options.cwd, env: options.env, encoding: 'utf8', timeout: options.timeout ?? 30_000, killSignal: 'SIGKILL' });
  if (r.error || r.signal || !r.stdout.includes(`\n${END}\n`)) {
    const why = r.error?.message ?? (r.signal ? `it was killed by ${r.signal}` : `it exited ${r.status} before the ${END} marker`);
    throw new Error(`bash did not run the whole test script: ${why}. Check the script for a syntax error or an exit, or raise the timeout.\nstderr: ${r.stderr}`);
  }
  return r.stdout.slice(0, r.stdout.lastIndexOf(`\n${END}\n`));
}

/**
 * Run one command in bash in its own process group, and wait until every job
 * it left in the background has exited too. It must finish: a group the
 * timeout kills, or a bash a signal ends, is an error, not a finished run,
 * since its record is partial. A nonzero exit is a finished run.
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
    let timedOut = false;
    const kill = () => {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch {
        // The group is gone.
      }
    };
    const deadline = Date.now() + timeout;
    const timer = setTimeout(() => {
      timedOut = true;
      kill();
    }, timeout);
    child.on('exit', async (_code, signal) => {
      for (;;) {
        try {
          process.kill(-pid, 0);
        } catch {
          break;
        }
        if (Date.now() > deadline) {
          timedOut = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 5));
      }
      kill();
      clearTimeout(timer);
      if (timedOut) fail(new Error(`bash did not finish ${JSON.stringify(command)} within ${timeout} ms, so its record is partial. Check the command for a job that waits, or raise the timeout.`));
      else if (signal) fail(new Error(`bash was killed by ${signal} before it finished ${JSON.stringify(command)}, so its record is partial. Check the command for one that signals its own shell, or the machine for a process that kills test runs.`));
      else done();
    });
  });
}
