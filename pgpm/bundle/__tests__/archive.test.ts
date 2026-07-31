import { hashString } from '@pgpmjs/ast';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import {
  BUNDLE_ARCHIVE_ENTRY,
  bundleFromModule,
  packBundle,
  packSingleFileTarGz,
  readBundleArchiveFile,
  unpackBundle,
  unpackSingleFileTarGz,
  verifyBundle,
  withExecutableSql,
  writeBundleArchiveFile
} from '../src';

let sourceDir: string;

const PLAN = `%syntax-version=1.0.0
%project=my-module
%uri=my-module

schemas/auth/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # add schema
schemas/auth/tables/users [schemas/auth/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # add users
`;

const CONTROL = `default_version = '0.0.1'
requires = 'plpgsql'
`;

const DEPLOY: Record<string, string> = {
  'schemas/auth/schema': 'CREATE SCHEMA auth;',
  'schemas/auth/tables/users': 'CREATE TABLE auth.users (id int PRIMARY KEY);'
};

function write(rel: string, content: string): void {
  const file = join(sourceDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeEach(() => {
  sourceDir = mkdtempSync(join(tmpdir(), 'pgpm-bundle-archive-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  writeFileSync(join(sourceDir, 'my-module.control'), CONTROL);
  for (const [change, sql] of Object.entries(DEPLOY)) {
    write(`deploy/${change}.sql`, `-- Deploy ${change}\nBEGIN;\n${sql}\nCOMMIT;\n`);
  }
});

afterEach(() => {
  rmSync(sourceDir, { recursive: true, force: true });
});

describe('single-file tar.gz codec', () => {
  it('round-trips content', () => {
    const archive = packSingleFileTarGz('pgpm-bundle.json', '{"hello":"wörld"}');
    expect(unpackSingleFileTarGz(archive)).toEqual({
      name: 'pgpm-bundle.json',
      content: '{"hello":"wörld"}'
    });
  });

  it('is deterministic for identical content', () => {
    const a = packSingleFileTarGz('x.json', 'same');
    const b = packSingleFileTarGz('x.json', 'same');
    expect(a.equals(b)).toBe(true);
  });

  it('rejects a non-archive payload', () => {
    expect(() => unpackSingleFileTarGz(Buffer.from('not gzip'))).toThrow();
  });
});

describe('bundle archive artifact', () => {
  it('round-trips a bundle through the stored artifact', () => {
    const bundle = bundleFromModule(sourceDir);
    const restored = unpackBundle(packBundle(bundle));
    expect(restored).toEqual(bundle);
    expect(unpackSingleFileTarGz(packBundle(bundle)).name).toBe(BUNDLE_ARCHIVE_ENTRY);
  });

  it('writes and reads the artifact file', () => {
    const bundle = bundleFromModule(sourceDir);
    const path = join(sourceDir, 'sql', 'my-module--0.0.1.bundle.tar.gz');
    writeBundleArchiveFile(bundle, path);
    expect(readBundleArchiveFile(path)).toEqual(bundle);
  });
});

describe('executable SQL slot', () => {
  const execSql = { 'schemas/auth/schema': 'CREATE SCHEMA auth;' };

  it('verifies and changes the content address', () => {
    const bundle = bundleFromModule(sourceDir);
    const withExec = withExecutableSql(bundle, execSql);

    expect(verifyBundle(withExec)).toEqual([]);
    expect(withExec.changes[0].exec).toEqual({
      sql: execSql['schemas/auth/schema'],
      digest: hashString(execSql['schemas/auth/schema'])
    });
    expect(withExec.manifest.digest).not.toBe(bundle.manifest.digest);
    // changes without an exec entry keep their original digest
    expect(withExec.changes[1]).toEqual(bundle.changes[1]);
  });

  it('detects tampered executable SQL', () => {
    const withExec = withExecutableSql(bundleFromModule(sourceDir), execSql);
    withExec.changes[0].exec!.sql = 'DROP SCHEMA auth;';

    const issues = verifyBundle(withExec);
    expect(issues.map(i => i.kind).sort()).toEqual(['exec-digest']);
  });

  it('keeps per-change deploy digests equal to sha256 of the deploy script bytes', () => {
    const bundle = withExecutableSql(bundleFromModule(sourceDir), execSql);
    for (const change of bundle.changes) {
      expect(change.deploy!.digest).toBe(hashString(change.deploy!.sql));
    }
  });
});
