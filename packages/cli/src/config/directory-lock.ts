import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import { hostname } from 'node:os';
import * as path from 'node:path';

const OWNER_FILENAME = 'owner.json';
const REAPER_FILENAME = '.reaper';

interface LockOwner {
  token: string;
  pid: number;
  hostname: string;
  createdAt: number;
}

export class DirectoryLockTimeoutError extends Error {
  readonly name = 'DirectoryLockTimeoutError';
}

export interface DirectoryLockOptions {
  lockPath: string;
  timeoutMs: number;
  staleMs: number;
  retryMs: number;
  assertSafePath(path: string): void;
}

const sleepSync = (milliseconds: number): void => {
  const array = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(array, 0, 0, milliseconds);
};

const readOwner = (lockPath: string): LockOwner | undefined => {
  try {
    const owner = JSON.parse(
      fs.readFileSync(path.join(lockPath, OWNER_FILENAME), 'utf8')
    ) as Partial<LockOwner>;
    if (
      typeof owner.token !== 'string' ||
      typeof owner.pid !== 'number' ||
      typeof owner.hostname !== 'string' ||
      typeof owner.createdAt !== 'number'
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

const createCandidate = (lockPath: string, owner: LockOwner): boolean => {
  const candidate = `${lockPath}.${owner.token}.tmp`;
  fs.mkdirSync(candidate, { mode: 0o700 });
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(
      path.join(candidate, OWNER_FILENAME),
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
      0o600
    );
    fs.writeFileSync(descriptor, `${JSON.stringify(owner)}\n`, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    try {
      fs.renameSync(candidate, lockPath);
      return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (
        code === 'EEXIST' ||
        code === 'ENOTEMPTY' ||
        code === 'ENOTDIR' ||
        code === 'EPERM'
      ) {
        return false;
      }
      throw error;
    }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    fs.rmSync(candidate, { recursive: true, force: true });
  }
};

const reclaimDeadOwner = (lockPath: string, expected: LockOwner): boolean => {
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
    if (
      current &&
      current.token === expected.token &&
      !processIsAlive(current.pid)
    ) {
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

const release = (lockPath: string, token: string): void => {
  const owner = readOwner(lockPath);
  if (!owner || owner.token !== token) {
    throw new Error(`Configuration lock ownership changed: ${lockPath}`);
  }
  fs.unlinkSync(path.join(lockPath, OWNER_FILENAME));
  fs.rmdirSync(lockPath);
};

export function withDirectoryLock<T>(
  options: DirectoryLockOptions,
  operation: () => T
): T {
  const deadline = Date.now() + options.timeoutMs;
  const owner: LockOwner = {
    token: randomUUID(),
    pid: process.pid,
    hostname: hostname(),
    createdAt: Date.now(),
  };

  while (true) {
    options.assertSafePath(options.lockPath);
    let stat: fs.Stats | undefined;
    try {
      stat = fs.lstatSync(options.lockPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (!stat && createCandidate(options.lockPath, owner)) break;

    const existing = stat?.isDirectory()
      ? readOwner(options.lockPath)
      : undefined;
    if (
      existing &&
      Date.now() - existing.createdAt > options.staleMs &&
      reclaimDeadOwner(options.lockPath, existing)
    ) {
      continue;
    }
    if (Date.now() >= deadline) {
      throw new DirectoryLockTimeoutError(
        `Timed out waiting for lock: ${options.lockPath}`
      );
    }
    sleepSync(Math.min(options.retryMs, Math.max(1, deadline - Date.now())));
  }

  try {
    return operation();
  } finally {
    release(options.lockPath, owner.token);
  }
}
