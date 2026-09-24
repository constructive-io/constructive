// node-pty ships its darwin builds as prebuilt binaries in the npm tarball, and
// the tarball does not carry the executable bit for anything outside `bin`: the
// extracted `prebuilds/darwin-<arch>/spawn-helper` lands 0644, and the first
// `pty.spawn()` then dies with EACCES — on the user's own laptop, which is the
// only machine this daemon ever runs on. Restoring the bit is idempotent and
// costs two stat calls, so the runner does it itself at startup instead of in a
// postinstall script: `npm i -g` runs no lifecycle script of ours, and a
// prebuild replaced by a later reinstall would lose the fix again.

import fs from 'fs';
import path from 'path';

/** The mode a helper binary needs: executable wherever it is readable. */
const EXECUTABLE_MODE = 0o755;

/**
 * Helper binaries the installed node-pty carries: one per prebuild it shipped,
 * plus the one a local node-gyp build produces. Only paths that exist.
 */
function spawnHelpers(packageRoot: string): string[] {
  const helpers: string[] = [path.join(packageRoot, 'build', 'Release', 'spawn-helper')];
  const prebuilds = path.join(packageRoot, 'prebuilds');
  if (fs.existsSync(prebuilds)) {
    for (const entry of fs.readdirSync(prebuilds)) {
      helpers.push(path.join(prebuilds, entry, 'spawn-helper'));
    }
  }
  return helpers.filter(helper => fs.existsSync(helper));
}

/**
 * Make every spawn-helper of the node-pty rooted at `packageRoot` executable,
 * and return the ones that had to be changed (nothing to say on a tree that is
 * already correct — which is every Linux install, where there is no such file).
 */
export function ensureSpawnHelperExecutable(packageRoot: string): string[] {
  const repaired: string[] = [];
  for (const helper of spawnHelpers(packageRoot)) {
    const mode = fs.statSync(helper).mode;
    if ((mode & 0o111) !== 0) continue;
    fs.chmodSync(helper, EXECUTABLE_MODE);
    repaired.push(helper);
  }
  return repaired;
}

/** Where the node-pty this runner will spawn through is installed. */
export function nodePtyRoot(): string {
  return path.dirname(require.resolve('node-pty/package.json'));
}
