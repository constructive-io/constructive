import { mergeSqlStatements } from '../../src/packaging/package';

/**
 * The round-trip check (parse -> deparse -> reparse) must ignore positional
 * metadata. PG17+ emits list_start/list_end (A_ArrayExpr) and
 * rexpr_list_start/rexpr_list_end (A_Expr IN lists), which shift whenever the
 * deparsed SQL is formatted differently than the source.
 */
describe('AST round-trip diff detection', () => {
  it('does not flag ARRAY[...] expressions', async () => {
    const { diff } = await mergeSqlStatements(
      `CREATE TABLE things (
         id int,
         tags text[] DEFAULT ARRAY['a', 'b', 'c']::text[]
       );`,
      {}
    );
    expect(diff).toBeUndefined();
  });

  it('does not flag IN (...) lists', async () => {
    const { diff } = await mergeSqlStatements(
      `SELECT * FROM things WHERE id IN (1, 2, 3);`,
      {}
    );
    expect(diff).toBeUndefined();
  });

  it.each([
    ['CREATE FUNCTION', 'CREATE FUNCTION f() RETURNS integer AS $$SELECT 1$$ LANGUAGE sql;'],
    ['NOTIFY', "NOTIFY c,    'x';"],
    ['CREATE SUBSCRIPTION', "CREATE SUBSCRIPTION sub CONNECTION    'dbname=postgres' PUBLICATION pub;"],
    ['ALTER SUBSCRIPTION', "ALTER SUBSCRIPTION sub CONNECTION    'dbname=postgres';"]
  ])('ignores parser offsets when deparsing %s', async (_statement, sql) => {
    const { diff } = await mergeSqlStatements(sql);
    expect(diff).toBeUndefined();
  });
});
