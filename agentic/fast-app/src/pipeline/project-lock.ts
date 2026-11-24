// One build or verify at a time per project. Two pipeline runs, or a
// verify_app during a build, would provision, seed, restart the dev server
// and commit over each other. A chat's database check takes the same lock, so
// it never runs beside a build, and a build that comes while one runs waits
// for it rather than reporting a build that isn't there.

import path from 'node:path';

/** What holds a project's lock: a build or verify, or a database check, and when it lets go. */
export type LockHolder = { kind: 'build' | 'check'; released: Promise<void> };

export class ProjectLocks {
  private held = new Map<string, LockHolder>();

  private listeners = new Set<(projectDir: string) => void>();

  /** Calls `listener` with the project's folder each time its lock is taken or let go. */
  onChange(listener: (projectDir: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed(projectDir: string): void {
    for (const listener of this.listeners) listener(projectDir);
  }

  /** Takes the project's lock and returns its release, or null when it's held. */
  acquire(projectDir: string, kind: LockHolder['kind'] = 'build'): (() => void) | null {
    const key = path.resolve(projectDir);
    if (this.held.has(key)) return null;
    let resolve = () => {};
    const released = new Promise<void>((done) => {
      resolve = done;
    });
    this.held.set(key, { kind, released });
    this.changed(projectDir);
    let done = false;
    return () => {
      if (done) return;
      done = true;
      this.held.delete(key);
      resolve();
      this.changed(projectDir);
    };
  }

  holder(projectDir: string): LockHolder | undefined {
    return this.held.get(path.resolve(projectDir));
  }
}

// A check holds the lock as long as the backend takes to answer.
export const CHECK_WAIT_MS = 30_000;

/**
 * The lock for a build or verify: at once, or once the database checks that
 * hold it end, waiting up to `waitMs` in all. 'check' when a check still holds
 * it then, 'build' when a build or verify does, 'stopped' when the call was
 * stopped while it waited.
 */
export async function acquireForBuild(
  locks: ProjectLocks,
  projectDir: string,
  { waitMs = CHECK_WAIT_MS, signal }: { waitMs?: number; signal?: AbortSignal } = {},
): Promise<(() => void) | 'check' | 'build' | 'stopped'> {
  const deadline = Date.now() + waitMs;
  for (;;) {
    const release = locks.acquire(projectDir);
    if (release) return release;
    const holder = locks.holder(projectDir);
    if (holder?.kind !== 'check') return 'build';
    const left = deadline - Date.now();
    if (left <= 0) return 'check';
    const ended = await endsWithin(holder.released, left, signal);
    if (ended !== 'released') return ended;
  }
}

async function endsWithin(
  released: Promise<void>,
  ms: number,
  signal: AbortSignal | undefined,
): Promise<'released' | 'check' | 'stopped'> {
  if (signal?.aborted) return 'stopped';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort = () => {};
  const timeout = new Promise<'check' | 'stopped'>((resolve) => {
    timer = setTimeout(resolve, ms, 'check');
    onAbort = () => resolve('stopped');
    signal?.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([released.then(() => 'released' as const), timeout]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
