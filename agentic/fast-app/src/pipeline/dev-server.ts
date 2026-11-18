// Desktop-managed dev servers for generated apps: one per app directory, on a
// free port, owned by the desktop process. They stop when their project is
// deleted or the app quits.

import { killTree } from './command';
import { type DevProcess, exitOf, reapGroups, startDevProcess, writePids } from './dev-process';
import { freePort } from './dev-server-port';
import { sleep } from './transient';

const KILL_GRACE_MS = 3_000;
const PORT_RELEASE_WAIT_MS = 5_000;

export type DevServerInfo = { url: string; port: number; reused: boolean };

export type EnsureOptions = {
  preferredPort?: number;
  signal?: AbortSignal;
  /**
   * A fresh server on the same port. Next can miss route folders written while
   * it runs (gen writes many at once and clears .next/dev/types); a new server
   * reads them all, and reuses the compile cache the old one left.
   */
  fresh?: boolean;
};

/** A spawned dev server, and its start's answer: the URL, or why this start never got one. */
type Started = { server: DevProcess; ready: Promise<string> };

/**
 * One app's dev server: `claiming` a port, then `starting`, then `running`. A
 * failed or stopped slot leaves the map. Each step after an await checks that
 * its `generation` still owns the slot, so a replaced start can't undo a stop.
 */
type Slot =
  | { state: 'claiming'; generation: number; claim: Promise<Started> }
  | { state: 'starting'; generation: number; started: Started }
  | { state: 'running'; generation: number; started: Started; url: string };

/** Why a start that was claimed never answered. */
export class DevServerStopped extends Error {
  constructor() {
    super('The dev server was stopped before it was ready.');
  }
}

export type DevServerDeps = {
  /** A free port; the tests hold it back to stop a start mid-claim. */
  freePort: (preferred?: number, waitMs?: number) => Promise<number>;
};

export class DevServerManager {
  private slots = new Map<string, Slot>();

  /** The output of each app's last start that failed, for the agent to read. */
  private failedLogs = new Map<string, string>();

  private generation = 0;

  private readonly pidFile: string | undefined;

  private readonly deps: DevServerDeps;

  constructor(pidFile?: string, deps: Partial<DevServerDeps> = {}) {
    this.pidFile = pidFile;
    this.deps = { freePort, ...deps };
  }

  /** Stops dev servers a previous desktop process left running. */
  reapOrphans(): void {
    if (!this.pidFile) return;
    reapGroups(this.pidFile);
    this.savePids();
  }

  private savePids(): void {
    if (!this.pidFile) return;
    const pids: Record<string, number> = {};
    for (const [appDir, slot] of this.slots) {
      const pid = slot.state === 'claiming' ? undefined : slot.started.server.child.pid;
      if (pid) pids[appDir] = pid;
    }
    writePids(this.pidFile, pids);
  }

  private owns(appDir: string, generation: number): boolean {
    return this.slots.get(appDir)?.generation === generation;
  }

  url(appDir: string): string | null {
    const slot = this.slots.get(appDir);
    return slot?.state === 'running' ? slot.url : null;
  }

  /**
   * The port the app's dev server holds, waiting for a start in progress to
   * pick it but not for the server to answer; null when none runs. The
   * Preview's origin carries it, and the database must allow that origin.
   */
  async port(appDir: string): Promise<number | null> {
    const slot = this.slots.get(appDir);
    if (!slot) return null;
    if (slot.state !== 'claiming') return slot.started.server.port;
    const started = await slot.claim.catch((): null => null);
    return started && this.owns(appDir, slot.generation) ? started.server.port : null;
  }

  /** Whether the app's dev server runs, is starting, or is stopped; its URL once it runs. */
  status(appDir: string): { state: 'running' | 'starting' | 'stopped'; url: string | null } {
    const slot = this.slots.get(appDir);
    if (!slot) return { state: 'stopped', url: null };
    return slot.state === 'running'
      ? { state: 'running', url: slot.url }
      : { state: 'starting', url: null };
  }

  /** What the app's dev server printed: the live one's, else its last failed start's. */
  log(appDir: string): string {
    const slot = this.slots.get(appDir);
    if (slot && slot.state !== 'claiming') return slot.started.server.log;
    return this.failedLogs.get(appDir) ?? '';
  }

  /**
   * Starts the app's dev server, or joins the one already running or starting.
   * `fresh` replaces a server that has spawned, since it may have missed files
   * written since; a start still claiming its port spawns after them and is joined.
   */
  async ensure(appDir: string, options: EnsureOptions = {}): Promise<DevServerInfo> {
    const current = this.slots.get(appDir);
    if (current && (!options.fresh || current.state === 'claiming')) {
      return this.answer(current, options.signal, true);
    }
    const slot = this.claim(appDir, options, current);
    const onAbort = () => {
      if (this.owns(appDir, slot.generation)) this.stop(appDir);
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      return await this.answer(slot, options.signal, false);
    } finally {
      options.signal?.removeEventListener('abort', onAbort);
    }
  }

  private async answer(
    slot: Slot,
    signal: AbortSignal | undefined,
    reused: boolean,
  ): Promise<DevServerInfo> {
    const started = await untilAborted(startedOf(slot), signal);
    const url = await untilAborted(started.ready, signal);
    return { url, port: started.server.port, reused };
  }

  /** Claims the slot before any await: a caller during the port wait joins this start. */
  private claim(appDir: string, options: EnsureOptions, replaced: Slot | undefined): Slot {
    const generation = ++this.generation;
    const old = replaced && replaced.state !== 'claiming' ? replaced.started.server : undefined;
    if (replaced) this.discard(appDir, 'SIGKILL');
    this.failedLogs.delete(appDir);
    const claim = (async () => {
      let preferredPort = options.preferredPort;
      let portWaitMs = 0;
      // A fresh start keeps the old server's port, which its children can hold
      // a moment after the kill; anything else takes another port at once.
      if (old) {
        await Promise.race([exitOf(old.child), sleep(KILL_GRACE_MS)]);
        preferredPort = old.port;
        portWaitMs = PORT_RELEASE_WAIT_MS;
      }
      const port = await this.deps.freePort(preferredPort, portWaitMs);
      if (!this.owns(appDir, generation)) throw new DevServerStopped();
      const started = this.start(appDir, port, generation);
      this.slots.set(appDir, { state: 'starting', generation, started });
      this.savePids();
      return started;
    })();
    // A claim that fails (no port, a spawn that throws) frees the slot for the
    // next start; the handler also keeps an unawaited claim from going unhandled.
    claim.catch(() => {
      if (this.owns(appDir, generation)) this.slots.delete(appDir);
    });
    const slot: Slot = { state: 'claiming', generation, claim };
    this.slots.set(appDir, slot);
    return slot;
  }

  /** Spawns the server; while this start owns the slot, it moves by what the server reports. */
  private start(appDir: string, port: number, generation: number): Started {
    const server = startDevProcess(appDir, port);
    const ready = server.ready.then(
      (url) => {
        if (!this.owns(appDir, generation)) throw new DevServerStopped();
        this.slots.set(appDir, { state: 'running', generation, started, url });
        return url;
      },
      (err: Error) => {
        if (!this.owns(appDir, generation)) throw new DevServerStopped();
        this.fail(appDir, server);
        throw err;
      },
    );
    const started: Started = { server, ready };
    // A server that ran and then exits leaves its slot for the next start. The
    // rejection handler also keeps a `ready` no caller awaits from going unhandled.
    ready.then(
      () =>
        exitOf(server.child).then(() => {
          if (this.owns(appDir, generation)) this.fail(appDir, server);
        }),
      () => {},
    );
    return started;
  }

  /** Ends the app's slot after a failure, keeping what the server printed. */
  private fail(appDir: string, server: DevProcess): void {
    this.failedLogs.set(appDir, server.log);
    this.discard(appDir, 'SIGTERM');
  }

  private discard(appDir: string, signal: 'SIGTERM' | 'SIGKILL'): void {
    const slot = this.slots.get(appDir);
    if (!slot) return;
    this.slots.delete(appDir);
    this.savePids();
    if (slot.state === 'claiming') return;
    const { child } = slot.started.server;
    killTree(child.pid, signal);
    if (signal === 'SIGTERM') {
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) killTree(child.pid, 'SIGKILL');
      }, KILL_GRACE_MS).unref();
    }
  }

  /** Stops the app's dev server, or the start in progress, which then spawns nothing. */
  stop(appDir: string): void {
    this.discard(appDir, 'SIGTERM');
  }

  /** Stops every server whose app lives inside `projectDir`. */
  stopProject(projectDir: string): void {
    const prefix = projectDir.endsWith('/') ? projectDir : `${projectDir}/`;
    for (const appDir of [...this.slots.keys()]) {
      if (appDir === projectDir || appDir.startsWith(prefix)) this.stop(appDir);
    }
  }

  /** For quitting: no grace period, since nothing would be left to send SIGKILL later. */
  killAll(): void {
    for (const appDir of [...this.slots.keys()]) this.discard(appDir, 'SIGKILL');
  }
}

const startedOf = (slot: Slot): Promise<Started> =>
  slot.state === 'claiming' ? slot.claim : Promise.resolve(slot.started);

/** `promise`, or the signal's reason as soon as it aborts: an aborted caller stops waiting. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason ?? new DevServerStopped());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new DevServerStopped());
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      },
    );
  });
}
