import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { bundleFromModule, materializeBundle, transpileBundle, verifyBundle } from '../../src/bundle';

let sourceDir: string;

const PLAN = `%syntax-version=1.0.0
%project=my-module
%uri=my-module

schemas/auth/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # add schema
schemas/auth/tables/users [schemas/auth/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # add users
schemas/billing/schema [schemas/auth/schema] 2024-01-01T00:00:02Z Dev <dev@example.com> # add billing
`;

const DEPLOY: Record<string, string> = {
  'schemas/auth/schema': 'CREATE SCHEMA auth;',
  'schemas/auth/tables/users': 'CREATE TABLE auth.users (id int PRIMARY KEY);',
  'schemas/billing/schema': 'CREATE SCHEMA billing;'
};

const SCHEMA_MAP: Record<string, string> = { auth: 'tenant_auth', billing: 'tenant_billing' };

// Caller-supplied change-name remap (path segment) and SQL body remap. In
// production constructive-db drives these with the pgsql-parser AST; here a
// word-boundary replace stands in — core itself stays parser-agnostic.
const renameChange = (name: string): string =>
  name.replace(
    /(^|\/)schemas\/(auth|billing)(\/|$)/g,
    (_m, pre, schema, suf) => `${pre}schemas/${SCHEMA_MAP[schema]}${suf}`
  );

const transformScript = (sql: string): string =>
  sql.replace(/\bauth\b/g, 'tenant_auth').replace(/\bbilling\b/g, 'tenant_billing');

function write(rel: string, content: string): void {
  const file = join(sourceDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeEach(() => {
  sourceDir = mkdtempSync(join(tmpdir(), 'pgpm-transpile-src-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  for (const [change, sql] of Object.entries(DEPLOY)) {
    write(`deploy/${change}.sql`, `-- Deploy ${change}\nBEGIN;\n${sql}\nCOMMIT;\n`);
    write(`revert/${change}.sql`, `-- Revert ${change}\nBEGIN;\nDROP THING;\nCOMMIT;\n`);
  }
});

afterEach(() => {
  rmSync(sourceDir, { recursive: true, force: true });
});

describe('transpileBundle', () => {
  it('remaps change names, plan deps, headers, and SQL bodies into a new namespace', () => {
    const src = bundleFromModule(sourceDir);
    const out = transpileBundle(src, { renameChange, transformScript });

    expect(out.manifest.deployOrder).toEqual([
      'schemas/tenant_auth/schema',
      'schemas/tenant_auth/tables/users',
      'schemas/tenant_billing/schema'
    ]);

    const users = out.changes.find(c => c.name === 'schemas/tenant_auth/tables/users')!;
    expect(users.dependencies).toEqual(['schemas/tenant_auth/schema']);
    expect(users.deploy!.sql).toContain('-- Deploy schemas/tenant_auth/tables/users');
    expect(users.deploy!.sql).toContain('CREATE TABLE tenant_auth.users');

    expect(out.plan).toContain(
      'schemas/tenant_auth/tables/users [schemas/tenant_auth/schema]'
    );
    expect(out.plan).not.toContain('schemas/auth/');
  });

  it('produces a self-consistent, verifiable bundle with a new digest', () => {
    const src = bundleFromModule(sourceDir);
    const out = transpileBundle(src, { renameChange, transformScript });

    expect(verifyBundle(out)).toEqual([]);
    expect(out.manifest.digest).not.toBe(src.manifest.digest);
    // every script digest matches its (transformed) SQL
    expect(verifyBundle(out).length).toBe(0);
  });

  it('records source lineage in provenance without perturbing the digest', () => {
    const src = bundleFromModule(sourceDir);
    const out = transpileBundle(src, {
      renameChange,
      transformScript,
      provenance: { targetNamespace: 'tenant' }
    });

    expect(out.manifest.provenance).toMatchObject({
      targetNamespace: 'tenant',
      sourceBundleDigest: src.manifest.digest
    });
    // provenance-only difference must not change the content digest
    const bare = transpileBundle(src, { renameChange, transformScript });
    expect(out.manifest.digest).toBe(bare.manifest.digest);
  });

  it('is an identity transform (same digest) with no options', () => {
    const src = bundleFromModule(sourceDir);
    expect(transpileBundle(src).manifest.digest).toBe(src.manifest.digest);
  });

  it('is deterministic', () => {
    const src = bundleFromModule(sourceDir);
    const a = transpileBundle(src, { renameChange, transformScript });
    const b = transpileBundle(src, { renameChange, transformScript });
    expect(a).toEqual(b);
  });

  it('materializes into a deployable module that re-bundles to the same digest', () => {
    const src = bundleFromModule(sourceDir);
    const out = transpileBundle(src, { renameChange, transformScript });
    const outDir = mkdtempSync(join(tmpdir(), 'pgpm-transpile-out-'));
    try {
      materializeBundle(out, outDir);
      expect(readFileSync(join(outDir, 'deploy/schemas/tenant_auth/schema.sql'), 'utf-8')).toContain(
        'CREATE SCHEMA tenant_auth;'
      );
      expect(bundleFromModule(outDir).manifest.digest).toBe(out.manifest.digest);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects a rename that collapses two changes onto one name', () => {
    const src = bundleFromModule(sourceDir);
    expect(() =>
      transpileBundle(src, { renameChange: () => 'schemas/x/schema' })
    ).toThrow(/renames both/);
  });
});
