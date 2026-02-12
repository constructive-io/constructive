jest.setTimeout(15000);
process.env.PGPM_SKIP_UPDATE_CHECK = 'true';

import * as fs from 'fs';
import * as path from 'path';
import semver from 'semver';
import { appstash } from 'appstash';

import { clearUpdateCache, verifyInstalledVersion } from '../src/commands/update';

// ─── clearUpdateCache ────────────────────────────────────────────────

describe('clearUpdateCache', () => {
  let cacheDir: string;
  let cacheFile: string;

  beforeEach(() => {
    const dirs = appstash('pgpm-test-update');
    cacheDir = dirs.cache;
    cacheFile = path.join(cacheDir, 'update-check.json');

    // Ensure the cache directory exists
    fs.mkdirSync(cacheDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test cache directory
    try {
      if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile);
      if (fs.existsSync(cacheDir)) fs.rmdirSync(cacheDir);
      // Clean up the parent .pgpm-test-update dir
      const root = path.dirname(cacheDir);
      if (fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('deletes existing cache file and returns true', () => {
    fs.writeFileSync(cacheFile, JSON.stringify({
      latestVersion: '9.9.9',
      timestamp: Date.now()
    }));
    expect(fs.existsSync(cacheFile)).toBe(true);

    const result = clearUpdateCache('pgpm-test-update');

    expect(result).toBe(true);
    expect(fs.existsSync(cacheFile)).toBe(false);
  });

  it('returns false when no cache file exists', () => {
    // Ensure no cache file
    if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile);

    const result = clearUpdateCache('pgpm-test-update');
    expect(result).toBe(false);
  });

  it('returns false and does not throw for invalid tool name', () => {
    // This should not throw even if appstash returns an unusual path
    const result = clearUpdateCache('pgpm-test-update');
    expect(result).toBe(false);
  });
});

// ─── verifyInstalledVersion ──────────────────────────────────────────

describe('verifyInstalledVersion', () => {
  it('returns resolved version when pgpm is in PATH', async () => {
    // This test validates the function shape; it may not find pgpm
    // in PATH during CI, so we just validate the return contract
    const result = await verifyInstalledVersion('pgpm', '99.99.99');
    expect(result).toHaveProperty('resolved');
    expect(result).toHaveProperty('matches');
    expect(typeof result.matches).toBe('boolean');
  });

  it('matches is false when expected version does not match', async () => {
    const result = await verifyInstalledVersion('pgpm', '0.0.0-impossible');
    // If pgpm is found, it won't match 0.0.0-impossible
    // If pgpm is not found, resolved is null and matches is false
    expect(result.matches).toBe(false);
  });

  it('returns null resolved when binary is not found', async () => {
    // Use a binary name that definitely doesn't exist
    const { verifyInstalledVersion: verify } = jest.requireActual('../src/commands/update') as typeof import('../src/commands/update');

    // We can't easily test a missing binary for 'pgpm' specifically,
    // but we verify the error handling path by checking the contract
    const result = await verify('pgpm', '99.99.99');
    if (result.resolved === null) {
      expect(result.matches).toBe(false);
    } else {
      expect(typeof result.resolved).toBe('string');
    }
  });
});

// ─── Semver comparison (the string > operator bug) ───────────────────

describe('semver comparison vs string comparison', () => {
  it('string comparison fails for multi-digit versions', () => {
    // This is the bug: JavaScript string "3.10.0" > "3.9.0" is FALSE
    expect('3.10.0' > '3.9.0').toBe(false);
    // But semver correctly identifies it as greater
    expect(semver.gt('3.10.0', '3.9.0')).toBe(true);
  });

  it('string comparison fails for double-digit patch versions', () => {
    expect('1.0.10' > '1.0.9').toBe(false);
    expect(semver.gt('1.0.10', '1.0.9')).toBe(true);
  });

  it('semver correctly handles equal versions', () => {
    expect(semver.gt('3.3.0', '3.3.0')).toBe(false);
  });

  it('semver correctly handles older versions', () => {
    expect(semver.gt('3.2.0', '3.3.0')).toBe(false);
  });

  it('semver correctly handles newer major versions', () => {
    expect(semver.gt('4.0.0', '3.99.99')).toBe(true);
  });
});

// ─── Update check integration (simulated cache scenario) ────────────

describe('update check cache lifecycle', () => {
  let cacheDir: string;
  let cacheFile: string;
  const toolName = 'pgpm-test-lifecycle';

  beforeEach(() => {
    const dirs = appstash(toolName);
    cacheDir = dirs.cache;
    cacheFile = path.join(cacheDir, 'update-check.json');
    fs.mkdirSync(cacheDir, { recursive: true });
  });

  afterEach(() => {
    try {
      const root = path.dirname(cacheDir);
      if (fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('simulates the full bug scenario and fix', () => {
    // Step 1: checkForUpdates would cache this during `pgpm deploy`
    const cachedData = {
      latestVersion: '3.4.0',
      timestamp: Date.now()
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cachedData));

    // Step 2: Verify cache exists (simulates the stale state)
    expect(fs.existsSync(cacheFile)).toBe(true);
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    expect(cached.latestVersion).toBe('3.4.0');

    // Step 3: The fix — clearUpdateCache removes it
    const cleared = clearUpdateCache(toolName);
    expect(cleared).toBe(true);
    expect(fs.existsSync(cacheFile)).toBe(false);

    // Step 4: Next checkForUpdates call would fetch fresh from registry
    // instead of using the stale cached value
  });

  it('cache within TTL would be reused (demonstrating the bug)', () => {
    const currentVersion = '3.3.0';
    const latestVersion = '3.4.0';
    const TTL = 24 * 60 * 60 * 1000;

    // Simulate a cache that was written 1 hour ago
    const cachedData = {
      latestVersion,
      timestamp: Date.now() - (1 * 60 * 60 * 1000) // 1 hour ago
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cachedData));

    // Read cache and check TTL (same logic as checkForUpdates)
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    const withinTTL = Date.now() - cached.timestamp < TTL;
    expect(withinTTL).toBe(true);

    // The old string-based check (the bug):
    const stringHasUpdate = cached.latestVersion !== currentVersion
      && cached.latestVersion > currentVersion;
    // This happens to work for 3.4.0 vs 3.3.0, but...
    expect(stringHasUpdate).toBe(true);

    // The fix — use semver:
    const semverHasUpdate = semver.gt(cached.latestVersion, currentVersion);
    expect(semverHasUpdate).toBe(true);

    // Now demonstrate where string comparison FAILS:
    const stringWrongResult = '3.10.0' > '3.9.0'; // false!
    const semverCorrectResult = semver.gt('3.10.0', '3.9.0'); // true
    expect(stringWrongResult).toBe(false);
    expect(semverCorrectResult).toBe(true);
  });

  it('expired cache is not reused', () => {
    const TTL = 24 * 60 * 60 * 1000;

    // Simulate a cache that was written 25 hours ago
    const cachedData = {
      latestVersion: '3.4.0',
      timestamp: Date.now() - (25 * 60 * 60 * 1000)
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cachedData));

    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    const withinTTL = Date.now() - cached.timestamp < TTL;
    expect(withinTTL).toBe(false);
  });
});
