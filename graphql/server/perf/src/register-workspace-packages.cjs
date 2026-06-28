const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const searchRoots = [
  'agentic',
  'graphile',
  'graphql',
  'jobs',
  'packages',
  'pgpm',
  'postgres',
  'sdk',
  'uploads',
];
const ignoredDirs = new Set(['.git', 'dist', 'node_modules']);

const packageMap = new Map();

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  const packageJson = path.join(dir, 'package.json');
  if (fs.existsSync(packageJson)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
      if (pkg.name && !packageMap.has(pkg.name)) {
        packageMap.set(pkg.name, dir);
      }
    } catch {
      // Ignore malformed package metadata in unrelated fixtures.
    }
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || ignoredDirs.has(entry.name)) continue;
    walk(path.join(dir, entry.name));
  }
}

for (const root of searchRoots) {
  walk(path.join(repoRoot, root));
}

function packageEntry(packageDir) {
  const sourceEntry = path.join(packageDir, 'src', 'index.ts');
  if (fs.existsSync(sourceEntry)) return sourceEntry;

  const distEntry = path.join(packageDir, 'dist', 'index.js');
  if (fs.existsSync(distEntry)) return distEntry;

  const rootEntry = path.join(packageDir, 'index.js');
  if (fs.existsSync(rootEntry)) return rootEntry;

  return null;
}

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveWorkspacePackage(request, parent, isMain, options) {
  const packageDir = packageMap.get(request);
  if (packageDir) {
    const entry = packageEntry(packageDir);
    if (entry) return entry;
  }

  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (error) {
    const parentDir = parent?.filename ? path.dirname(parent.filename) : process.cwd();
    if (
      error &&
      error.code === 'MODULE_NOT_FOUND' &&
      (request.startsWith('./') || request.startsWith('../')) &&
      request.endsWith('.js')
    ) {
      const tsRequest = path.resolve(parentDir, `${request.slice(0, -3)}.ts`);
      if (fs.existsSync(tsRequest)) return tsRequest;
    }

    throw error;
  }
};
