#!/usr/bin/env node
/**
 * Fails when a workspace package has tests that no CI job runs.
 *
 * The test matrices in .github/workflows/run-tests.yaml are hand-maintained
 * lists of package paths. Adding a package to the workspace does not add it to
 * a batch, and nothing complained: 35 packages / 89 test files had accumulated
 * in no job at all, so genuinely broken code (a type error in
 * graphile-upload-plugin, stale mocks in graphile-realtime-subscriptions) sat
 * green for as long as nobody ran them locally.
 *
 * Omission is now countable. A package with tests must either be claimed by a
 * batch or listed in EXCLUSIONS with a reason — silence is not an option.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github/workflows/run-tests.yaml');

/**
 * Packages deliberately not in any batch. Every entry needs a reason; a stale
 * exclusion (the package no longer exists, or has no tests) is also an error,
 * so this list cannot rot quietly.
 */
const EXCLUSIONS = {
  'graphql/react':
    'Requires an external GraphQL endpoint via $TESTING_URL and throws at ' +
    'import time without one — a manual suite, not a CI one.'
};

function claimedPackages() {
  const workflow = fs.readFileSync(WORKFLOW, 'utf8');
  const claimed = new Set();
  for (const [, list] of workflow.matchAll(/^\s*packages:\s*'([^']+)'/gm)) {
    for (const pkg of list.split(/\s+/).filter(Boolean)) claimed.add(pkg);
  }
  for (const [, pkg] of workflow.matchAll(/^\s*- package:\s*(\S+)/gm)) {
    claimed.add(pkg);
  }
  return claimed;
}

function hasTests(dir) {
  const stack = [path.join(dir, '__tests__'), path.join(dir, 'src')];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue; // directory simply doesn't exist
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(test|spec)\.(t|j)sx?$/.test(entry.name)) return true;
    }
  }
  return false;
}

function workspacePackages() {
  const raw = execFileSync('pnpm', ['-r', 'list', '--json', '--depth', '-1'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  return JSON.parse(raw)
    .map(pkg => pkg.path)
    .filter(Boolean)
    .map(abs => path.relative(ROOT, abs))
    .filter(rel => rel && !rel.startsWith('..'));
}

function main() {
  const claimed = claimedPackages();
  if (claimed.size === 0) {
    throw new Error(
      `parsed no packages out of ${path.relative(ROOT, WORKFLOW)} — the matrix ` +
        'format changed and this check is now vacuous'
    );
  }

  const tested = workspacePackages().filter(rel => hasTests(path.join(ROOT, rel)));
  const unclaimed = tested.filter(rel => !claimed.has(rel) && !(rel in EXCLUSIONS));
  const staleExclusions = Object.keys(EXCLUSIONS).filter(rel => !tested.includes(rel));

  for (const rel of unclaimed) {
    console.error(`✗ ${rel} has tests but no CI job runs them`);
  }
  for (const rel of staleExclusions) {
    console.error(`✗ ${rel} is excluded but has no tests (or no longer exists)`);
  }

  if (unclaimed.length || staleExclusions.length) {
    console.error(
      '\nAdd the package to a batch in .github/workflows/run-tests.yaml, or to ' +
        'EXCLUSIONS in this script with a reason.'
    );
    process.exit(1);
  }

  console.log(
    `✓ ${tested.length} packages with tests, all claimed ` +
      `(${Object.keys(EXCLUSIONS).length} excluded with reasons)`
  );
}

main();
