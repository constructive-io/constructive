/**
 * Reading a build off disk.
 *
 * Node-only and loaded lazily, so the package stays usable in a browser (a UI
 * that already holds the built files in memory passes them directly instead of
 * a directory path).
 */

import type { DeployFile } from './types';
import { DeployError } from './types';

/**
 * Yield every file under `dir` with its POSIX path relative to `dir`.
 *
 * Dotfiles are included: a static build legitimately ships `.well-known/…`,
 * and dropping files by a rule the caller cannot see is how a deploy silently
 * loses a route. Use `ignore` to exclude paths explicitly.
 */
export async function* walkDirectory(
  dir: string,
  ignore?: (path: string) => boolean,
): AsyncGenerator<DeployFile> {
  const { readdir, readFile } = await loadFs();
  const { join, posix } = await loadPath();

  async function* walk(absolute: string, prefix: string): AsyncGenerator<DeployFile> {
    const entries = await readdir(absolute, { withFileTypes: true });
    for (const entry of entries) {
      const logical = prefix ? posix.join(prefix, entry.name) : entry.name;
      if (ignore?.(logical)) continue;
      const child = join(absolute, entry.name);
      if (entry.isDirectory()) {
        yield* walk(child, logical);
        continue;
      }
      // Symlinks to files are followed by readFile; anything that is neither a
      // file nor a directory (socket, fifo) has no meaning in a static site.
      if (!entry.isFile() && !entry.isSymbolicLink()) continue;
      yield { path: logical, bytes: new Uint8Array(await readFile(child)) };
    }
  }

  yield* walk(dir, '');
}

async function loadFs() {
  try {
    return await import('fs/promises');
  } catch (err) {
    throw new DeployError(
      'INVALID_PATH',
      'Deploying from a directory path requires Node; pass the files directly instead',
      err,
    );
  }
}

async function loadPath() {
  return import('path');
}
