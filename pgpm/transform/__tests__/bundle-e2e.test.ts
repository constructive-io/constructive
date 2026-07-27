/**
 * End-to-end: the real @pgpmjs/bundle pipeline driven by this package's
 * drivers. A pgpm module on disk goes bundleFromModule → transpileBundle
 * (renameChange + transformScript from makeSchemaTranspiler, one schema map
 * driving both dimensions) → verifyBundle → materializeBundle, and the
 * transpiled scripts pass makeNamespaceValidator for the target namespace.
 */
import {
  bundleFromModule,
  materializeBundle,
  transpileBundle,
  verifyBundle
} from '@pgpmjs/bundle';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { loadModule } from 'plpgsql-parser';

import { makeNamespaceValidator, makeSchemaTranspiler } from '../src/bundle-driver';

const SCHEMA_MAP = { auth: 'tenant_auth', billing: 'tenant_billing' };

const PLAN = `%syntax-version=1.0.0
%project=my-app
%uri=my-app

schemas/auth/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # add auth schema
schemas/auth/tables/users [schemas/auth/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # add users
schemas/billing/schema 2024-01-01T00:00:02Z Dev <dev@example.com> # add billing schema
schemas/billing/procedures/charge [schemas/billing/schema schemas/auth/tables/users] 2024-01-01T00:00:03Z Dev <dev@example.com> # add charge
`;

const SCRIPTS: Record<string, string> = {
  'deploy/schemas/auth/schema.sql': `-- Deploy my-app:schemas/auth/schema to pg

BEGIN;
CREATE SCHEMA auth;
COMMIT;
`,
  'deploy/schemas/auth/tables/users.sql': `-- Deploy my-app:schemas/auth/tables/users to pg
-- requires: schemas/auth/schema

BEGIN;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  auth text,
  note text DEFAULT 'auth'
);
COMMIT;
`,
  'deploy/schemas/billing/schema.sql': `-- Deploy my-app:schemas/billing/schema to pg

BEGIN;
CREATE SCHEMA billing;
COMMIT;
`,
  'deploy/schemas/billing/procedures/charge.sql': `-- Deploy my-app:schemas/billing/procedures/charge to pg
-- requires: schemas/billing/schema
-- requires: schemas/auth/tables/users

BEGIN;
CREATE FUNCTION billing.charge(user_id uuid) RETURNS void AS $$
BEGIN
  PERFORM 1 FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
COMMIT;
`,
  'revert/schemas/auth/schema.sql': `-- Revert my-app:schemas/auth/schema from pg

BEGIN;
DROP SCHEMA auth;
COMMIT;
`,
  'verify/schemas/auth/tables/users.sql': `-- Verify my-app:schemas/auth/tables/users on pg

BEGIN;
SELECT id FROM auth.users WHERE FALSE;
ROLLBACK;
`
};

let sourceDir: string;

beforeAll(async () => {
  await loadModule();
  sourceDir = mkdtempSync(join(tmpdir(), 'transform-bundle-e2e-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  for (const [rel, sql] of Object.entries(SCRIPTS)) {
    const file = join(sourceDir, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, sql);
  }
});

afterAll(() => {
  rmSync(sourceDir, { recursive: true, force: true });
});

describe('bundle transpile end-to-end', () => {
  it('transpiles both dimensions from one schema map and stays verifiable', () => {
    const source = bundleFromModule(sourceDir);
    expect(verifyBundle(source)).toEqual([]);

    const { renameChange, transformScript, result } = makeSchemaTranspiler({
      schemaMap: SCHEMA_MAP
    });
    const transpiled = transpileBundle(source, { renameChange, transformScript });

    // fresh, internally consistent artifact with lineage
    expect(verifyBundle(transpiled)).toEqual([]);
    expect(transpiled.manifest.digest).not.toBe(source.manifest.digest);
    expect(transpiled.manifest.provenance?.sourceBundleDigest).toBe(source.manifest.digest);

    // structural dimension: change names, plan lines, dependency refs
    expect(transpiled.manifest.deployOrder).toEqual([
      'schemas/tenant_auth/schema',
      'schemas/tenant_auth/tables/users',
      'schemas/tenant_billing/schema',
      'schemas/tenant_billing/procedures/charge'
    ]);
    expect(transpiled.plan).toContain(
      'schemas/tenant_billing/procedures/charge [schemas/tenant_billing/schema schemas/tenant_auth/tables/users]'
    );
    expect(transpiled.plan).not.toMatch(/schemas\/(auth|billing)\//);

    // AST dimension: schema refs rewritten, incl. inside the PL/pgSQL body
    const users = transpiled.changes.find(c => c.name === 'schemas/tenant_auth/tables/users')!;
    expect(users.deploy!.sql).toContain('CREATE TABLE tenant_auth.users');
    // a column named `auth` and the string literal 'auth' are untouched
    expect(users.deploy!.sql).toContain('auth text');
    expect(users.deploy!.sql).toContain("DEFAULT 'auth'");
    expect(users.verify!.sql).toContain('FROM tenant_auth.users');

    const charge = transpiled.changes.find(c => c.name === 'schemas/tenant_billing/procedures/charge')!;
    expect(charge.deploy!.sql).toContain('CREATE FUNCTION tenant_billing.charge');
    expect(charge.deploy!.sql).toContain('FROM tenant_auth.users');
    expect(charge.deploy!.sql).toMatch(/-- Deploy my-app:schemas\/tenant_billing\/procedures\/charge to pg/);
    expect(charge.deploy!.sql).toContain('-- requires: schemas/tenant_auth/tables/users');

    // driver report accumulated across all scripts
    expect([...result.schemasTransformed.keys()].sort()).toEqual(['auth', 'billing']);
    expect(result.errors).toEqual([]);
  });

  it('namespace validator gates the transpiled bundle (and flags the source)', () => {
    const source = bundleFromModule(sourceDir);
    const { renameChange, transformScript } = makeSchemaTranspiler({ schemaMap: SCHEMA_MAP });
    const transpiled = transpileBundle(source, { renameChange, transformScript });

    const validate = makeNamespaceValidator({
      allowedSchemas: ['tenant_auth', 'tenant_billing']
    });

    for (const change of transpiled.changes) {
      for (const script of [change.deploy, change.revert, change.verify]) {
        if (!script) continue;
        expect(validate(script.sql, { change: change.name, kind: script.kind })).toEqual([]);
      }
    }

    // the untranspiled source violates the target namespace
    const sourceUsers = source.changes.find(c => c.name === 'schemas/auth/tables/users')!;
    const violations = validate(sourceUsers.deploy!.sql, {
      change: sourceUsers.name,
      kind: 'deploy'
    });
    expect(violations.some(v => v.includes('auth.users'))).toBe(true);
  });

  it('materializes the transpiled bundle into a deployable module that re-bundles identically', () => {
    const source = bundleFromModule(sourceDir);
    const { renameChange, transformScript } = makeSchemaTranspiler({ schemaMap: SCHEMA_MAP });
    const transpiled = transpileBundle(source, { renameChange, transformScript });

    const outDir = mkdtempSync(join(tmpdir(), 'transform-bundle-e2e-out-'));
    try {
      materializeBundle(transpiled, outDir);

      expect(readFileSync(join(outDir, 'pgpm.plan'), 'utf-8')).toBe(transpiled.plan);
      const deployed = readFileSync(
        join(outDir, 'deploy', 'schemas/tenant_billing/procedures/charge.sql'),
        'utf-8'
      );
      expect(deployed).toContain('CREATE FUNCTION tenant_billing.charge');

      // round-trip: re-bundling the materialized module preserves the digest
      expect(bundleFromModule(outDir).manifest.digest).toBe(transpiled.manifest.digest);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
