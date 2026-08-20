import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { GENERATED_FILES_MANIFEST } from './types';

export function hashContent(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function isPathInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

/**
 * Resolve an output directory through the deepest existing ancestor. This lets
 * an explicitly symlinked cwd/output root work while giving all descendant
 * containment checks one canonical boundary.
 */
export function canonicalizeOutputDir(outputDir: string): string {
  const absolute = path.resolve(outputDir);
  const missingSegments: string[] = [];
  let existing = absolute;

  while (true) {
    try {
      fs.lstatSync(existing);
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw error;
      const parent = path.dirname(existing);
      if (parent === existing) throw error;
      missingSegments.unshift(path.basename(existing));
      existing = parent;
    }
  }

  const canonicalAncestor = fs.realpathSync.native(existing);
  const existingStat = fs.statSync(canonicalAncestor);
  if (missingSegments.length === 0 && !existingStat.isDirectory()) {
    throw new Error(`Generated output path is not a directory: ${absolute}`);
  }
  return path.join(canonicalAncestor, ...missingSegments);
}

/** Refuse any symlink below the canonical output root. */
export function assertContainedPath(
  outputDir: string,
  candidate: string,
): void {
  if (!isPathInside(outputDir, candidate)) {
    throw new Error(`Generated file escapes output directory: ${candidate}`);
  }

  let current = candidate;
  while (current !== outputDir) {
    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
        throw new Error(
          `Generated file path traverses a symlink below the output directory: ${current}`,
        );
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Generated file escapes output directory: ${candidate}`);
    }
    current = parent;
  }
}

export function normalizeRelativePath(filePath: string): string {
  if (!filePath || path.isAbsolute(filePath)) {
    throw new Error(`Generated file path must be relative: ${filePath}`);
  }

  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  if (
    segments.some(
      (segment) => segment === '' || segment === '.' || segment === '..',
    )
  ) {
    throw new Error(`Generated file path is unsafe: ${filePath}`);
  }

  const relativePath = path.posix.normalize(normalized);
  if (
    relativePath === GENERATED_FILES_MANIFEST ||
    relativePath.startsWith('../')
  ) {
    throw new Error(`Generated file path is reserved or unsafe: ${filePath}`);
  }

  return relativePath;
}

export function removeEmptyParents(startDir: string, stopDir: string): void {
  let current = startDir;
  while (current !== stopDir && current.startsWith(`${stopDir}${path.sep}`)) {
    try {
      fs.rmdirSync(current);
    } catch {
      return;
    }
    current = path.dirname(current);
  }
}
