import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { extractSqlFacts, loadModule, slicePlan } from '../../src/slice';

beforeAll(async () => {
  await loadModule();
});

describe('extractSqlFacts', () => {
  test('extracts creates and qualified references from plain SQL', () => {
    const facts = extractSqlFacts(
      'CREATE TABLE app.orders (id serial PRIMARY KEY, user_id int REFERENCES auth.users(id), status app.order_status);'
    );
    expect(facts.creates).toEqual([{ schema: 'app', name: 'orders' }]);
    expect(facts.references).toContainEqual({ schema: 'auth', name: 'users' });
    expect(facts.references).toContainEqual({ schema: 'app', name: 'order_status' });
    expect(facts.dynamicSql).toBe(false);
  });

  test('extracts function calls and table references inside plpgsql bodies', () => {
    const facts = extractSqlFacts(`
CREATE FUNCTION app.get_order_total(order_id int) RETURNS numeric AS $$
DECLARE
  total numeric;
BEGIN
  SELECT sum(li.amount) INTO total
  FROM app.line_items li
  WHERE li.order_id = get_order_total.order_id;
  RETURN app.apply_discount(total);
END;
$$ LANGUAGE plpgsql;
`);
    expect(facts.creates).toEqual([{ schema: 'app', name: 'get_order_total' }]);
    expect(facts.references).toContainEqual({ schema: 'app', name: 'line_items' });
    expect(facts.references).toContainEqual({ schema: 'app', name: 'apply_discount' });
  });

  test('extracts trigger function references', () => {
    const facts = extractSqlFacts(
      'CREATE TRIGGER orders_audit AFTER INSERT ON app.orders FOR EACH ROW EXECUTE FUNCTION audit.log_change();'
    );
    expect(facts.creates).toEqual([{ schema: 'app', name: 'orders.orders_audit' }]);
    expect(facts.references).toContainEqual({ schema: 'audit', name: 'log_change' });
    expect(facts.references).toContainEqual({ schema: 'app', name: 'orders' });
  });

  test('flags dynamic SQL in plpgsql bodies', () => {
    const facts = extractSqlFacts(`
CREATE FUNCTION app.run_dynamic(q text) RETURNS void AS $$
BEGIN
  EXECUTE q;
END;
$$ LANGUAGE plpgsql;
`);
    expect(facts.dynamicSql).toBe(true);
  });

  test('ignores unqualified and catalog references', () => {
    const facts = extractSqlFacts(
      'CREATE VIEW app.v AS SELECT now(), c.relname FROM pg_catalog.pg_class c JOIN local_table t ON true;'
    );
    expect(facts.references).toEqual([]);
  });
});

describe('slicePlan closure expansion', () => {
  let tempDir: string;

  const writeDeploy = (change: string, sql: string): void => {
    const p = join(tempDir, 'deploy', `${change}.sql`);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, sql);
  };

  beforeEach(() => {
    tempDir = join(tmpdir(), `slice-closure-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writePlan(content: string): string {
    const planPath = join(tempDir, 'pgpm.plan');
    writeFileSync(planPath, content);
    return planPath;
  }

  test('pulls transitive AST-discovered dependencies into a cherry-picked slice', () => {
    // schemas/api/functions/get_totals calls billing.calc_total (no requires
    // header for it); billing.calc_total reads billing.invoices.
    const planPath = writePlan(`%syntax-version=1.0.0
%project=mono
%uri=mono

schemas/billing/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # billing schema
schemas/billing/tables/invoices [schemas/billing/schema] 2024-01-02T00:00:00Z Dev <dev@example.com> # invoices
schemas/billing/functions/calc_total [schemas/billing/schema] 2024-01-03T00:00:00Z Dev <dev@example.com> # calc_total
schemas/api/schema 2024-01-04T00:00:00Z Dev <dev@example.com> # api schema
schemas/api/functions/get_totals [schemas/api/schema] 2024-01-05T00:00:00Z Dev <dev@example.com> # get_totals
`);

    writeDeploy('schemas/billing/schema', 'CREATE SCHEMA billing;');
    writeDeploy('schemas/billing/tables/invoices',
      'CREATE TABLE billing.invoices (id serial PRIMARY KEY, amount numeric);');
    writeDeploy('schemas/billing/functions/calc_total', `
CREATE FUNCTION billing.calc_total() RETURNS numeric AS $$
BEGIN
  RETURN (SELECT sum(amount) FROM billing.invoices);
END;
$$ LANGUAGE plpgsql;
`);
    writeDeploy('schemas/api/schema', 'CREATE SCHEMA api;');
    writeDeploy('schemas/api/functions/get_totals', `
CREATE FUNCTION api.get_totals() RETURNS numeric AS $$
BEGIN
  RETURN billing.calc_total();
END;
$$ LANGUAGE plpgsql;
`);

    const result = slicePlan({
      sourcePlan: planPath,
      outputDir: join(tempDir, 'out'),
      strategy: {
        type: 'pattern',
        slices: [
          { packageName: 'api', patterns: ['schemas/api/**'], closure: true }
        ]
      },
      defaultPackage: 'rest',
      closure: { moduleDir: tempDir }
    });

    const api = result.packages.find(p => p.name === 'api')!;
    const names = api.changes.map(c => c.name);
    expect(names).toContain('schemas/api/functions/get_totals');
    // AST-discovered: get_totals -> calc_total (not in requires header)
    expect(names).toContain('schemas/billing/functions/calc_total');
    // AST-discovered: calc_total body -> billing.invoices
    expect(names).toContain('schemas/billing/tables/invoices');
    // declared requires: calc_total -> billing schema
    expect(names).toContain('schemas/billing/schema');

    const report = result.closureReport!;
    const calcTotal = report.autoIncluded.find(a => a.change === 'schemas/billing/functions/calc_total')!;
    expect(calcTotal.reason).toBe('ast');
    expect(calcTotal.ref).toBe('billing.calc_total');
    expect(calcTotal.requiredBy).toBe('schemas/api/functions/get_totals');
    const invoices = report.autoIncluded.find(a => a.change === 'schemas/billing/tables/invoices')!;
    expect(invoices.reason).toBe('ast');
    expect(invoices.ref).toBe('billing.invoices');
  });

  test('does not steal changes claimed by another explicit slice', () => {
    const planPath = writePlan(`%syntax-version=1.0.0
%project=mono
%uri=mono

schemas/billing/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # billing schema
schemas/billing/functions/calc_total [schemas/billing/schema] 2024-01-02T00:00:00Z Dev <dev@example.com> # calc_total
schemas/api/schema 2024-01-03T00:00:00Z Dev <dev@example.com> # api schema
schemas/api/functions/get_totals [schemas/api/schema] 2024-01-04T00:00:00Z Dev <dev@example.com> # get_totals
`);

    writeDeploy('schemas/billing/schema', 'CREATE SCHEMA billing;');
    writeDeploy('schemas/billing/functions/calc_total',
      'CREATE FUNCTION billing.calc_total() RETURNS numeric AS $$ SELECT 1::numeric $$ LANGUAGE sql;');
    writeDeploy('schemas/api/schema', 'CREATE SCHEMA api;');
    writeDeploy('schemas/api/functions/get_totals', `
CREATE FUNCTION api.get_totals() RETURNS numeric AS $$
BEGIN
  RETURN billing.calc_total();
END;
$$ LANGUAGE plpgsql;
`);

    const result = slicePlan({
      sourcePlan: planPath,
      outputDir: join(tempDir, 'out'),
      strategy: {
        type: 'pattern',
        slices: [
          { packageName: 'billing', patterns: ['schemas/billing/**'] },
          { packageName: 'api', patterns: ['schemas/api/**'], closure: true }
        ]
      },
      defaultPackage: 'rest',
      closure: { moduleDir: tempDir }
    });

    const api = result.packages.find(p => p.name === 'api')!;
    const names = api.changes.map(c => c.name);
    expect(names).not.toContain('schemas/billing/functions/calc_total');
    // stays a cross-package dependency instead
    expect(api.packageDependencies).toContain('billing');
    expect(result.closureReport!.autoIncluded).toEqual([]);
  });

  test('reports unresolved references and dynamic SQL', () => {
    const planPath = writePlan(`%syntax-version=1.0.0
%project=mono
%uri=mono

schemas/api/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # api schema
schemas/api/functions/dyn [schemas/api/schema] 2024-01-02T00:00:00Z Dev <dev@example.com> # dyn
`);

    writeDeploy('schemas/api/schema', 'CREATE SCHEMA api;');
    writeDeploy('schemas/api/functions/dyn', `
CREATE FUNCTION api.dyn() RETURNS void AS $$
BEGIN
  PERFORM external_module.some_fn();
  EXECUTE 'SELECT 1';
END;
$$ LANGUAGE plpgsql;
`);

    const result = slicePlan({
      sourcePlan: planPath,
      outputDir: join(tempDir, 'out'),
      strategy: {
        type: 'pattern',
        slices: [
          { packageName: 'api', patterns: ['schemas/api/**'], closure: true }
        ]
      },
      defaultPackage: 'rest',
      closure: { moduleDir: tempDir }
    });

    const report = result.closureReport!;
    expect(report.dynamicSqlChanges).toContain('schemas/api/functions/dyn');
    expect(report.unresolvedReferences).toContainEqual({
      change: 'schemas/api/functions/dyn',
      ref: 'external_module.some_fn'
    });
  });

  test('no closure expansion without opt-in', () => {
    const planPath = writePlan(`%syntax-version=1.0.0
%project=mono
%uri=mono

schemas/api/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # api schema
`);
    writeDeploy('schemas/api/schema', 'CREATE SCHEMA api;');

    const result = slicePlan({
      sourcePlan: planPath,
      outputDir: join(tempDir, 'out'),
      strategy: {
        type: 'pattern',
        slices: [{ packageName: 'api', patterns: ['schemas/api/**'] }]
      },
      defaultPackage: 'rest'
    });

    expect(result.closureReport).toBeUndefined();
  });
});
