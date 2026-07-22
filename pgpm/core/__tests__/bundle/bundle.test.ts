import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { readModule } from '../../src/ast';
import {
  bundleFromModule,
  createBundle,
  materializeBundle,
  readBundleFile,
  verifyBundle,
  writeBundleFile
} from '../../src/bundle';

let sourceDir: string;

const PLAN = `%syntax-version=1.0.0
%project=my-module
%uri=my-module

schemas/auth/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # add schema
schemas/auth/tables/users [schemas/auth/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # add users
schemas/billing/schema [schemas/auth/schema] 2024-01-01T00:00:02Z Dev <dev@example.com> # add billing
`;

const CONTROL = `# my-module extension
comment = 'my-module extension'
default_version = '0.0.1'
requires = 'plpgsql'
relocatable = false
superuser = false
`;

const DEPLOY: Record<string, string> = {
  'schemas/auth/schema': 'CREATE SCHEMA auth;',
  'schemas/auth/tables/users': 'CREATE TABLE auth.users (id int PRIMARY KEY);',
  'schemas/billing/schema': 'CREATE SCHEMA billing;'
};

function write(rel: string, content: string): void {
  const file = join(sourceDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeEach(() => {
  sourceDir = mkdtempSync(join(tmpdir(), 'pgpm-bundle-src-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  writeFileSync(join(sourceDir, 'my-module.control'), CONTROL);
  for (const [change, sql] of Object.entries(DEPLOY)) {
    write(`deploy/${change}.sql`, `-- Deploy ${change}\nBEGIN;\n${sql}\nCOMMIT;\n`);
    write(`revert/${change}.sql`, `-- Revert ${change}\nBEGIN;\nDROP THING;\nCOMMIT;\n`);
    if (change !== 'schemas/billing/schema') {
      write(`verify/${change}.sql`, `-- Verify ${change}\nBEGIN;\nSELECT 1;\nROLLBACK;\n`);
    }
  }
});

afterEach(() => {
  rmSync(sourceDir, { recursive: true, force: true });
});

describe('createBundle', () => {
  it('captures ordered changes, control, and digests', () => {
    const bundle = createBundle(readModule(sourceDir));

    expect(bundle.manifest.name).toBe('my-module');
    expect(bundle.manifest.formatVersion).toBe('1');
    expect(bundle.manifest.changeCount).toBe(3);
    expect(bundle.manifest.deployOrder).toEqual([
      'schemas/auth/schema',
      'schemas/auth/tables/users',
      'schemas/billing/schema'
    ]);
    expect(bundle.manifest.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(bundle.control).not.toBeNull();

    const users = bundle.changes.find(c => c.name === 'schemas/auth/tables/users')!;
    expect(users.dependencies).toEqual(['schemas/auth/schema']);
    expect(users.deploy!.digest).toMatch(/^[0-9a-f]{64}$/);

    const billing = bundle.changes.find(c => c.name === 'schemas/billing/schema')!;
    expect(billing.verify).toBeNull();
  });

  it('is deterministic; provenance and createdWith do not affect the digest', () => {
    const a = createBundle(readModule(sourceDir));
    const b = createBundle(readModule(sourceDir), {
      createdWith: 'other-tool@9.9.9',
      provenance: { metaschemaRevision: 'abc123', profile: 'tier' }
    });

    expect(b.manifest.digest).toBe(a.manifest.digest);
    expect(b.manifest.provenance).toEqual({ metaschemaRevision: 'abc123', profile: 'tier' });
    expect(b.manifest.createdWith).toBe('other-tool@9.9.9');
  });
});

describe('verifyBundle', () => {
  it('passes for a freshly created bundle', () => {
    expect(verifyBundle(createBundle(readModule(sourceDir)))).toEqual([]);
  });

  it('detects tampered SQL via the script digest', () => {
    const bundle = createBundle(readModule(sourceDir));
    bundle.changes[0].deploy!.sql = 'DROP DATABASE prod;';
    expect(verifyBundle(bundle).map(i => i.kind)).toContain('script-digest');
  });

  it('detects a tampered plan via the bundle digest', () => {
    const bundle = createBundle(readModule(sourceDir));
    bundle.plan = bundle.plan + '\nsneaky/change 2024-01-01T00:00:09Z Dev <dev@example.com> # x\n';
    expect(verifyBundle(bundle).map(i => i.kind)).toContain('bundle-digest');
  });

  it('detects reordered changes', () => {
    const bundle = createBundle(readModule(sourceDir));
    bundle.changes.reverse();
    expect(verifyBundle(bundle).map(i => i.kind)).toContain('order-mismatch');
  });
});

describe('bundle file IO', () => {
  it('round-trips through JSON', () => {
    const bundle = bundleFromModule(sourceDir);
    const file = join(mkdtempSync(join(tmpdir(), 'pgpm-bundle-io-')), 'pgpm-bundle.json');
    writeBundleFile(bundle, file);
    const reread = readBundleFile(file);
    expect(reread).toEqual(bundle);
    expect(verifyBundle(reread)).toEqual([]);
  });
});

describe('materializeBundle', () => {
  it('reproduces a deployable module byte-for-byte and preserves the digest', () => {
    const bundle = bundleFromModule(sourceDir);
    const outDir = mkdtempSync(join(tmpdir(), 'pgpm-bundle-mat-'));
    try {
      materializeBundle(bundle, outDir);

      expect(readFileSync(join(outDir, 'pgpm.plan'), 'utf-8')).toBe(PLAN);
      expect(readFileSync(join(outDir, 'my-module.control'), 'utf-8')).toBe(CONTROL);
      for (const [change, sql] of Object.entries(DEPLOY)) {
        expect(readFileSync(join(outDir, 'deploy', `${change}.sql`), 'utf-8')).toBe(
          `-- Deploy ${change}\nBEGIN;\n${sql}\nCOMMIT;\n`
        );
      }
      // round-trip: re-bundling the materialized module yields the same digest
      expect(bundleFromModule(outDir).manifest.digest).toBe(bundle.manifest.digest);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
