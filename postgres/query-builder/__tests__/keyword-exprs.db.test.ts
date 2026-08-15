import { getConnections, seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test/test-client';

import { col, fn, lit, param, QueryBuilder } from '../src/query-builder';

// The old output for these calls parsed but never ran (`"coalesce"(a, b)` →
// `function coalesce(...) does not exist`), so the SQL has to be executed to
// prove the fix, not just deparsed.

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections({}, [
    seed.fn(async ({ pg }) => {
      await pg.query(`
        CREATE TABLE nodes (
          id serial PRIMARY KEY,
          name text,
          nickname text,
          score int,
          floor int,
          state jsonb
        );
      `);
      await pg.query(`
        INSERT INTO nodes (name, nickname, score, floor, state) VALUES
          ('alice', NULL, 3, 10, '{"a": 1}'),
          ('bob', 'bobby', NULL, 5, NULL);
      `);
    })
  ]));
});

afterAll(() => teardown());

beforeEach(() => pg.beforeEach());
afterEach(() => pg.afterEach());

const run = async (qb: QueryBuilder) => {
  const { text, values } = qb.build();
  const { rows } = await pg.query(text, values);
  return rows;
};

describe('keyword expressions execute against PostgreSQL', () => {
  it('runs COALESCE', async () => {
    const rows = await run(
      new QueryBuilder()
        .table('nodes')
        .selectExpr('value', fn('coalesce', [col('nickname'), col('name')]))
        .orderBy('id')
    );

    expect(rows.map((r) => r.value)).toEqual(['alice', 'bobby']);
  });

  it('runs COALESCE with a parameter', async () => {
    const rows = await run(
      new QueryBuilder()
        .table('nodes')
        .selectExpr('value', fn('COALESCE', [col('score'), param(0)]))
        .orderBy('id')
    );

    expect(rows.map((r) => r.value)).toEqual([3, 0]);
  });

  it('runs NULLIF', async () => {
    const rows = await run(
      new QueryBuilder()
        .table('nodes')
        .selectExpr('value', fn('nullif', [col('name'), lit('alice')]))
        .orderBy('id')
    );

    expect(rows.map((r) => r.value)).toEqual([null, 'bob']);
  });

  it('runs GREATEST and LEAST', async () => {
    const rows = await run(
      new QueryBuilder()
        .table('nodes')
        .selectExpr('hi', fn('greatest', [col('floor'), lit(7)]))
        .selectExpr('lo', fn('least', [col('floor'), lit(7)]))
        .orderBy('id')
    );

    expect(rows).toEqual([
      { hi: 10, lo: 7 },
      { hi: 7, lo: 5 }
    ]);
  });

  it('runs the JSON merge that motivated the fix', async () => {
    const rows = await run(
      new QueryBuilder()
        .table('nodes')
        .update({
          state: fn('jsonb_set', [
            fn('coalesce', [col('state'), lit('{}')]),
            lit('{b}'),
            lit('2')
          ])
        })
        .where({ id: { equalTo: 2 } })
        .returning([{ expr: col('state'), as: 'state' }])
    );

    expect(rows).toEqual([{ state: { b: 2 } }]);
  });

  it('runs keyword names that really are functions', async () => {
    const rows = await run(
      new QueryBuilder()
        .table('nodes')
        .selectExpr('value', fn('substring', [col('name'), lit(1), lit(3)]))
        .orderBy('id')
    );

    expect(rows.map((r) => r.value)).toEqual(['ali', 'bob']);
  });
});
