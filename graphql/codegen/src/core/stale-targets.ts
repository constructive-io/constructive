/**
 * Ownership manifest handling and stale generated-target cleanup.
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';

import { GENERATED_FILES_MANIFEST, type GeneratedFileWriteJob } from './output';

/** Manifest file listing generated target names, written to the output root. */
export const TARGETS_MANIFEST = '.targets';

function isSafeTargetName(target: unknown): target is string {
  return (
    typeof target === 'string' &&
    target.length > 0 &&
    target !== '.' &&
    target !== '..' &&
    !path.isAbsolute(target) &&
    !target.includes('/') &&
    !target.includes('\\') &&
    !target.includes('\0')
  );
}

function readTargetNamesManifest(outputRoot: string): string[] | null {
  const manifestPath = path.join(outputRoot, TARGETS_MANIFEST);
  if (!fs.existsSync(manifestPath)) return null;
  const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (
    !Array.isArray(parsed) ||
    !parsed.every(isSafeTargetName) ||
    new Set(parsed).size !== parsed.length
  ) {
    throw new Error(`Invalid target ownership manifest: ${manifestPath}`);
  }
  return parsed;
}

export function getStaleTargetWriteJobs(
  outputRoot: string,
  currentTargetNames: string[],
): GeneratedFileWriteJob[] {
  if (!currentTargetNames.every(isSafeTargetName)) {
    throw new Error('Target names must be single safe path segments.');
  }
  const previousTargets = readTargetNamesManifest(outputRoot);
  if (!previousTargets) return [];
  const current = new Set(currentTargetNames);
  const jobs: GeneratedFileWriteJob[] = [];

  for (const target of previousTargets) {
    if (current.has(target)) continue;
    const targetDir = path.join(outputRoot, target);
    if (!fs.existsSync(targetDir)) continue;
    if (fs.lstatSync(targetDir).isSymbolicLink()) {
      throw new Error(
        `Refusing to clean a symbolic-link target directory: ${targetDir}`,
      );
    }
    const generatedManifest = path.join(targetDir, GENERATED_FILES_MANIFEST);
    // Legacy empty/unmanaged directories are preserved. Only a writer-owned
    // target can participate in the transactional cleanup plan.
    if (!fs.existsSync(generatedManifest)) continue;
    jobs.push({
      files: [],
      outputDir: targetDir,
      options: {
        pruneStaleFiles: true,
        removeManifestWhenEmpty: true,
        showProgress: false,
      },
    });
  }
  return jobs;
}

function removeEmptyDirectoryTree(directory: string): void {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      removeEmptyDirectoryTree(path.join(directory, entry.name));
    }
  }
  try {
    fs.rmdirSync(directory);
  } catch {
    // Files or non-empty child directories are unowned and must survive.
  }
}

/**
 * Remove stale generated target directories from `outputRoot`.
 * Reads the `.targets` manifest (written by `generateMulti`) to know which
 * directories were previously generated. Only those are eligible for removal;
 * hand-written directories (e.g. `config/`, `utils/`) are never touched.
 * Returns the list of directory names that were removed.
 *
 * @deprecated Use generateMulti({ cleanStaleTargets: true }), which plans this
 * cleanup and commits it with the rest of the generation operation.
 */
export function removeStaleTargetDirs(
  outputRoot: string,
  currentTargetNames: string[],
  verbose?: boolean,
): string[] {
  const removed: string[] = [];
  if (!fs.existsSync(outputRoot)) return removed;

  const manifestPath = path.join(outputRoot, TARGETS_MANIFEST);
  if (!fs.existsSync(manifestPath)) return removed;

  let previousTargets: string[];
  try {
    previousTargets = readTargetNamesManifest(outputRoot) ?? [];
  } catch {
    return removed;
  }

  if (!currentTargetNames.every(isSafeTargetName)) return removed;

  const currentTargets = new Set(currentTargetNames);
  const staleTargets = previousTargets.filter((t) => !currentTargets.has(t));

  for (const target of staleTargets) {
    const dirPath = path.join(outputRoot, target);
    if (!fs.existsSync(dirPath)) continue;
    if (fs.lstatSync(dirPath).isSymbolicLink()) continue;

    const entries = fs.readdirSync(dirPath);
    if (entries.length === 0) {
      fs.rmdirSync(dirPath);
      removed.push(target);
      if (verbose) {
        console.log(`Removed stale target directory: ${target}`);
      }
      continue;
    }

    const generatedManifestPath = path.join(dirPath, GENERATED_FILES_MANIFEST);
    if (!fs.existsSync(generatedManifestPath)) continue;

    let ownedFiles: Record<string, { sha256: string }>;
    try {
      const generatedManifest = JSON.parse(
        fs.readFileSync(generatedManifestPath, 'utf8'),
      ) as { files?: Record<string, { sha256?: unknown }> };
      if (
        !generatedManifest.files ||
        typeof generatedManifest.files !== 'object'
      ) {
        continue;
      }
      ownedFiles = Object.fromEntries(
        Object.entries(generatedManifest.files).map(([filePath, entry]) => {
          if (
            !entry ||
            typeof entry.sha256 !== 'string' ||
            !/^[a-f0-9]{64}$/.test(entry.sha256) ||
            path.isAbsolute(filePath) ||
            filePath.includes('\\') ||
            filePath
              .split('/')
              .some(
                (segment) =>
                  segment === '' || segment === '.' || segment === '..',
              )
          ) {
            throw new Error('Invalid generated manifest');
          }
          return [filePath, { sha256: entry.sha256 }];
        }),
      );
    } catch {
      continue;
    }

    const ownedPaths = Object.entries(ownedFiles).map(([filePath, entry]) => ({
      absolutePath: path.join(dirPath, ...filePath.split('/')),
      sha256: entry.sha256,
    }));
    const modifiedOwnedFile = ownedPaths.some(({ absolutePath, sha256 }) => {
      if (!fs.existsSync(absolutePath)) return false;
      return (
        createHash('sha256')
          .update(fs.readFileSync(absolutePath))
          .digest('hex') !== sha256
      );
    });
    if (modifiedOwnedFile) continue;

    for (const { absolutePath } of ownedPaths) {
      fs.rmSync(absolutePath, { force: true });
    }
    fs.rmSync(generatedManifestPath, { force: true });
    removeEmptyDirectoryTree(dirPath);
    if (!fs.existsSync(dirPath)) {
      removed.push(target);
      if (verbose) {
        console.log(`Removed stale target directory: ${target}`);
      }
    }
  }
  return removed;
}
