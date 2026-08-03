import { loadModule } from 'plpgsql-parser';

import { coverChanges, diffChangeSets, DiffInputChange } from '../src/semantic-diff-driver';

beforeAll(async () => {
  await loadModule();
});

const change = (name: string, deploy: string, dependencies: string[] = []): DiffInputChange => ({
  name,
  dependencies,
  deploy
});

const V1: DiffInputChange[] = [
  change('schema', 'CREATE SCHEMA app;'),
  change('users', 'CREATE TABLE app.users (id uuid PRIMARY KEY, name text);', ['schema']),
  change(
    'user_count',
    'CREATE FUNCTION app.user_count() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM app.users $$;',
    ['users']
  )
];

describe('coverChanges', () => {
  it('marks every change satisfied when the sides are identical', () => {
    const diff = diffChangeSets(V1, V1);
    const coverage = coverChanges(V1, diff);
    expect(coverage.map(c => c.status)).toEqual(['satisfied', 'satisfied', 'satisfied']);
  });

  it('is rename/reorder-proof: a regenerated plan covers the same', () => {
    // Same objects, different change names, different order, different grouping.
    const regenerated: DiffInputChange[] = [
      change(
        'everything/base',
        ['CREATE SCHEMA app;', 'CREATE TABLE app.users (id uuid PRIMARY KEY, name text);'].join('\n')
      ),
      change(
        'procs/count',
        'CREATE FUNCTION app.user_count() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM app.users $$;'
      )
    ];
    const diff = diffChangeSets(V1, regenerated);
    expect(diff.identical).toBe(true);
    const coverage = coverChanges(regenerated, diff);
    expect(coverage.map(c => c.status)).toEqual(['satisfied', 'satisfied']);
  });

  it('classifies genuinely new changes as unsatisfied', () => {
    const v2 = [
      ...V1,
      change('posts', 'CREATE TABLE app.posts (id uuid PRIMARY KEY, author uuid);', ['users'])
    ];
    const diff = diffChangeSets(V1, v2);
    const coverage = coverChanges(v2, diff);
    expect(coverage.find(c => c.name === 'posts')!.status).toBe('unsatisfied');
    expect(coverage.filter(c => c.name !== 'posts').every(c => c.status === 'satisfied')).toBe(true);
  });

  it('classifies a modified object as unsatisfied and mixed changes as partial', () => {
    const v2 = [
      change('schema', 'CREATE SCHEMA app;'),
      change('users', 'CREATE TABLE app.users (id uuid PRIMARY KEY, name text, email text);', ['schema']),
      change(
        'count_and_posts',
        [
          'CREATE FUNCTION app.user_count() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM app.users $$;',
          'CREATE TABLE app.posts (id uuid PRIMARY KEY);'
        ].join('\n')
      )
    ];
    const diff = diffChangeSets(V1, v2);
    const coverage = coverChanges(v2, diff);
    expect(coverage.find(c => c.name === 'users')!.status).toBe('unsatisfied');
    expect(coverage.find(c => c.name === 'count_and_posts')!.status).toBe('partial');
  });

  it('reports per-object deltas with naming-spec paths', () => {
    const v2 = [...V1, change('posts', 'CREATE TABLE app.posts (id uuid PRIMARY KEY);')];
    const diff = diffChangeSets(V1, v2);
    const posts = coverChanges(v2, diff).find(c => c.name === 'posts')!;
    expect(posts.objects).toEqual([
      { path: 'schemas/app/tables/posts/table', delta: 'added' }
    ]);
  });
});
