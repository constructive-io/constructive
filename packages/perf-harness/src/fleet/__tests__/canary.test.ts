import { valueForColumn } from '../canary';

describe('valueForColumn — required-column value synthesis', () => {
  const name = 'CANARY-factory7';
  const slug = 'canary-factory7';

  test('the name column always gets the canary name', () => {
    expect(valueForColumn({ column_name: 'name', data_type: 'text' }, name, slug)).toBe(name);
    // name wins even when the declared type would otherwise map elsewhere
    expect(valueForColumn({ column_name: 'name', data_type: 'integer' }, name, slug)).toBe(name);
  });

  test('the slug column gets the canary slug', () => {
    expect(valueForColumn({ column_name: 'slug', data_type: 'text' }, name, slug)).toBe(slug);
  });

  test('text / char / citext columns get the slug', () => {
    expect(valueForColumn({ column_name: 'title', data_type: 'character varying' }, name, slug)).toBe(slug);
    expect(valueForColumn({ column_name: 'body', data_type: 'text' }, name, slug)).toBe(slug);
    expect(valueForColumn({ column_name: 'handle', data_type: 'USER-DEFINED', udt_name: 'citext' }, name, slug)).toBe(
      slug
    );
  });

  test('boolean columns get true', () => {
    expect(valueForColumn({ column_name: 'is_active', data_type: 'boolean' }, name, slug)).toBe(true);
  });

  test('numeric columns get 0', () => {
    for (const data_type of ['integer', 'bigint', 'smallint', 'numeric', 'double precision', 'real']) {
      expect(valueForColumn({ column_name: 'qty', data_type }, name, slug)).toBe(0);
    }
  });

  test('unknown required column types are unsynthesizable (undefined)', () => {
    expect(valueForColumn({ column_name: 'meta', data_type: 'jsonb' }, name, slug)).toBeUndefined();
    expect(valueForColumn({ column_name: 'created_at', data_type: 'timestamp with time zone' }, name, slug)).toBeUndefined();
    expect(valueForColumn({ column_name: 'tags', data_type: 'ARRAY', udt_name: '_text' }, name, slug)).toBeUndefined();
  });

  test('missing type metadata falls through to undefined (not a crash)', () => {
    expect(valueForColumn({ column_name: 'mystery' }, name, slug)).toBeUndefined();
  });
});
