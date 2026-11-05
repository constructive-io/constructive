#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const DEFAULT_ATTEMPTS = 30;
const DEFAULT_DELAY_MS = 20_000;
const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

async function registryHasPackage(pkg, options = {}) {
  const registry = (options.registry || DEFAULT_REGISTRY).replace(/\/$/, '');
  const fetchImpl = options.fetchImpl || fetch;
  const url = `${registry}/${encodeURIComponent(pkg.name)}/${encodeURIComponent(pkg.version)}`;
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/json',
      'cache-control': 'no-cache',
    },
  });
  if (response.ok) return true;
  if (response.status === 404) return false;
  throw new Error(`npm registry returned ${response.status} for ${pkg.name}@${pkg.version}`);
}

async function waitForPublishedPackages(packages, options = {}) {
  const attempts = options.attempts || DEFAULT_ATTEMPTS;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const isPublished = options.isPublished || registryHasPackage;
  const wait = options.sleep || sleep;
  let pending = [...packages];

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const results = await Promise.all(
      pending.map(async pkg => ({ pkg, published: await isPublished(pkg) })),
    );
    pending = results.filter(result => !result.published).map(result => result.pkg);
    if (pending.length === 0) return;

    console.log(
      `Waiting for npm publication (${attempt}/${attempts}): ${pending
        .map(pkg => `${pkg.name}@${pkg.version}`)
        .join(', ')}`,
    );
    if (attempt < attempts) await wait(delayMs);
  }

  throw new Error(
    `Release packages are still unavailable from npm: ${pending
      .map(pkg => `${pkg.name}@${pkg.version}`)
      .join(', ')}`,
  );
}

function changedPublicPackages(before, after, cwd = process.cwd()) {
  const output = execFileSync(
    'git',
    ['diff', '--name-only', before, after, '--', ':(glob)**/package.json'],
    { cwd, encoding: 'utf8' },
  );
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map(filename => path.join(cwd, filename))
    .filter(filename => fs.existsSync(filename))
    .map(filename => JSON.parse(fs.readFileSync(filename, 'utf8')))
    .filter(pkg => pkg.name && pkg.version && pkg.private !== true)
    .map(pkg => ({ name: pkg.name, version: pkg.version }));
}

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`Missing ${name}`);
  }
  return process.argv[index + 1];
}

async function main() {
  const before = argument('--before');
  const after = argument('--after');
  const packages = changedPublicPackages(before, after);
  if (packages.length === 0) {
    console.log('No public package versions changed; npm release gate is clear');
    return;
  }

  console.log(`Waiting for ${packages.length} public package version(s) to appear on npm`);
  await waitForPublishedPackages(packages);
  console.log('All release package versions are available from npm');
}

module.exports = {
  changedPublicPackages,
  registryHasPackage,
  waitForPublishedPackages,
};

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
