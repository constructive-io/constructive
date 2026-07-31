import { preprocessDumpText } from '../src/dump-source';
import { importDumpRows, MISC_CHANGE_PATH } from '../src/import';

const sourceOf = (text: string) => ({ files: ['test.sql'], ...preprocessDumpText(text) });

const PREAMBLE = [
  'SET statement_timeout = 0;',
  'SET lock_timeout = 0;',
  "SELECT pg_catalog.set_config('search_path', '', false);",
  'SET default_table_access_method = heap;'
].join('\n');

describe('importDumpRows', () => {
  it('skips pg_dump preamble noise and counts it', async () => {
    const result = await importDumpRows(sourceOf(`${PREAMBLE}\nCREATE SCHEMA app;`));
    expect(result.summary.skippedPreamble).toBe(4);
    expect(result.rows.map(r => r.deploy)).toEqual(['schemas/app/schema']);
  });

  it('attaches COMMENT/GRANT/OWNER riders to their host change', async () => {
    const result = await importDumpRows(
      sourceOf(
        [
          'CREATE SCHEMA app;',
          'CREATE TABLE app.users (id int PRIMARY KEY);',
          'ALTER SCHEMA app OWNER TO postgres;',
          "COMMENT ON TABLE app.users IS 'users';",
          "COMMENT ON COLUMN app.users.id IS 'pk';",
          'GRANT SELECT ON TABLE app.users TO PUBLIC;',
          'GRANT USAGE ON SCHEMA app TO PUBLIC;'
        ].join('\n')
      )
    );
    const byPath = new Map(result.rows.map(r => [r.deploy, r]));
    const schema = byPath.get('schemas/app/schema')!;
    const table = byPath.get('schemas/app/tables/users/table')!;
    expect(schema.content).toContain('OWNER TO postgres');
    expect(schema.content).toContain('GRANT USAGE ON SCHEMA app');
    expect(table.content).toContain("COMMENT ON TABLE app.users IS 'users'");
    expect(table.content).toContain("COMMENT ON COLUMN app.users.id IS 'pk'");
    expect(table.content).toContain('GRANT SELECT ON');
    expect(result.rows.some(r => r.deploy === MISC_CHANGE_PATH)).toBe(false);
  });

  it('folds pg_dump late-FK ALTER TABLE ONLY ... ADD CONSTRAINT at object granularity', async () => {
    const result = await importDumpRows(
      sourceOf(
        [
          'CREATE SCHEMA app;',
          'CREATE TABLE app.orders (id int PRIMARY KEY, user_id int NOT NULL);',
          'CREATE TABLE app.users (id int PRIMARY KEY);',
          'ALTER TABLE ONLY app.orders ADD CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES app.users(id);'
        ].join('\n')
      ),
      { granularity: 'consolidated' }
    );
    const orders = result.rows.find(r => r.deploy === 'schemas/app/tables/orders/table')!;
    expect(orders.content).toContain('orders_user_fk');
    expect(orders.deps).toContain('schemas/app/tables/users/table');
    // prerequisites come before dependents in plan order
    const paths = result.rows.map(r => r.deploy);
    expect(paths.indexOf('schemas/app/tables/users/table')).toBeLessThan(
      paths.indexOf('schemas/app/tables/orders/table')
    );
  });

  it('routes CREATE EXTENSION into control requires', async () => {
    const result = await importDumpRows(
      sourceOf('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;\nCREATE SCHEMA app;')
    );
    expect(result.controlRequires).toEqual(['pgcrypto']);
    expect(result.rows.map(r => r.deploy)).toEqual(['schemas/app/schema']);
  });

  it('places unclassifiable statements in misc/ with a warning, never dropping them', async () => {
    const result = await importDumpRows(
      sourceOf('CREATE ROLE import_test_role;\nCREATE SCHEMA app;')
    );
    const misc = result.rows.find(r => r.deploy === MISC_CHANGE_PATH)!;
    expect(misc.content).toContain('CREATE ROLE import_test_role');
    expect(result.warnings.some(w => w.includes('CreateRoleStmt'))).toBe(true);
    expect(result.summary.misc).toBe(1);
  });

  it('skips data by default with a warning', async () => {
    const result = await importDumpRows(
      sourceOf(
        [
          'CREATE SCHEMA app;',
          'CREATE TABLE app.users (id int);',
          'COPY app.users (id) FROM stdin;',
          '1',
          '\\.',
          'INSERT INTO app.users (id) VALUES (2);'
        ].join('\n')
      )
    );
    expect(result.summary.skippedData).toBe(2);
    expect(result.warnings.some(w => w.includes('--with-data'))).toBe(true);
    expect(result.rows.some(r => r.deploy.includes('fixtures'))).toBe(false);
  });

  it('emits seed fixture changes with --with-data, depending on their table', async () => {
    const result = await importDumpRows(
      sourceOf(
        [
          'CREATE SCHEMA app;',
          'CREATE TABLE app.users (id int PRIMARY KEY);',
          'CREATE TABLE app.orders (id int PRIMARY KEY, user_id int REFERENCES app.users(id));',
          'COPY app.users (id) FROM stdin;',
          '1',
          '\\.',
          'COPY app.orders (id, user_id) FROM stdin;',
          '10\t1',
          '\\.'
        ].join('\n')
      ),
      { withData: true }
    );
    const userSeed = result.rows.find(r => r.deploy === 'schemas/app/tables/users/fixtures/seed')!;
    const orderSeed = result.rows.find(r => r.deploy === 'schemas/app/tables/orders/fixtures/seed')!;
    expect(userSeed.content).toContain('INSERT INTO app.users');
    expect(userSeed.deps).toContain('schemas/app/tables/users/table');
    expect(orderSeed.deps).toContain('schemas/app/tables/orders/table');
    // FK: orders seed must come after users seed
    expect(orderSeed.deps).toContain('schemas/app/tables/users/fixtures/seed');
    expect(result.summary.skippedData).toBe(0);
  });

  it('keeps change paths unique when the same object is altered repeatedly', async () => {
    const result = await importDumpRows(
      sourceOf(
        [
          'CREATE SCHEMA app;',
          'CREATE TABLE app.users (id int PRIMARY KEY);',
          'ALTER TABLE app.users ADD COLUMN email text;',
          'ALTER TABLE app.users ADD COLUMN phone text;'
        ].join('\n')
      ),
      { granularity: 'atomic' }
    );
    const paths = result.rows.map(r => r.deploy);
    expect(new Set(paths).size).toBe(paths.length);
    const table = result.rows.find(r => r.deploy === 'schemas/app/tables/users/table')!;
    expect(table.content).toContain('email');
    expect(table.content).toContain('phone');
  });

  it('supports flat naming (kind tokens dropped from paths)', async () => {
    const result = await importDumpRows(
      sourceOf(
        [
          'CREATE SCHEMA app;',
          'CREATE FUNCTION app.touch() RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;'
        ].join('\n')
      ),
      { naming: 'flat' }
    );
    const paths = result.rows.map(r => r.deploy);
    expect(paths).toContain('schemas/app/procedures/touch');
    expect(paths).not.toContain('schemas/app/procedures/touch/procedure');
  });
});
