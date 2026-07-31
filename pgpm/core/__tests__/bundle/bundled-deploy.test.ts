import { hashString } from '@pgpmjs/ast';
import { readBundleArchiveFile, writeBundleArchiveFile } from '@pgpmjs/bundle';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import {
  buildExecutableBundle,
  bundleArtifactFileName,
  resolveBundleArtifactPath,
  writeBundleArtifact
} from '../../src/bundle/artifact';
import { TestDatabase } from '../../test-utils';
import { CoreDeployTestFixture } from '../../test-utils/CoreDeployTestFixture';

const MODULES = ['my-first', 'my-second', 'my-third'] as const;

/**
 * The fast deploy strategy: one-shot execution AND a `pgpm_migrate` ledger,
 * reading the pre-built content-addressed artifact when it verifies and
 * rebuilding from `deploy/` when it does not. Either way the executed SQL and
 * the recorded hashes are identical — no deploy is ever left unledgered.
 */
describe('fast (bundle-backed) deployment', () => {
  let fixture: CoreDeployTestFixture;
  let db: TestDatabase;

  const modulePath = (name: string): string =>
    fixture.fixturePath('packages', name);

  const emitArtifacts = async (): Promise<void> => {
    for (const name of MODULES) {
      const dir = modulePath(name);
      const version = require(join(dir, 'package.json')).version as string;
      await writeBundleArtifact(dir, version);
    }
  };

  const ledger = async () =>
    (
      await db.query(
        'SELECT package, change_name, script_hash FROM pgpm_migrate.changes ORDER BY package, change_name'
      )
    ).rows;

  beforeEach(async () => {
    fixture = new CoreDeployTestFixture('sqitch', 'simple-w-tags');
    db = await fixture.setupTestDatabase();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it('emits an artifact whose change digests match the ledger hash scheme', async () => {
    await emitArtifacts();

    const dir = modulePath('my-first');
    const artifactPath = resolveBundleArtifactPath(dir);
    expect(artifactPath).toBe(
      join(dir, 'sql', bundleArtifactFileName('my-first', '0.0.1'))
    );

    const bundle = readBundleArchiveFile(artifactPath!);
    for (const change of bundle.changes) {
      // The ledger's default `content` hash is sha256 over the deploy file bytes;
      // the bundle records exactly that, so both systems agree on a change hash.
      const onDisk = readFileSync(join(dir, 'deploy', `${change.name}.sql`), 'utf-8');
      expect(change.deploy!.digest).toBe(hashString(onDisk));
      expect(change.exec!.sql).not.toMatch(/\bBEGIN;/);
    }
  });

  it('deploys from the artifact and records one ledger row per change', async () => {
    await emitArtifacts();

    await fixture.deployModule('my-third', db.name, ['sqitch', 'simple-w-tags'], false, {
      bundled: true
    });

    expect(await db.exists('schema', 'myfirstapp')).toBe(true);

    const rows = await ledger();
    expect(rows.length).toBe(8);
    expect(new Set(rows.map((r: any) => r.package))).toEqual(
      new Set(['my-first', 'my-second', 'my-third'])
    );

    const deps = await db.query(
      'SELECT count(*)::int AS count FROM pgpm_migrate.dependencies'
    );
    expect(deps.rows[0].count).toBeGreaterThan(0);
  });

  it('is idempotent: a second bundled deploy skips every change', async () => {
    await emitArtifacts();

    const deploy = () =>
      fixture.deployModule('my-third', db.name, ['sqitch', 'simple-w-tags'], false, {
        bundled: true
      });

    await deploy();
    const first = await ledger();
    await deploy();
    expect(await ledger()).toEqual(first);
  });

  it('produces the same ledger as the standard per-change deploy path', async () => {
    await emitArtifacts();
    await fixture.deployModule('my-third', db.name, ['sqitch', 'simple-w-tags'], false, {
      bundled: true
    });
    const bundled = await ledger();

    const other = new CoreDeployTestFixture('sqitch', 'simple-w-tags');
    const otherDb = await other.setupTestDatabase();
    try {
      await other.deployModule('my-third', otherDb.name, ['sqitch', 'simple-w-tags']);
      const standard = (
        await otherDb.query(
          'SELECT package, change_name, script_hash FROM pgpm_migrate.changes ORDER BY package, change_name'
        )
      ).rows;
      expect(bundled).toEqual(standard);
    } finally {
      await other.cleanup();
    }
  });

  it('ledgers under the legacy `fast` flag, with and without an artifact', async () => {
    // `fast` used to execute one-shot and record nothing; it must now produce
    // the same ledger as every other path.
    await fixture.deployModule('my-third', db.name, ['sqitch', 'simple-w-tags'], false, {
      fast: true
    });
    expect(await db.exists('schema', 'myfirstapp')).toBe(true);
    const withoutArtifact = await ledger();
    expect(withoutArtifact.length).toBe(8);

    const other = new CoreDeployTestFixture('sqitch', 'simple-w-tags');
    const otherDb = await other.setupTestDatabase();
    try {
      for (const name of MODULES) {
        const dir = other.fixturePath('packages', name);
        await writeBundleArtifact(dir, require(join(dir, 'package.json')).version as string);
      }
      await other.deployModule('my-third', otherDb.name, ['sqitch', 'simple-w-tags'], false, {
        fast: true
      });
      const withArtifact = (
        await otherDb.query(
          'SELECT package, change_name, script_hash FROM pgpm_migrate.changes ORDER BY package, change_name'
        )
      ).rows;
      expect(withArtifact).toEqual(withoutArtifact);
    } finally {
      await other.cleanup();
    }
  });

  it('still deploys and ledgers when no artifact exists', async () => {
    await fixture.deployModule('my-third', db.name, ['sqitch', 'simple-w-tags'], false, {
      bundled: true
    });

    expect(await db.exists('schema', 'myfirstapp')).toBe(true);
    expect((await ledger()).length).toBe(8);
  });

  it('rebuilds from deploy/ when an artifact fails hash verification', async () => {
    await emitArtifacts();

    const artifactPath = resolveBundleArtifactPath(modulePath('my-first'))!;
    const tampered = readBundleArchiveFile(artifactPath);
    tampered.changes[0].exec!.sql = 'CREATE SCHEMA tampered;';
    writeBundleArchiveFile(tampered, artifactPath);

    await fixture.deployModule('my-third', db.name, ['sqitch', 'simple-w-tags'], false, {
      bundled: true
    });

    expect(await db.exists('schema', 'tampered')).toBe(false);
    expect(await db.exists('schema', 'myfirstapp')).toBe(true);
    expect((await ledger()).length).toBe(8);
  });

  it('rebuilds from deploy/ when the artifact is valid but stale', async () => {
    // A committed artifact plus a rebase: the archive verifies against itself,
    // but `deploy/` has moved on. Using it would deploy yesterday's SQL and
    // ledger it as today's.
    await emitArtifacts();

    const dir = modulePath('my-first');
    const { name } = readBundleArchiveFile(resolveBundleArtifactPath(dir)!).changes[0];
    const deployPath = join(dir, 'deploy', `${name}.sql`);
    const updated = `${readFileSync(deployPath, 'utf-8')}\nCREATE SCHEMA rebased;\n`;
    writeFileSync(deployPath, updated);

    await fixture.deployModule('my-third', db.name, ['sqitch', 'simple-w-tags'], false, {
      bundled: true
    });

    expect(await db.exists('schema', 'rebased')).toBe(true);
    const row = (await ledger()).find((r: { change_name: string; script_hash: string }) => r.change_name === name);
    expect(row!.script_hash).toBe(hashString(updated));
  });

  it('rebuilds from deploy/ when the artifact archive is corrupt', async () => {
    await emitArtifacts();
    writeFileSync(resolveBundleArtifactPath(modulePath('my-second'))!, 'not-an-archive');

    await fixture.deployModule('my-third', db.name, ['sqitch', 'simple-w-tags'], false, {
      bundled: true
    });

    expect((await ledger()).length).toBe(8);
  });

  it('builds executable SQL for every change with a deploy script', async () => {
    const bundle = await buildExecutableBundle(modulePath('my-first'));
    expect(bundle.changes.length).toBeGreaterThan(0);
    for (const change of bundle.changes) {
      expect(change.exec!.digest).toBe(hashString(change.exec!.sql));
    }
  });
});
