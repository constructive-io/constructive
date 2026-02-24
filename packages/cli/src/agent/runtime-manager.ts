import * as fs from 'node:fs';
import * as path from 'node:path';

import { resolve as resolveAppPath } from 'appstash';

import { getAppDirs } from '../config';
import { runCommand } from './process-utils';

export const PI_RUNTIME_PACKAGE = '@mariozechner/pi-coding-agent';
export const PI_RUNTIME_VERSION = '0.54.2';

const INSTALL_LOCK_FILE = '.install.lock';
const LOCK_WAIT_TIMEOUT_MS = 45_000;
const LOCK_POLL_MS = 250;
const LOCK_STALE_MS = 120_000;

export interface PiRuntimeStatus {
  runtimeDir: string;
  packageJsonPath: string;
  binaryPath: string;
  installedVersion?: string;
  isInstalled: boolean;
}

export interface EnsurePiRuntimeOptions {
  verbose?: boolean;
}

export interface EnsurePiRuntimeResult extends PiRuntimeStatus {
  installedThisRun: boolean;
}

const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const getRuntimeDir = (): string => {
  const dirs = getAppDirs();
  return resolveAppPath(dirs, 'data', 'agent', 'pi-runtime');
};

const getPackageJsonPath = (runtimeDir: string): string => {
  return path.join(
    runtimeDir,
    'node_modules',
    '@mariozechner',
    'pi-coding-agent',
    'package.json',
  );
};

const getBinaryPath = (runtimeDir: string): string => {
  return path.join(
    runtimeDir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'pi.cmd' : 'pi',
  );
};

const normalizeInstalledVersion = (runtimeDir: string): string | undefined => {
  const packageJsonPath = getPackageJsonPath(runtimeDir);
  if (!fs.existsSync(packageJsonPath)) {
    return undefined;
  }

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: string };
    const version = parsed.version?.trim();
    return version && version.length > 0 ? version : undefined;
  } catch {
    return undefined;
  }
};

const resolveStatus = (runtimeDir: string): PiRuntimeStatus => {
  const packageJsonPath = getPackageJsonPath(runtimeDir);
  const binaryPath = getBinaryPath(runtimeDir);
  const installedVersion = normalizeInstalledVersion(runtimeDir);

  return {
    runtimeDir,
    packageJsonPath,
    binaryPath,
    installedVersion,
    isInstalled:
      installedVersion === PI_RUNTIME_VERSION && fs.existsSync(binaryPath),
  };
};

const isLockStale = (lockPath: string): boolean => {
  try {
    const stats = fs.statSync(lockPath);
    return Date.now() - stats.mtimeMs > LOCK_STALE_MS;
  } catch {
    return false;
  }
};

const acquireInstallLock = async (runtimeDir: string): Promise<string> => {
  fs.mkdirSync(runtimeDir, { recursive: true });
  const lockPath = path.join(runtimeDir, INSTALL_LOCK_FILE);
  const start = Date.now();

  while (true) {
    try {
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      return lockPath;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        throw error;
      }

      if (isLockStale(lockPath)) {
        try {
          fs.rmSync(lockPath, { force: true });
          continue;
        } catch {
          // If another process removed/replaced it, continue waiting.
        }
      }

      if (Date.now() - start > LOCK_WAIT_TIMEOUT_MS) {
        throw new Error(
          `Timed out waiting for PI runtime install lock at ${lockPath}.`,
        );
      }

      await sleep(LOCK_POLL_MS);
    }
  }
};

const installPiRuntime = async (
  runtimeDir: string,
  verbose: boolean,
): Promise<void> => {
  const packageSpec = `${PI_RUNTIME_PACKAGE}@${PI_RUNTIME_VERSION}`;
  const installArgs = [
    'install',
    '--no-audit',
    '--no-fund',
    '--prefix',
    runtimeDir,
    packageSpec,
  ];

  const result = await runCommand('npm', installArgs, {
    inheritStdio: verbose,
  });

  if (result.exitCode !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    const details = stderr || stdout || `exit=${result.exitCode}`;
    throw new Error(`Failed to install PI runtime (${packageSpec}): ${details}`);
  }
};

export function getPiRuntimeStatus(): PiRuntimeStatus {
  const runtimeDir = getRuntimeDir();
  fs.mkdirSync(runtimeDir, { recursive: true });
  return resolveStatus(runtimeDir);
}

export async function ensurePiRuntime(
  options: EnsurePiRuntimeOptions = {},
): Promise<EnsurePiRuntimeResult> {
  const runtimeDir = getRuntimeDir();
  const lockPath = await acquireInstallLock(runtimeDir);

  try {
    const currentStatus = resolveStatus(runtimeDir);
    if (currentStatus.isInstalled) {
      return {
        ...currentStatus,
        installedThisRun: false,
      };
    }

    await installPiRuntime(runtimeDir, Boolean(options.verbose));
    const installedStatus = resolveStatus(runtimeDir);

    if (!installedStatus.isInstalled) {
      throw new Error(
        `PI runtime installation finished but executable/version is invalid at ${runtimeDir}.`,
      );
    }

    return {
      ...installedStatus,
      installedThisRun: true,
    };
  } finally {
    try {
      fs.rmSync(lockPath, { force: true });
    } catch {
      // best effort cleanup
    }
  }
}

export function resetPiRuntime(): void {
  const status = getPiRuntimeStatus();
  fs.rmSync(status.runtimeDir, { recursive: true, force: true });
}
