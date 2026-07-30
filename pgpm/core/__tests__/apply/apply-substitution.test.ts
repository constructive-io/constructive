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

const at = '/ws/packages/crm-app/pgpm.apply.json';

describe('apply spec parsing — exclude + rebind routes', () => {
  it('accepts an exclude block with rebind routes', () => {
    const spec = parseApplySpec(
      JSON.stringify({
        source: 'crm-module',
        schemas: { app: 'crm' },
        exclude: { schemas: ['identity'] },
        route: [
          { fromSchema: 'identity', kind: 'table', name: 'users', toSchema: 'app_auth' },
          {
            fromSchema: 'identity',
            kind: 'function',
            name: 'current_actor',
            toSchema: null,
            toName: 'current_user_id'
          }
        ]
      }),
      at
    );
    expect(spec.exclude).toEqual({ schemas: ['identity'] });
    expect(spec.route![1]).toEqual({
      fromSchema: 'identity',
      kind: 'function',
      name: 'current_actor',
      toSchema: null,
      toName: 'current_user_id'
    });
  });

  it('accepts a pure rename route (toName only)', () => {
    const spec = parseApplySpec(
      JSON.stringify({
        source: 'crm-module',
        route: [{ fromSchema: 'identity', kind: 'function', name: 'current_actor', toName: 'whoami' }]
      }),
      at
    );
    expect(spec.route![0].toName).toBe('whoami');
    expect(spec.route![0].toSchema).toBeUndefined();
  });

  it('accepts an exclude-only spec', () => {
    const spec = parseApplySpec(
      JSON.stringify({ source: 'crm-module', exclude: { schemas: ['identity'] } }),
      at
    );
    expect(spec.exclude!.schemas).toEqual(['identity']);
  });

  it.each([
    [{ source: 'x', exclude: {} }, /"exclude" must be/],
    [{ source: 'x', exclude: { schemas: [] } }, /"exclude" must be/],
    [{ source: 'x', exclude: { schemas: ['a', ''] } }, /"exclude" must be/],
    [
      { source: 'x', route: [{ fromSchema: 'a', kind: 'table', name: 'n' }] },
      /"toSchema" \(schema \| null\) and\/or "toName"/
    ],
    [
      { source: 'x', route: [{ fromSchema: 'a', kind: 'table', name: 'n', toSchema: '' }] },
      /route" entry/
    ],
    [
      { source: 'x', route: [{ fromSchema: 'a', kind: 'table', name: 'n', toName: '' }] },
      /route" entry/
    ]
  ])('rejects invalid exclude/route specs %#', (spec, err) => {
    expect(() => parseApplySpec(JSON.stringify(spec), at)).toThrow(err);
  });
});

describe('materializeApplyModule — subsystem substitution', () => {
  let fixture: TestFixture;

  beforeAll(() => {
    fixture = new TestFixture('apply', 'substitution');
  });

  afterAll(() => fixture.cleanup());

  it('drops the excluded subsystem and rebinds survivors onto the provider', async () => {
    const sourceDir = fixture.fixturePath('packages', 'crm-module');
    const spec = readApplySpec(fixture.fixturePath('packages', 'crm-app'));
    const { bundle, outDir } = await materializeApplyModule({ sourceDir, spec });
    try {
      // the excluded subsystem's changes are dropped from the artifact
      // entirely — not emitted as empty tombstones (those collide on the
      // deploy ledger's script-hash uniqueness)
      expect(bundle.changes.find(c => c.name === 'schemas/identity/tables/users/table')).toBeUndefined();
      expect(bundle.changes.find(c => c.name === 'schemas/identity/schema')).toBeUndefined();
      expect(bundle.changes.find(c => c.name === 'schemas/identity/procedures/current_actor')).toBeUndefined();
      // and their names never appear in a survivor's plan dependencies
      expect(bundle.plan).not.toMatch(/schemas\/identity\//);

      // surviving app changes are transpiled and rebound onto the provider
      const notes = bundle.changes.find(c => c.name === 'schemas/crm/tables/notes/table')!;
      expect(notes.deploy!.sql).toMatch(/CREATE TABLE crm\.notes/i);
      expect(notes.deploy!.sql).toMatch(/REFERENCES app_auth\.users/i);
      expect(notes.deploy!.sql).not.toMatch(/identity\./);

      const policy = bundle.changes.find(c => c.name === 'schemas/crm/policies/notes_owner')!;
      expect(policy.deploy!.sql).toMatch(/app_auth\.current_user_id\s*\(\)/i);
      // the rebind rewrote the predicate (the `-- requires:` header still
      // names the source change — the tombstone keeps its identity)
      expect(policy.deploy!.sql).not.toMatch(/identity\.current_actor/);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('refuses exclusion when a surviving reference has no rebind target', async () => {
    const sourceDir = fixture.fixturePath('packages', 'crm-module');
    const spec = parseApplySpec(
      JSON.stringify({
        source: 'crm-module',
        name: 'crm-app',
        schemas: { app: 'crm' },
        exclude: { schemas: ['identity'] },
        route: [{ fromSchema: 'identity', kind: 'table', name: 'users', toSchema: 'app_auth' }]
      }),
      at
    );
    await expect(materializeApplyModule({ sourceDir, spec })).rejects.toThrow(
      /identity\.current_actor.*no route\/rebind target/s
    );
  });
});

describe('apply substitution deployment (e2e)', () => {
  let fixture: CoreDeployTestFixture;
  let db: TestDatabase;

  beforeAll(() => {
    fixture = new CoreDeployTestFixture('apply', 'substitution');
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  beforeEach(async () => {
    clearApplyMaterializationCache();
    db = await fixture.setupTestDatabase();
  });

  test('deploys the substituted instance against the installed provider', async () => {
    await fixture.deployModule('auth-provider', db.name, ['apply', 'substitution']);
    await fixture.deployModule('crm-app', db.name, ['apply', 'substitution']);

    // the excluded subsystem never lands
    expect(await db.exists('schema', 'identity')).toBe(false);

    // the provider and the substituted app both do
    expect(await db.exists('table', 'app_auth.users')).toBe(true);
    expect(await db.exists('table', 'crm.notes')).toBe(true);

    // the FK was rebound onto the provider's users table
    const user = await db.query(
      `INSERT INTO app_auth.users DEFAULT VALUES RETURNING id`
    );
    const uid = user.rows[0].id;
    await db.query(`INSERT INTO crm.notes (owner, body) VALUES ($1, 'hi')`, [uid]);
    await expect(
      db.query(`INSERT INTO crm.notes (owner, body) VALUES (gen_random_uuid(), 'nope')`)
    ).rejects.toThrow(/foreign key/i);

    // the RLS policy predicate was rebound onto the provider accessor
    const policy = await db.query(
      `SELECT qual FROM pg_policies WHERE schemaname = 'crm' AND tablename = 'notes'`
    );
    expect(policy.rows[0].qual).toContain('current_user_id');
    expect(policy.rows[0].qual).not.toContain('current_actor');
  });

  test('verify and revert work against the substituted instance', async () => {
    await fixture.deployModule('auth-provider', db.name, ['apply', 'substitution']);
    await fixture.deployModule('crm-app', db.name, ['apply', 'substitution']);

    await fixture.verifyModule('crm-app', db.name, ['apply', 'substitution']);

    await fixture.revertModule('crm-app', db.name, ['apply', 'substitution']);
    expect(await db.exists('table', 'crm.notes')).toBe(false);
    // the provider is an independent module and survives the instance revert
    expect(await db.exists('table', 'app_auth.users')).toBe(true);
  });
});
