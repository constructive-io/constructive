import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import { hostname } from 'node:os';
import * as path from 'node:path';

import { getAbortReason, throwIfAborted } from '../cancellation';

const LOCK_TIMEOUT_MS = 30_000;
const LOCK_RETRY_MS = 25;
const OWNER_FILENAME = 'owner.json';
const REAPER_FILENAME = '.reaper';

interface LockOwner {
  token: string;
  pid: number;
  hostname: string;
  createdAt: string;
}

export interface OutputLockSet {
  release(): Promise<void>;
}

const waitForRetry = async (
  milliseconds: number,
  signal?: AbortSignal
): Promise<void> => {
  throwIfAborted(signal);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, milliseconds);
    const handleAbort = () => {
      clearTimeout(timer);
      reject(getAbortReason(signal!));
    };
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
};

const lockPathFor = (outputDir: string): string =>
  path.join(
    path.dirname(outputDir),
    `.${path.basename(outputDir) || 'root'}.constructive-codegen.lock`
  );

const readOwner = (lockPath: string): LockOwner | undefined => {
  try {
    const owner = JSON.parse(
      fs.readFileSync(path.join(lockPath, OWNER_FILENAME), 'utf8')
    ) as Partial<LockOwner>;
    if (
      typeof owner.token !== 'string' ||
      typeof owner.pid !== 'number' ||
      typeof owner.hostname !== 'string' ||
      typeof owner.createdAt !== 'string'
    ) {
      return undefined;
    }
    return owner as LockOwner;
  } catch {
    return undefined;
  }
};

const processIsAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
};

const reclaimDeadLock = (lockPath: string, expected: LockOwner): boolean => {
  if (expected.hostname !== hostname() || processIsAlive(expected.pid)) {
    return false;
  }

  const reaperPath = path.join(lockPath, REAPER_FILENAME);
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(reaperPath, 'wx', 0o600);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'EEXIST') return false;
    throw error;
  }

  let reclaimed = false;
  let failure: unknown;
  try {
    const current = readOwner(lockPath);
    if (current && current.token === expected.token) {
      fs.unlinkSync(path.join(lockPath, OWNER_FILENAME));
      fs.closeSync(descriptor);
      descriptor = undefined;
      fs.unlinkSync(reaperPath);
      fs.rmdirSync(lockPath);
      reclaimed = true;
    }
  } catch (error) {
    failure = error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try {
      fs.unlinkSync(reaperPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        failure ??= error;
      }
    }
  }
  if (failure !== undefined) throw failure;
  return reclaimed;
};

const tryCreateLock = (lockPath: string, owner: LockOwner): boolean => {
  const candidate = `${lockPath}.${owner.token}.tmp`;
  fs.mkdirSync(candidate, { recursive: false, mode: 0o700 });
  try {
    fs.writeFileSync(
      path.join(candidate, OWNER_FILENAME),
      `${JSON.stringify(owner)}\n`,
      { encoding: 'utf8', mode: 0o600 }
    );
    try {
      fs.renameSync(candidate, lockPath);
      return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EEXIST' || code === 'ENOTEMPTY' || code === 'EPERM') {
        return false;
      }
      throw error;
    }
  } finally {
    fs.rmSync(candidate, { recursive: true, force: true });
  }
};

const releaseLock = (lockPath: string, token: string): void => {
  const owner = readOwner(lockPath);
  if (!owner || owner.token !== token) {
    throw new Error(`Generated output lock ownership changed: ${lockPath}`);
  }
  fs.unlinkSync(path.join(lockPath, OWNER_FILENAME));
  fs.rmdirSync(lockPath);
};

const acquireLock = async (
  outputDir: string,
  signal?: AbortSignal
): Promise<() => void> => {
  const lockPath = lockPathFor(outputDir);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const owner: LockOwner = {
    token: randomUUID(),
    pid: process.pid,
    hostname: hostname(),
    createdAt: new Date().toISOString(),
  };
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (true) {
    throwIfAborted(signal);
    const stat = fs.lstatSync(lockPath, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink()) {
      throw new Error(`Refusing symbolic-link output lock: ${lockPath}`);
    }
    if (!stat && tryCreateLock(lockPath, owner)) {
      return () => releaseLock(lockPath, owner.token);
    }

    const existing = readOwner(lockPath);
    if (existing && reclaimDeadLock(lockPath, existing)) continue;
    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out waiting for generated output lock: ${lockPath}`
      );
    }
    await waitForRetry(LOCK_RETRY_MS, signal);
  }
};

export async function acquireOutputLocks(
  outputDirs: readonly string[],
  signal?: AbortSignal
): Promise<OutputLockSet> {
  const releases: Array<() => void> = [];
  try {
    for (const outputDir of [...new Set(outputDirs)].sort()) {
      releases.push(await acquireLock(outputDir, signal));
    }
  } catch (error) {
    for (const release of releases.reverse()) release();
    throw error;
  }

  return {
    async release(): Promise<void> {
      for (const release of releases.reverse()) release();
    },
  };
}
