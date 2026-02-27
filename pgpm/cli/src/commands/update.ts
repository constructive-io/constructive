import { clearUpdateCache } from '@inquirerer/utils';
import { Logger } from '@pgpmjs/logger';
import { appstash } from 'appstash';
import { CLIOptions, Inquirerer, cliExitWithError, getPackageJson } from 'inquirerer';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fetchLatestVersion } from '../utils/npm-version';

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

const CACHE_FILENAME = 'update-check.json';

/**
 * Write a cache entry that suppresses the update notification.
 *
 * After `pgpm update` installs a new version, the currently running binary
 * still reports the OLD version via getPackageJson(__dirname). If we merely
 * clear the cache, the next command will fetch the latest from npm and
 * compare it against the stale pkgVersion, producing a false-positive
 * "Update available" message.
 *
 * By writing the current binary's version as `latestVersion`, the next
 * checkForUpdates call sees latestVersion === pkgVersion and returns
 * hasUpdate: false. Once the cache expires (24 h), a fresh check runs
 * against the (by then correct) new binary version.
 */
const suppressUpdateCheck = (currentVersion: string): void => {
  try {
    const dirs = appstash('pgpm');
    const cacheFile = path.join(dirs.cache, CACHE_FILENAME);
    if (!fs.existsSync(dirs.cache)) {
      fs.mkdirSync(dirs.cache, { recursive: true });
    }
    fs.writeFileSync(cacheFile, JSON.stringify({
      latestVersion: currentVersion,
      timestamp: Date.now()
    }));
  } catch {
    // If writing fails, fall back to clearing the old cache
    clearUpdateCache('pgpm');
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
    suppressUpdateCheck(pkgJson.version);
    const latest = await fetchLatestVersion(pkgName);
    if (latest) {
      log.success(`Successfully updated ${pkgName} to version ${latest}.`);
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
