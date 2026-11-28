#!/usr/bin/env node
import { checkForUpdates } from '@inquirerer/utils';
import { getPackageJson } from 'inquirerer';

import { createConstructiveCli } from './cli';

export { commands, createConstructiveCli } from './cli';

/**
 * The update notice, or null. The check caches its answer under the home
 * directory and cannot be told another place, so it does not run at all when
 * CONSTRUCTIVE_STASH_DIR isolates the run from the home directory.
 */
export async function updateNotice(env: NodeJS.ProcessEnv): Promise<string | null> {
  if (env.CONSTRUCTIVE_STASH_DIR !== undefined) return null;
  try {
    const pkg = getPackageJson(__dirname);
    const result = await checkForUpdates({ pkgName: pkg.name, pkgVersion: pkg.version, toolName: 'constructive' });
    return result.hasUpdate && result.message ? `${result.message}\nRun npm i -g ${pkg.name}@latest to upgrade.\n` : null;
  } catch {
    return null;
  }
}

if (require.main === module) {
  // Agents and scripts never see the notice: it needs a person at a terminal.
  const interactive = process.stdin.isTTY && process.stdout.isTTY && !process.env.CI;
  const notice = interactive ? updateNotice(process.env) : Promise.resolve(null);
  createConstructiveCli()
    .run(process.argv.slice(2))
    .then(async (code) => {
      const message = await notice;
      if (message) process.stderr.write(message);
      process.exitCode = code;
    });
}
