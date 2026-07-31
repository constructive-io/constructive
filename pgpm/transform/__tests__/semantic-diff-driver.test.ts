import { loadModule } from 'plpgsql-parser';

import { DiffInputChange, diffChangeSets, diffSchemas } from '../src/semantic-diff-driver';

beforeAll(async () => {
  await loadModule();
});

const BASE = [
  'CREATE SCHEMA app;',
  'CREATE TABLE app.users (id uuid PRIMARY KEY, name text);',
  'CREATE FUNCTION app.user_count() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM app.users $$;',
  'CREATE VIEW app.active_users AS SELECT * FROM app.users;'
].join('\n');

describe('diffSchemas', () => {
  it('is identical for the same schema regardless of formatting', () => {
    const reformatted = BASE.replace(/ \(/g, '  (').replace(/, /g, ' ,  ');
    const result = diffSchemas(BASE, reformatted);
    expect(result.identical).toBe(true);
    expect(result.changes).toEqual([]);
  });

  it('is dial-invariant: atomic vs consolidated table authorship diffs equal', () => {
    const atomic = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.users ();',
      'ALTER TABLE app.users ADD COLUMN id uuid;',
      'ALTER TABLE app.users ADD COLUMN name text;'
    ].join('\n');
    const consolidated = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.users (id uuid, name text);'
    ].join('\n');
    const result = diffSchemas(atomic, consolidated);
    expect(result.identical).toBe(true);
  });

  it('emits added objects as changes through the granularity pipeline', () => {
    const to = `${BASE}\nCREATE TABLE app.posts (id uuid PRIMARY KEY, author uuid REFERENCES app.users (id));`;
    const result = diffSchemas(BASE, to);

    expect(result.objects).toEqual([
      expect.objectContaining({ delta: 'added', path: 'schemas/app/tables/posts/table' })
    ]);
    const posts = result.changes.find(c => c.name === 'schemas/app/tables/posts/table')!;
    expect(posts.deploy).toContain('CREATE TABLE app.posts');
  });

  it('diffs tables column-by-column', () => {
    const to = BASE
      .replace('name text', 'name text, email text')
      .replace('id uuid PRIMARY KEY, name', 'id uuid PRIMARY KEY, name');
    const result = diffSchemas(BASE, to);

    const users = result.objects.find(o => o.path === 'schemas/app/tables/users/table')!;
    expect(users.delta).toBe('modified');
    expect(users.columnsAdded).toEqual(['email']);
    expect(users.columnsRemoved).toEqual([]);

    const change = result.changes.find(c => c.name.startsWith('schemas/app/tables/users/table'))!;
    expect(change.deploy).toContain('ADD COLUMN email text');
    expect(change.deploy).not.toContain('CREATE TABLE');
  });

  it('emits column drops and type changes', () => {
    const to = BASE.replace('name text', 'name varchar');
    const result = diffSchemas(BASE, to);
    const change = result.changes.find(c => c.name.startsWith('schemas/app/tables/users/table'))!;
    expect(change.deploy).toContain('ALTER COLUMN name TYPE varchar');

    const dropped = diffSchemas(BASE, BASE.replace(', name text', ''));
    const users = dropped.objects.find(o => o.path === 'schemas/app/tables/users/table')!;
    expect(users.columnsRemoved).toEqual(['name']);
  });

  it('recreates modified non-table objects via DROP + CREATE', () => {
    const to = BASE.replace('count(*)', 'count(1)');
    const result = diffSchemas(BASE, to);

    const fn = result.objects.find(o => o.path === 'schemas/app/procedures/user_count/procedure')!;
    expect(fn.delta).toBe('modified');
    const change = result.changes.find(c => c.name === 'schemas/app/procedures/user_count/procedure')!;
    expect(change.deploy).toContain('DROP FUNCTION app.user_count');
    expect(change.deploy).toContain('CREATE FUNCTION app.user_count');
  });

  it('drops removed objects in reverse topological order', () => {
    const result = diffSchemas(BASE, 'CREATE SCHEMA app;\nCREATE TABLE app.users (id uuid PRIMARY KEY, name text);');

    const dropNames = result.changes.filter(c => c.name.endsWith('/drop')).map(c => c.name);
    expect(dropNames).toEqual([
      'schemas/app/views/active_users/view/drop',
      'schemas/app/procedures/user_count/procedure/drop'
    ]);
    const view = result.changes.find(c => c.name === 'schemas/app/views/active_users/view/drop')!;
    expect(view.deploy).toContain('DROP VIEW app.active_users');
  });
});

describe('diffChangeSets', () => {
  it('ignores change names entirely — only identity matters', () => {
    const from: DiffInputChange[] = [
      { name: 'one-big-change', dependencies: [], deploy: BASE }
    ];
    const to: DiffInputChange[] = [
      { name: 'schemas/app/schema', dependencies: [], deploy: 'CREATE SCHEMA app;' },
      { name: 'users', dependencies: ['schemas/app/schema'], deploy: 'CREATE TABLE app.users (id uuid PRIMARY KEY, name text);' },
      { name: 'fn', dependencies: ['users'], deploy: 'CREATE FUNCTION app.user_count() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM app.users $$;' },
      { name: 'view', dependencies: ['users'], deploy: 'CREATE VIEW app.active_users AS SELECT * FROM app.users;' }
    ];
    const result = diffChangeSets(from, to);
    expect(result.identical).toBe(true);
    expect(result.changes).toEqual([]);
  });
});
