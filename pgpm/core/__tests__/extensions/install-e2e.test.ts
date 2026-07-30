import { CoreDeployTestFixture } from '../../test-utils/CoreDeployTestFixture';
import { TestDatabase } from '../../test-utils/TestDatabase';

describe('declarative extension install (e2e) — extensions.json provides', () => {
  let fixture: CoreDeployTestFixture;
  let db: TestDatabase;

  const path = ['extensions', 'install'];

  const extensionSchema = async (extname: string): Promise<string | undefined> => {
    const res = await db.query(
      `SELECT n.nspname FROM pg_catalog.pg_extension e
       JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
       WHERE e.extname = $1`,
      [extname]
    );
    return res.rows[0]?.nspname;
  };

  const functionExists = async (schema: string, name: string): Promise<boolean> => {
    const res = await db.query(
      `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = $1 AND p.proname = $2`,
      [schema, name]
    );
    return res.rows.length > 0;
  };

  beforeAll(() => {
    fixture = new CoreDeployTestFixture('extensions', 'install');
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  beforeEach(async () => {
    db = await fixture.setupTestDatabase();
    // The grant targets need to exist; the workspace role map renames the
    // conceptual `administrator` to `service_role`.
    await db.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
       END $$;`
    );
  });

  test('installs pgcrypto into the declared schema with routed grants (no dynamic EXECUTE)', async () => {
    // Fresh DB: pgcrypto is NOT pre-installed. The manifest drives placement.
    expect(await extensionSchema('pgcrypto')).toBeUndefined();

    await fixture.deployModule('crypto-ext', db.name, path);

    // pgcrypto landed in `extensions`, not public.
    expect(await extensionSchema('pgcrypto')).toBe('extensions');

    // the module's function resolves the schema-qualified extension symbols
    expect(await functionExists('app', 'hash_pw')).toBe(true);
    const hashed = await db.query(`SELECT app.hash_pw('secret') AS h`);
    expect(typeof hashed.rows[0].h).toBe('string');
    expect(hashed.rows[0].h.length).toBeGreaterThan(0);

    // the grant's conceptual `administrator` was routed to `service_role`
    const priv = await db.query(
      `SELECT has_schema_privilege('service_role', 'extensions', 'usage') AS ok`
    );
    expect(priv.rows[0].ok).toBe(true);
    const priv2 = await db.query(
      `SELECT has_schema_privilege('authenticated', 'extensions', 'usage') AS ok`
    );
    expect(priv2.rows[0].ok).toBe(true);
  });

  test('verify passes and revert drops the module (extension install-site left intact)', async () => {
    await fixture.deployModule('crypto-ext', db.name, path);
    await fixture.verifyModule('crypto-ext', db.name, path);

    await fixture.revertModule('crypto-ext', db.name, path);
    expect(await functionExists('app', 'hash_pw')).toBe(false);
    expect(await db.exists('schema', 'app')).toBe(false);
  });
});
