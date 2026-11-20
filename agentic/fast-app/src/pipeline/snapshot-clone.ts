// A project's own app: a copy of the golden snapshot in `packages/app`, then
// the frozen install from its own lockfile. The copy lands in a partial folder
// that is renamed into place only once it is whole, so the compose marker in
// `packages/app` always means a complete app.

import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, realpath, rename, rm } from 'node:fs/promises';
import path from 'node:path';

import {
  COMPOSE_MARKER,
  ensureComposedInstall,
  type RunCommand,
} from '@agentic-kit/db-tools/app-workspace';
import { simpleGit } from 'simple-git';

import { outputTail, runCommand } from './command';
import { fallbackIdentityArgs } from './fallback-identity';
import { stageGitPaths } from './git-paths';

export { COMPOSE_MARKER };

const INSTALL_TIMEOUT_MS = 5 * 60_000;
const PARTIAL_PREFIX = '.app.partial-';

export function appDirOf(projectDir: string): string {
  return path.join(projectDir, 'packages', 'app');
}

export function isComposed(appDir: string): boolean {
  return existsSync(path.join(appDir, COMPOSE_MARKER));
}

// The project folder is the user's: a copy for a project deleted meanwhile
// must not bring it back, so it is checked after each wait and never created
// here.
export async function cloneApp(
  projectDir: string,
  snapshotDir: () => Promise<string>,
  signal: AbortSignal,
  /** Called once the copied template is committed. */
  onTemplateCommitted?: () => void,
): Promise<void> {
  const appDir = appDirOf(projectDir);
  const stillThere = () => {
    signal.throwIfAborted();
    if (!existsSync(projectDir)) throw new Error(`${projectDir} is gone; the app was not copied.`);
  };
  stillThere();
  if (!isComposed(appDir)) {
    if (existsSync(appDir)) {
      throw new Error(`${appDir} already exists and is not a composed app; it was left alone.`);
    }
    const source = await snapshotDir();
    stillThere();
    const packages = path.dirname(appDir);
    await mkdir(packages).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'EEXIST') throw err;
    });
    // A copy a crashed desktop left behind is never renamed into place.
    for (const name of await readdir(packages)) {
      if (name.startsWith(PARTIAL_PREFIX)) {
        await rm(path.join(packages, name), { recursive: true, force: true });
      }
    }
    const partial = path.join(packages, `${PARTIAL_PREFIX}${process.pid}`);
    try {
      await cloneTree(source, partial, signal);
      stillThere();
      await rename(partial, appDir);
    } catch (err) {
      await rm(partial, { recursive: true, force: true });
      throw err;
    }
  }
  // Composed, then committed, then installed. The commit runs on every pass,
  // and commits only while git doesn't track the app: a copy whose commit a
  // quit or a git error cut short gets it the next time.
  stillThere();
  await commitTemplate(projectDir).then(
    (committed) => {
      if (committed) onTemplateCommitted?.();
    },
    (err: Error) => {
      console.warn(`[fast-app] could not commit the app template in ${projectDir}: ${err.message}`);
    },
  );
  stillThere();
  await installApp(projectDir, signal);
}

export const TEMPLATE_COMMIT_MESSAGE = 'chore: add the app template';

/**
 * The copied template is the project's starting point, not a change: it gets
 * a commit of its own, so the Changes panel starts clean (nothing to discard
 * by mistake) and the first build's commit holds only what the build changed.
 * Only in the project's own repository, only when git doesn't track the app
 * yet, and only the app's path: what the user staged elsewhere stays staged.
 * Returns whether it committed.
 */
export async function commitTemplate(projectDir: string): Promise<boolean> {
  const git = simpleGit(projectDir);
  const root = await git.revparse(['--show-toplevel']).catch((): null => null);
  if (!root || path.resolve(root.trim()) !== (await realpathOrSelf(projectDir))) return false;
  const app = path.relative(projectDir, appDirOf(projectDir)).split(path.sep).join('/');
  if ((await git.raw(['ls-files', '--', app])).trim()) return false;
  await stageGitPaths(projectDir, [app]);
  // With the fallback author when git has none, as the project's first commit has.
  const identity = await fallbackIdentityArgs(projectDir);
  await git.raw([...identity, 'commit', '-m', TEMPLATE_COMMIT_MESSAGE, '--', app]);
  return true;
}

async function realpathOrSelf(dir: string): Promise<string> {
  return realpath(dir).catch(() => path.resolve(dir));
}

// The app's own files are APFS clones (shared blocks until written). Its
// node_modules is not: cloning ~55k files one by one takes half a minute,
// while the frozen offline install links them from the pnpm store in seconds.
const NOT_CLONED = new Set(['node_modules', '.next']);

async function cloneTree(from: string, to: string, signal: AbortSignal): Promise<void> {
  // Not recursive: its parent is checked to be there, and stays the user's.
  await mkdir(to);
  const entries = (await readdir(from)).filter((name) => !NOT_CLONED.has(name));
  if (process.platform === 'darwin') {
    const sources = entries.map((name) => path.join(from, name));
    const result = await runCommand('cp', ['-c', '-R', ...sources, to], { cwd: to, signal });
    if (result.ok) return;
    signal.throwIfAborted();
    console.warn(`[fast-app] cp -c failed, copying instead: ${outputTail(result.output, 3)}`);
  }
  for (const name of entries) {
    signal.throwIfAborted();
    await cp(path.join(from, name), path.join(to, name), {
      recursive: true,
      verbatimSymlinks: true,
      force: true,
    });
  }
}

// db-tools' composed install, the one run_codegen runs too, through
// runCommand: build commands get the scrubbed environment, and a stop or a
// timeout ends pnpm's whole process group.
export async function installApp(projectDir: string, signal: AbortSignal): Promise<void> {
  const exec: RunCommand = async (command, args, cwd, env) => {
    const result = await runCommand(command, args, {
      cwd,
      env: { CI: 'true', ...env },
      signal,
      timeoutMs: INSTALL_TIMEOUT_MS,
    });
    return { ok: result.ok, out: result.output };
  };
  const install = await ensureComposedInstall(projectDir, exec);
  signal.throwIfAborted();
  if (!install.ok) {
    throw new Error(`pnpm install failed in ${appDirOf(projectDir)}:\n${outputTail(install.out)}`);
  }
}
