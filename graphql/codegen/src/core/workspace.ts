/**
 * Workspace detection utilities
 *
 * Finds the root of a workspace by walking up directories looking for
 * workspace markers (pnpm-workspace.yaml, lerna.json, package.json with workspaces).
 * Falls back to the nearest package.json directory.
 *
 * Inspired by @pgpmjs/env walkUp / resolvePnpmWorkspace patterns.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, parse as parsePath } from 'node:path';

/**
 * Walk up directories from startDir looking for a file.
 * Returns the directory containing the file, or null if not found.
 */
function walkUp(startDir: string, filename: string): string | null {
  let currentDir = resolve(startDir);

  while (currentDir) {
    const targetPath = resolve(currentDir, filename);
    if (existsSync(targetPath)) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

/**
 * Find the first pnpm workspace root by looking for pnpm-workspace.yaml
 */
function findPnpmWorkspace(cwd: string): string | null {
  return walkUp(cwd, 'pnpm-workspace.yaml');
}

/**
 * Find the first lerna workspace root by looking for lerna.json
 */
function findLernaWorkspace(cwd: string): string | null {
  return walkUp(cwd, 'lerna.json');
}

/**
 * Find the first npm/yarn workspace root by looking for package.json with workspaces field
 */
function findNpmWorkspace(cwd: string): string | null {
  let currentDir = resolve(cwd);
  const root = parsePath(currentDir).root;

  while (currentDir !== root) {
    const packageJsonPath = resolve(currentDir, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.workspaces) {
          return currentDir;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
    currentDir = dirname(currentDir);
  }
  return null;
}

/**
 * Find the nearest package.json directory (fallback)
 */
function findPackageRoot(cwd: string): string | null {
  return walkUp(cwd, 'package.json');
}

/**
 * Find the workspace root directory.
 *
 * Search order:
 * 1. pnpm-workspace.yaml (pnpm workspaces)
 * 2. lerna.json (lerna workspaces)
 * 3. package.json with "workspaces" field (npm/yarn workspaces)
 * 4. Nearest package.json (fallback for non-workspace projects)
 *
 * @param cwd - Starting directory to search from (defaults to process.cwd())
 * @returns The workspace root path, or null if nothing found
 */
export function findWorkspaceRoot(cwd: string = process.cwd()): string | null {
  return (
    findPnpmWorkspace(cwd) ??
    findLernaWorkspace(cwd) ??
    findNpmWorkspace(cwd) ??
    findPackageRoot(cwd)
  );
}
