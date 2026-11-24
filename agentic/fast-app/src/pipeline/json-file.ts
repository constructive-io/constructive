import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    const backup = `${filePath}.corrupt.${Date.now()}.bak`;
    try {
      await fs.rename(filePath, backup);
      console.warn(`[json-file] corrupt JSON at ${filePath}; backed up to ${backup}`, err);
    } catch (backupErr) {
      console.warn(`[json-file] corrupt JSON at ${filePath}; backup failed`, backupErr);
    }
    return fallback;
  }
}

async function writeAtomic(filePath: string, payload: string, mode?: number): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${randomUUID()}`;
  await fs.writeFile(tmp, payload, { encoding: 'utf-8', ...(mode === undefined ? {} : { mode }) });
  try {
    await fs.rename(tmp, filePath);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
}

// Per-file write queue. Concurrent writes to the same file otherwise race: each
// caller serializes its own in-memory snapshot, and whichever rename lands last
// wins — so a stale snapshot (e.g. a `touch` taken before an auto-title rename)
// can silently overwrite a newer one. Chaining writes per path makes them apply
// in call order, so the final on-disk state always reflects the latest snapshot.
const writeChains = new Map<string, Promise<void>>();

/** `mode` sets the file's permissions, e.g. 0o600 for a file only this user may read. */
export function writeJsonFileAtomic(
  filePath: string,
  data: unknown,
  { mode }: { mode?: number } = {},
): Promise<void> {
  const key = path.resolve(filePath);
  const payload = JSON.stringify(data, null, 2);
  const run = (writeChains.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(() => writeAtomic(filePath, payload, mode));
  writeChains.set(key, run);
  void run.finally(() => {
    if (writeChains.get(key) === run) writeChains.delete(key);
  });
  return run;
}
