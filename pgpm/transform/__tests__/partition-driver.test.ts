import { loadModule } from 'plpgsql-parser';

import { PartitionCycleError, partitionUnits } from '../src/partition-driver';

beforeAll(async () => {
  await loadModule();
});

const SQL = [
  'CREATE SCHEMA app;',
  'CREATE SCHEMA billing;',
  'CREATE TABLE app.users (id uuid PRIMARY KEY);',
  'CREATE TABLE billing.invoices (id uuid PRIMARY KEY, user_id uuid REFERENCES app.users (id));',
  'CREATE FUNCTION app.user_count() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM app.users $$;',
  'ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;',
  'CREATE POLICY users_self ON app.users FOR SELECT USING (id = current_setting(\'jwt.claims.user_id\')::uuid);',
  'GRANT SELECT ON app.users TO authenticated;'
].join('\n');

describe('partitionUnits', () => {
  it('assigns whole schemas to packages and derives cross-package requires', () => {
    const result = partitionUnits(SQL, {
      rules: [
        { package: 'pkg-billing', select: [{ schema: 'billing' }] }
      ],
      defaultPackage: 'pkg-app'
    });

    const billing = result.packages.find(p => p.name === 'pkg-billing')!;
    expect(billing.changes.map(c => c.name)).toEqual([
      'schemas/billing/schema',
      'schemas/billing/tables/invoices/table'
    ]);
    expect(billing.requires).toEqual(['pkg-app']);

    const invoices = billing.changes.find(c => c.name === 'schemas/billing/tables/invoices/table')!;
    expect(invoices.dependencies).toContain('pkg-app:schemas/app/tables/users/table');
    expect(invoices.dependencies).toContain('schemas/billing/schema');

    const app = result.packages.find(p => p.name === 'pkg-app')!;
    expect(app.requires).toEqual([]);
    expect(app.changes.map(c => c.name)).toContain('schemas/app/tables/users/table');
  });

  it('cherry-picks single objects by kind, name, and path', () => {
    const result = partitionUnits(SQL, {
      rules: [
        { package: 'pkg-fns', select: [{ kind: 'function', schema: 'app' }] },
        { package: 'pkg-security', select: [{ kind: 'policy', table: 'users' }] },
        { package: 'pkg-billing', select: [{ path: 'schemas/billing/tables/invoices/table' }] }
      ],
      defaultPackage: 'pkg-app'
    });

    expect(result.assignments.get('schemas/app/procedures/user_count/procedure')).toBe('pkg-fns');
    expect(result.assignments.get('schemas/app/tables/users/policies/users_self/policy')).toBe('pkg-security');
    expect(result.assignments.get('schemas/billing/tables/invoices/table')).toBe('pkg-billing');
    expect(result.assignments.get('schemas/billing/schema')).toBe('pkg-app');
  });

  it('grants ride with the object they attach to by default', () => {
    const result = partitionUnits(SQL, {
      rules: [],
      defaultPackage: 'pkg-app'
    });
    const users = result.packages[0].changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(users.deploy).toContain('GRANT SELECT');

    const rls = result.packages[0].changes.find(
      c => c.name === 'schemas/app/tables/users/policies/enable_row_level_security'
    )!;
    expect(rls.deploy).toContain('ENABLE ROW LEVEL SECURITY');
  });

  it('splits grants into selectable units and partitions them separately', () => {
    const result = partitionUnits(SQL, {
      splitRiders: ['grant'],
      rules: [
        { package: 'pkg-security', select: [{ statementKind: 'grant' }, { kind: 'policy' }] }
      ],
      defaultPackage: 'pkg-app'
    });

    const security = result.packages.find(p => p.name === 'pkg-security')!;
    const grant = security.changes.find(c => c.deploy.includes('GRANT SELECT'))!;
    expect(grant.name).toBe('schemas/app/tables/users/table/grants/authenticated');
    expect(grant.dependencies).toContain('pkg-app:schemas/app/tables/users/table');
    expect(security.requires).toEqual(['pkg-app']);

    const app = result.packages.find(p => p.name === 'pkg-app')!;
    const users = app.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(users.deploy).not.toContain('GRANT SELECT');
  });

  it('pulls the dependency closure of a package when closure is set', () => {
    const result = partitionUnits(SQL, {
      rules: [
        { package: 'pkg-billing', select: [{ path: 'schemas/billing/tables/invoices/table' }], closure: true }
      ],
      defaultPackage: 'pkg-app'
    });

    expect(result.assignments.get('schemas/billing/schema')).toBe('pkg-billing');
    expect(result.assignments.get('schemas/app/tables/users/table')).toBe('pkg-billing');
    expect(result.closureIncluded.get('schemas/billing/schema')).toBe('pkg-billing');
  });

  it('closure never steals units another rule claimed', () => {
    const result = partitionUnits(SQL, {
      rules: [
        { package: 'pkg-app-core', select: [{ schema: 'app' }] },
        { package: 'pkg-billing', select: [{ schema: 'billing' }], closure: true }
      ],
      defaultPackage: 'pkg-app'
    });

    expect(result.assignments.get('schemas/app/tables/users/table')).toBe('pkg-app-core');
    const billing = result.packages.find(p => p.name === 'pkg-billing')!;
    expect(billing.requires).toContain('pkg-app-core');
  });

  it('rejects cross-package dependency cycles', () => {
    const cyclic = [
      'CREATE SCHEMA a;',
      'CREATE SCHEMA b;',
      'CREATE TABLE a.t1 (id uuid PRIMARY KEY);',
      'CREATE TABLE b.t2 (id uuid PRIMARY KEY, t1_id uuid REFERENCES a.t1 (id));',
      'CREATE TABLE a.t3 (id uuid PRIMARY KEY, t2_id uuid REFERENCES b.t2 (id));'
    ].join('\n');

    expect(() =>
      partitionUnits(cyclic, {
        rules: [{ package: 'pkg-b', select: [{ schema: 'b' }] }],
        defaultPackage: 'pkg-a'
      })
    ).toThrow(PartitionCycleError);
  });

  it('accepts pgpm changes as input and warns on dynamic SQL', () => {
    const result = partitionUnits(
      [
        { name: 'x', dependencies: [], deploy: 'CREATE SCHEMA app;' },
        {
          name: 'y',
          dependencies: [],
          deploy: [
            'CREATE FUNCTION app.dyn() RETURNS void LANGUAGE plpgsql AS $$',
            'BEGIN EXECUTE \'SELECT 1\'; END $$;'
          ].join('\n')
        }
      ],
      { rules: [], defaultPackage: 'pkg-app' }
    );

    expect(result.packages).toHaveLength(1);
    expect(result.warnings.some(w => w.includes('dynamic SQL'))).toBe(true);
  });
});
