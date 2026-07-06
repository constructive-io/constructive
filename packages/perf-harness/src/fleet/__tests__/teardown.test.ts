import { buildWhere } from '../teardown';

describe('buildWhere — tenant selection SQL', () => {
  test('--only matches an exact name (single param)', () => {
    expect(buildWhere({ only: 'factory101', prefix: 'factory', keep: 40 })).toEqual({
      sql: 'name = $1',
      params: ['factory101']
    });
  });

  test('prefix/keep drops every `<prefix><n>` above --keep', () => {
    const w = buildWhere({ only: null, prefix: 'factory', keep: 40 });
    expect(w.sql).toBe(`name ~ ('^' || $1 || '[0-9]+$') AND (regexp_replace(name, '^' || $1, ''))::int > $2`);
    expect(w.params).toEqual(['factory', 40]);
  });

  test('--only takes precedence over prefix/keep', () => {
    const w = buildWhere({ only: 'marketplace_db_tenant1', prefix: 'factory', keep: 40 });
    expect(w.sql).toBe('name = $1');
    expect(w.params).toEqual(['marketplace_db_tenant1']);
  });

  test('a custom prefix/keep is threaded through as params (no interpolation)', () => {
    const w = buildWhere({ only: undefined, prefix: 'loadtest', keep: 0 });
    expect(w.params).toEqual(['loadtest', 0]);
  });
});
