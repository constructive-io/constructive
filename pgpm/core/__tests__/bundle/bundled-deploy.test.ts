import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { hashString } from '@pgpmjs/ast';
import { readBundleArchiveFile, writeBundleArchiveFile } from '@pgpmjs/bundle';

import {
  bundleArtifactFileName,
  buildExecutableBundle,
  resolveBundleArtifactPath,
  writeBundleArtifact
} from '../../src/bundle/artifact';
import { TestDatabase } from '../../test-utils';
import { CoreDeployTestFixture } from '../../test-utils/CoreDeployTestFixture';

const MODULES = ['my-first', 'my-second', 'my-third'] as const;

/**
 * The bundle-backed deploy path ("fast v2"): a pre-built, content-addressed
 * artifact is executed in one shot AND recorded in the `pgpm_migrate` ledger,
 * with graceful fallback whenever the artifact cannot be trusted.
 */
describe('bundled deployment', () => {
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

  it('falls back to the standard path when no artifact exists', async () => {
    await fixture.deployModule('my-third', db.name, ['sqitch', 'simple-w-tags'], false, {
      bundled: true
    });

    expect(await db.exists('schema', 'myfirstapp')).toBe(true);
    expect((await ledger()).length).toBe(8);
  });

  it('falls back when an artifact fails hash verification', async () => {
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

  it('falls back when the artifact archive is corrupt', async () => {
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
