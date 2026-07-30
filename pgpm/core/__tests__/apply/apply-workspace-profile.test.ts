import {
  clearApplyMaterializationCache,
  loadWorkspaceRoutingProfile,
  parseApplySpec,
  resolveEffectiveApplySpec
} from '../../src/apply';
import { CoreDeployTestFixture } from '../../test-utils/CoreDeployTestFixture';
import { TestDatabase } from '../../test-utils/TestDatabase';
import { TestFixture } from '../../test-utils/TestFixture';

const at = '/ws/packages/secure-a/pgpm.apply.json';

describe('resolveEffectiveApplySpec — workspace profile precedence', () => {
  const spec = parseApplySpec(
    JSON.stringify({ source: 'secure-module', schemas: { vault: 'vault_a' } }),
    at
  );

  it('no workspace profile: the spec passes through unchanged', () => {
    expect(resolveEffectiveApplySpec(spec, undefined)).toBe(spec);
  });

  it('workspace profile fills keys the spec does not define', () => {
    const effective = resolveEffectiveApplySpec(spec, {
      extensions: { toSchema: 'extensions' },
      roles: { anonymous: 'anon' }
    });
    expect(effective.schemas).toEqual({ vault: 'vault_a' });
    expect(effective.extensions).toEqual({ toSchema: 'extensions' });
    expect(effective.roles).toEqual({ anonymous: 'anon' });
    expect(effective.name).toBe(spec.name);
    expect(effective.source).toEqual(spec.source);
  });

  it('spec keys win whole over the workspace profile (per key)', () => {
    const withRoles = parseApplySpec(
      JSON.stringify({
        source: 'secure-module',
        schemas: { vault: 'vault_b' },
        roles: { anonymous: 'anon_b' }
      }),
      at
    );
    const effective = resolveEffectiveApplySpec(withRoles, {
      schemas: { vault: 'never' },
      extensions: { toSchema: 'extensions' },
      roles: { anonymous: 'anon', administrator: 'service_role' }
    });
    expect(effective.schemas).toEqual({ vault: 'vault_b' });
    expect(effective.roles).toEqual({ anonymous: 'anon_b' });
    expect(effective.extensions).toEqual({ toSchema: 'extensions' });
  });
});

describe('loadWorkspaceRoutingProfile', () => {
  let withProfile: TestFixture;
  let withoutProfile: TestFixture;

  beforeAll(() => {
    withProfile = new TestFixture('apply', 'workspace-profile');
    withoutProfile = new TestFixture('apply', 'portability');
  });

  afterAll(() => {
    withProfile.cleanup();
    withoutProfile.cleanup();
  });

  it('reads the portability field from the workspace pgpm.json', () => {
    expect(loadWorkspaceRoutingProfile(withProfile.tempFixtureDir)).toEqual({
      extensions: { toSchema: 'extensions' },
      roles: { anonymous: 'anon', administrator: 'service_role' }
    });
  });

  it('returns undefined when the workspace declares no profile', () => {
    expect(loadWorkspaceRoutingProfile(withoutProfile.tempFixtureDir)).toBeUndefined();
  });

  it('returns undefined when there is no workspace config at all', () => {
    expect(loadWorkspaceRoutingProfile(withProfile.fixturePath('packages'))).toBeUndefined();
  });
});

describe('workspace profile deployment (e2e)', () => {
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
    fixture = new CoreDeployTestFixture('apply', 'workspace-profile');
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  beforeEach(async () => {
    clearApplyMaterializationCache();
    db = await fixture.setupTestDatabase();
    await db.query('CREATE SCHEMA IF NOT EXISTS extensions');
    await db.query('CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions');
    await db.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon_b') THEN CREATE ROLE anon_b; END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role_b') THEN CREATE ROLE service_role_b; END IF;
       END $$;`
    );
  });

  test('a proxy with no routing beyond schemas inherits the workspace extensions + roles', async () => {
    await fixture.deployModule('secure-a', db.name, ['apply', 'workspace-profile']);

    expect(await db.exists('schema', 'vault')).toBe(false);
    expect(await functionExists('vault_a', 'hash_pw')).toBe(true);

    // extension symbols resolved via the workspace extensions mapping
    const a = await db.query(`SELECT vault_a.hash_pw('secret') AS h`);
    expect(typeof a.rows[0].h).toBe('string');

    // grants use the workspace role translation
    const priv = await db.query(
      `SELECT has_schema_privilege('service_role', 'vault_a', 'usage') AS ok`
    );
    expect(priv.rows[0].ok).toBe(true);
  });

  test('a proxy that overrides roles keeps the workspace extensions mapping', async () => {
    await fixture.deployModule('secure-b', db.name, ['apply', 'workspace-profile']);

    expect(await functionExists('vault_b', 'hash_pw')).toBe(true);

    // workspace extensions mapping still applies (function resolves crypt/gen_salt)
    const b = await db.query(`SELECT vault_b.hash_pw('secret') AS h`);
    expect(typeof b.rows[0].h).toBe('string');

    // the proxy's own role map wins over the workspace one
    const overridden = await db.query(
      `SELECT has_schema_privilege('service_role_b', 'vault_b', 'usage') AS ok`
    );
    expect(overridden.rows[0].ok).toBe(true);
    const workspaceRole = await db.query(
      `SELECT has_schema_privilege('service_role', 'vault_b', 'usage') AS ok`
    );
    expect(workspaceRole.rows[0].ok).toBe(false);
  });
});
