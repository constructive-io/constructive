import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, cliExitWithError, getPackageJson } from 'inquirerer';
import { appstash } from 'appstash';
import { spawn, execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { fetchLatestVersion } from '../utils/npm-version';

const execFileAsync = promisify(execFile);
const log = new Logger('update');

const updateUsageText = `
Update Command:

  pgpm update [OPTIONS]

  Install the latest version of pgpm from npm.

Options:
  --help, -h          Show this help message
  --package <name>    Override the package name (default: package.json name)
  --registry <url>    Use a custom npm registry
  --dry-run           Print the npm command without executing it
`;

/**
 * Invalidate the update-check cache so subsequent commands
 * don't re-prompt after a successful update.
 */
export const clearUpdateCache = (toolName: string = 'pgpm'): boolean => {
  try {
    const dirs = appstash(toolName);
    const cacheFile = path.join(dirs.cache, 'update-check.json');
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
      return true;
    }
  } catch {
    // Best-effort: if cache cleanup fails, don't block the update
  }
  return false;
};

/**
 * Verify that the PATH-resolved pgpm binary is actually the updated version.
 */
export const verifyInstalledVersion = async (
  pkgName: string,
  expectedVersion: string
): Promise<{ resolved: string | null; matches: boolean }> => {
  try {
    const { stdout } = await execFileAsync('pgpm', ['--version'], {
      timeout: 5000,
      windowsHide: true
    });
    const resolved = stdout.trim();
    return { resolved, matches: resolved === expectedVersion };
  } catch {
    return { resolved: null, matches: false };
  }
};

const runNpmInstall = (pkgName: string, registry?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const args = ['install', '-g', pkgName];
    if (registry) {
      args.push('--registry', registry);
    }

    const child = spawn('npm', args, { stdio: 'inherit' });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install exited with code ${code}`));
      }
    });
  });
};

export default async (
  argv: Partial<Record<string, any>>,
  _prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(updateUsageText);
    process.exit(0);
  }

  const pkgJson = getPackageJson(__dirname);
  const pkgName = (argv.package as string) || pkgJson.name || 'pgpm';
  const registry = argv.registry as string | undefined;
  const dryRun = Boolean(argv['dry-run']);

  const npmCommand = `npm install -g ${pkgName}${registry ? ` --registry ${registry}` : ''}`;

  if (dryRun) {
    log.info(`[dry-run] ${npmCommand}`);
    return argv;
  }

  log.info(`Running: ${npmCommand}`);

  try {
    await runNpmInstall(pkgName, registry);

    // Invalidate the update-check cache so subsequent commands
    // don't re-prompt with a stale "update available" message
    clearUpdateCache();

    const latest = await fetchLatestVersion(pkgName);
    if (latest) {
      log.success(`Successfully updated ${pkgName} to version ${latest}.`);

      // Verify the PATH-resolved binary is actually the new version
      const { resolved, matches } = await verifyInstalledVersion(pkgName, latest);
      if (resolved && !matches) {
        log.warn(`pgpm in your PATH is still at ${resolved}.`);
        log.warn('The global npm install may have gone to a different location than your shell resolves.');
        log.warn('Check your PATH or use the same package manager you originally installed pgpm with.');
      }
    } else {
      log.success(`npm install completed for ${pkgName}.`);
    }
  } catch (error: any) {
    await cliExitWithError(
      error instanceof Error ? error.message : String(error),
      { context: { package: pkgName, registry } }
    );
  }

  return argv;
};
