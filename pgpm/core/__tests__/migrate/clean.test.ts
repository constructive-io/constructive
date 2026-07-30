import { cleanSql } from '../../src/migrate/clean';

describe('cleanSql', () => {
  it('strips transaction-control statements (pgpm owns the transaction)', async () => {
    const sql = [
      'BEGIN;',
      'CREATE TABLE app.thing (id int);',
      'COMMIT;'
    ].join('\n');
    const cleaned = await cleanSql(sql, false, '$EOFCODE$');
    expect(cleaned).not.toMatch(/\bBEGIN\b/i);
    expect(cleaned).not.toMatch(/\bCOMMIT\b/i);
    expect(cleaned).toMatch(/CREATE TABLE app\.thing/i);
  });

  it('preserves CREATE EXTENSION and its dependent statements together', async () => {
    // Regression: previously CREATE EXTENSION was stripped while the dependent
    // COMMENT ON EXTENSION survived, leaving a dangling reference that aborted
    // deploy with `extension "..." does not exist`.
    const sql = [
      'CREATE SCHEMA IF NOT EXISTS graphql;',
      'CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;',
      "COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';"
    ].join('\n');
    const cleaned = await cleanSql(sql, false, '$EOFCODE$');
    expect(cleaned).toMatch(/CREATE EXTENSION IF NOT EXISTS pg_graphql/i);
    expect(cleaned).toMatch(/COMMENT ON EXTENSION pg_graphql/i);
  });

  it('returns the input unchanged when there is nothing to strip', async () => {
    const sql = 'CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;';
    const cleaned = await cleanSql(sql, false, '$EOFCODE$');
    expect(cleaned).toBe(sql);
  });
});
