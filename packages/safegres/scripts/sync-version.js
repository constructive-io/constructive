#!/usr/bin/env node
/**
 * Keep `src/version.ts` in step with package.json.
 *
 * The version is stamped into every report (and into the SARIF tool record),
 * so a stale constant silently mislabels which analyzer produced a result —
 * exactly the metadata a baseline comparison relies on. Run before packing,
 * after lerna has bumped the manifest.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { version } = require(path.join(root, 'package.json'));
const target = path.join(root, 'src', 'version.ts');
const next = `// Auto-synced from package.json by scripts/sync-version.js.\nexport const version = '${version}';\n`;

if (fs.readFileSync(target, 'utf8') !== next) {
  fs.writeFileSync(target, next);
  process.stdout.write(`[safegres] synced src/version.ts -> ${version}\n`);
}
