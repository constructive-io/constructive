import { rmSync } from 'fs';

import {
  clearApplyMaterializationCache,
  materializeApplyModule,
  parseApplySpec,
  readApplySpec
} from '../../src/apply';
import { CoreDeployTestFixture } from '../../test-utils/CoreDeployTestFixture';
import { TestDatabase } from '../../test-utils/TestDatabase';
import { TestFixture } from '../../test-utils/TestFixture';

const at = '/ws/packages/secure-a/pgpm.apply.json';

describe('apply spec parsing — extensions & roles', () => {
  it('accepts an extension route + role map alongside a schema default', () => {
    const spec = parseApplySpec(
      JSON.stringify({
        source: 'secure-module',
        schemas: { vault: 'vault_a' },
        extensions: { toSchema: 'extensions' },
        roles: { anonymous: 'anon', administrator: 'service_role' }
      }),
      at
    );
    expect(spec.extensions).toEqual({ toSchema: 'extensions' });
    expect(spec.roles).toEqual({ anonymous: 'anon', administrator: 'service_role' });
  });

  it('accepts a null toSchema (strip qualification) and explicit per-extension routes', () => {
    const strip = parseApplySpec(
      JSON.stringify({ source: 'm', extensions: { toSchema: null } }),
      at
    );
    expect(strip.extensions).toEqual({ toSchema: null });

    const routed = parseApplySpec(
      JSON.stringify({
        source: 'm',
        extensions: { routes: { pgcrypto: { to: 'extensions' }, citext: { to: null } } }
      }),
      at
    );
    expect(routed.extensions!.routes).toEqual({
      pgcrypto: { to: 'extensions' },
      citext: { to: null }
    });
  });

  it('accepts an extensions-only or roles-only spec (no schema move)', () => {
    expect(() =>
      parseApplySpec(JSON.stringify({ source: 'm', extensions: { toSchema: 'extensions' } }), at)
    ).not.toThrow();
    expect(() =>
      parseApplySpec(JSON.stringify({ source: 'm', roles: { anonymous: 'anon' } }), at)
    ).not.toThrow();
  });

  it.each([
    [{ source: 'm', extensions: [] }, /"extensions" must be an object/],
    [{ source: 'm', extensions: {} }, /needs "toSchema".*or "routes"/],
    [{ source: 'm', extensions: { toSchema: 5 } }, /"extensions.toSchema" must be/],
    [{ source: 'm', extensions: { routes: { x: {} } } }, /extensions.routes.x/],
    [{ source: 'm', extensions: { toSchema: 'e', only: [1] } }, /"extensions.only"/],
    [{ source: 'm', roles: {} }, /"roles" must be a non-empty/],
    [{ source: 'm', roles: { a: 1 } }, /"roles" must be a non-empty/]
  ])('rejects invalid extension/role specs %#', (spec, err) => {
    expect(() => parseApplySpec(JSON.stringify(spec), at)).toThrow(err);
  });
});

describe('materializeApplyModule — extension & role routing', () => {
  let fixture: TestFixture;

  beforeAll(() => {
    fixture = new TestFixture('apply', 'portability');
  });

  afterAll(() => fixture.cleanup());

  it('routes provided-symbol references to a schema and renames roles', async () => {
    const sourceDir = fixture.fixturePath('packages', 'secure-module');
    const spec = readApplySpec(fixture.fixturePath('packages', 'secure-a'));
    const { bundle, outDir } = await materializeApplyModule({ sourceDir, spec });
    try {
      const fn = bundle.changes.find(c => c.name === 'schemas/vault_a/functions/hash_pw')!;
      // schema routing: object lands in the per-instance schema
      expect(fn.deploy!.sql).toContain('vault_a.hash_pw');
      // extension symbols are qualified into the extensions schema
      expect(fn.deploy!.sql).toMatch(/extensions\.crypt/);
      expect(fn.deploy!.sql).toMatch(/extensions\.gen_salt/);
      // roles are renamed (identifiers only)
      expect(fn.deploy!.sql).toMatch(/TO anon\b/);
      expect(fn.deploy!.sql).toMatch(/TO service_role\b/);
      expect(fn.deploy!.sql).not.toMatch(/\banonymous\b/);
      expect(fn.deploy!.sql).not.toMatch(/\badministrator\b/);
      // the source module itself is never referenced
      expect(fn.deploy!.sql).not.toMatch(/\bvault\.hash_pw\b/);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('supports the reverse direction — stripping qualification back to bare', async () => {
    const sourceDir = fixture.fixturePath('packages', 'secure-module');
    const spec = parseApplySpec(
      JSON.stringify({
        name: 'secure-bare',
        source: 'secure-module',
        schemas: { vault: 'vault_bare' },
        // simulate a source that already qualifies into `extensions`, then strip it
        extensions: { toSchema: null, from: ['extensions', null] }
      }),
      at
    );
    const { bundle, outDir } = await materializeApplyModule({ sourceDir, spec });
    try {
      const fn = bundle.changes.find(c => c.name === 'schemas/vault_bare/functions/hash_pw')!;
      // bare source references stay bare (no accidental qualification)
      expect(fn.deploy!.sql).toMatch(/\bcrypt\(/);
      expect(fn.deploy!.sql).not.toMatch(/extensions\.crypt/);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe('apply extension & role routing deployment (e2e)', () => {
  let fixture: CoreDeployTestFixture;
  let db: TestDatabase;

  const functionExists = async (schema: string, name: string): Promise<boolean> => {
    const res = await db.query(
      `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = $1 AND p.proname = $2`,
      [schema, name]
    );
    return res.rows.length > 0;
  };

  beforeAll(() => {
    fixture = new CoreDeployTestFixture('apply', 'portability');
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  beforeEach(async () => {
    clearApplyMaterializationCache();
    db = await fixture.setupTestDatabase();
    // The consumer environment already hosts the extension in a dedicated
    // `extensions` schema (the portability scenario we route symbols toward),
    // and defines the renamed roles. Provisioning the extension install-site
    // and roles is out of the transform's scope (declarative install manifest
    // is the follow-up); the transform's job is to make the source's bare
    // `crypt()`/`gen_salt()` refs and its role grants line up with this shape.
    await db.query('CREATE SCHEMA IF NOT EXISTS extensions');
    await db.query('CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions');
    await db.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
       END $$;`
    );
  });

  test('qualifies extension symbols + renames roles across two instances', async () => {
    await fixture.deployModule('secure-a', db.name, ['apply', 'portability']);
    await fixture.deployModule('secure-b', db.name, ['apply', 'portability']);

    // source module is never deployed
    expect(await db.exists('schema', 'vault')).toBe(false);

    // both instances land their function in their own schema
    expect(await functionExists('vault_a', 'hash_pw')).toBe(true);
    expect(await functionExists('vault_b', 'hash_pw')).toBe(true);

    // the routed function resolves its (qualified) extension symbols and runs
    const a = await db.query(`SELECT vault_a.hash_pw('secret') AS h`);
    expect(typeof a.rows[0].h).toBe('string');
    expect(a.rows[0].h.length).toBeGreaterThan(0);

    // the renamed role holds the granted privilege (identifiers were rewritten)
    const priv = await db.query(
      `SELECT has_function_privilege('anon', 'vault_a.hash_pw(text)', 'execute') AS ok`
    );
    expect(priv.rows[0].ok).toBe(true);
  });

  test('verify and revert work against the routed instance', async () => {
    await fixture.deployModule('secure-a', db.name, ['apply', 'portability']);
    await fixture.verifyModule('secure-a', db.name, ['apply', 'portability']);

    await fixture.revertModule('secure-a', db.name, ['apply', 'portability']);
    expect(await functionExists('vault_a', 'hash_pw')).toBe(false);
    expect(await db.exists('schema', 'vault_a')).toBe(false);
  });
});
