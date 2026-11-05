import { loadModule } from 'plpgsql-parser';

import { diffChangeSets, DiffInputChange, diffSchemas } from '../src/semantic-diff-driver';

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

  it('derives revert and verify for every emitted change via @pgsql/scripts', () => {
    const to = `${BASE}\nCREATE TABLE app.posts (id uuid PRIMARY KEY);`;
    const added = diffSchemas(BASE, to).changes.find(c => c.name === 'schemas/app/tables/posts/table')!;
    expect(added.revert).toContain('DROP TABLE app.posts');
    expect(added.verify).toContain('to_regclass');

    const modified = diffSchemas(BASE, BASE.replace('count(*)', 'count(1)'))
      .changes.find(c => c.name === 'schemas/app/procedures/user_count/procedure')!;
    expect(modified.revert).toContain('CREATE OR REPLACE FUNCTION app.user_count');
    expect(modified.revert).toContain('count(*)');
    expect(modified.verify).toContain('to_regprocedure');

    const alterUsers = diffSchemas(BASE, BASE.replace('name text', 'name text, email text'))
      .changes.find(c => c.name === 'schemas/app/tables/users/table/alter')!;
    expect(alterUsers.deploy).toContain('ADD COLUMN email text');
    expect(alterUsers.revert).toContain('DROP COLUMN email');

    const dropped = diffSchemas(BASE, BASE.replace('CREATE VIEW app.active_users AS SELECT * FROM app.users;', ''))
      .changes.find(c => c.name === 'schemas/app/views/active_users/view/drop')!;
    expect(dropped.deploy).toContain('DROP VIEW app.active_users');
    expect(dropped.revert).toContain('CREATE VIEW app.active_users');
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
    const result = diffSchemas(BASE, to, { allowDataLoss: true });
    const change = result.changes.find(c => c.name.startsWith('schemas/app/tables/users/table'))!;
    expect(change.deploy).toContain('ALTER COLUMN name TYPE varchar');

    const dropped = diffSchemas(BASE, BASE.replace(', name text', ''), { allowDataLoss: true });
    const users = dropped.objects.find(o => o.path === 'schemas/app/tables/users/table')!;
    expect(users.columnsRemoved).toEqual(['name']);
  });

  it('replaces a same-signature function body with CREATE OR REPLACE (dependents keep working)', () => {
    const to = BASE.replace('count(*)', 'count(1)');
    const result = diffSchemas(BASE, to);

    const fn = result.objects.find(o => o.path === 'schemas/app/procedures/user_count/procedure')!;
    expect(fn.delta).toBe('modified');
    const change = result.changes.find(c => c.name === 'schemas/app/procedures/user_count/procedure')!;
    expect(change.deploy).not.toContain('DROP FUNCTION');
    expect(change.deploy).toContain('CREATE OR REPLACE FUNCTION app.user_count');
    expect(change.deploy).toContain('count(1)');
    expect(change.revert).toContain('CREATE OR REPLACE FUNCTION app.user_count');
    expect(change.revert).toContain('count(*)');
  });

  it('recreates a function whose return type changed via DROP + CREATE', () => {
    const to = BASE.replace('RETURNS bigint', 'RETURNS int').replace('count(*)', 'count(*)::int');
    const result = diffSchemas(BASE, to);
    const change = result.changes.find(c => c.name === 'schemas/app/procedures/user_count/procedure')!;
    expect(change.deploy).toContain('DROP FUNCTION app.user_count');
    expect(change.deploy).toContain('CREATE FUNCTION app.user_count');
  });

  it('drops a changed named constraint before adding its replacement', () => {
    const from = 'CREATE TABLE app.products (id int, price int, CONSTRAINT price_positive CHECK (price > 0));';
    const to = 'CREATE TABLE app.products (id int, price int, CONSTRAINT price_positive CHECK (price >= 0));';
    const result = diffSchemas(from, to);
    const change = result.changes.find(c => c.name.startsWith('schemas/app/tables/products/table'))!;
    const dropAt = change.deploy.indexOf('DROP CONSTRAINT price_positive');
    const addAt = change.deploy.indexOf('ADD CONSTRAINT price_positive');
    expect(dropAt).toBeGreaterThanOrEqual(0);
    expect(addAt).toBeGreaterThan(dropAt);
  });

  it('inverts RLS enablement: revert of an added ENABLE ROW LEVEL SECURITY disables it', () => {
    const from = 'CREATE TABLE app.products (id int);';
    const to = [
      'CREATE TABLE app.products (id int);',
      'ALTER TABLE app.products ENABLE ROW LEVEL SECURITY;'
    ].join('\n');
    const result = diffSchemas(from, to);
    const change = result.changes.find(c => c.name.startsWith('schemas/app/tables/products/table'))!;
    expect(change.deploy).toContain('ENABLE ROW LEVEL SECURITY');
    expect(change.revert).toContain('DISABLE ROW LEVEL SECURITY');
  });

  it('emits column constraint/default alterations with inverses (no manual ALTER)', () => {
    const from = 'CREATE TABLE app.products (id int, note text);';
    const to = 'CREATE TABLE app.products (id int, note text NOT NULL);';
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    const change = result.changes.find(c => c.name.startsWith('schemas/app/tables/products/table'))!;
    expect(change.deploy).toContain('ALTER COLUMN note SET NOT NULL');
    expect(change.revert).toContain('ALTER COLUMN note DROP NOT NULL');
  });

  it('is constraint-placement-invariant: inline, table-elt, and standalone ADD CONSTRAINT unify', () => {
    const consolidated = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.users (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, email text NOT NULL UNIQUE, age int CHECK (age > 0));',
      'CREATE TABLE app.posts (id bigint PRIMARY KEY, user_id bigint NOT NULL REFERENCES app.users (id));'
    ].join('\n');
    const standalone = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.users (id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, email text NOT NULL, age int);',
      'ALTER TABLE app.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);',
      'ALTER TABLE app.users ADD CONSTRAINT users_email_key UNIQUE (email);',
      'ALTER TABLE app.users ADD CONSTRAINT users_age_check CHECK (age > 0);',
      'CREATE TABLE app.posts (id bigint NOT NULL, user_id bigint NOT NULL);',
      'ALTER TABLE app.posts ADD CONSTRAINT posts_pkey PRIMARY KEY (id);',
      'ALTER TABLE app.posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users (id);'
    ].join('\n');
    const result = diffSchemas(consolidated, standalone);
    expect(result.identical).toBe(true);
    expect(result.changes).toEqual([]);
  });

  it('matches unnamed standalone constraints against their Postgres default names', () => {
    const inline = 'CREATE TABLE app.users (id bigint PRIMARY KEY, email text UNIQUE);';
    const unnamed = [
      'CREATE TABLE app.users (id bigint NOT NULL, email text);',
      'ALTER TABLE app.users ADD PRIMARY KEY (id);',
      'ALTER TABLE app.users ADD UNIQUE (email);'
    ].join('\n');
    expect(diffSchemas(inline, unnamed).identical).toBe(true);
  });

  it('still surfaces a genuinely changed constraint, dropping it by its default name', () => {
    const from = 'CREATE TABLE app.users (id bigint PRIMARY KEY, age int CHECK (age > 0));';
    const to = 'CREATE TABLE app.users (id bigint PRIMARY KEY, age int CHECK (age > 1));';
    const result = diffSchemas(from, to);
    expect(result.identical).toBe(false);
    const change = result.changes.find(c => c.name === 'schemas/app/tables/users/table/alter')!;
    expect(change.deploy).toContain('DROP CONSTRAINT users_age_check');
    expect(change.deploy).toContain('ADD CONSTRAINT users_age_check CHECK (age > 1)');
  });

  it('folds foreign keys into their table: fk placement never diffs', () => {
    const inline = [
      'CREATE TABLE app.users (id bigint PRIMARY KEY);',
      'CREATE TABLE app.posts (id bigint PRIMARY KEY, user_id bigint REFERENCES app.users (id));'
    ].join('\n');
    const standalone = [
      'CREATE TABLE app.users (id bigint PRIMARY KEY);',
      'CREATE TABLE app.posts (id bigint PRIMARY KEY, user_id bigint);',
      'ALTER TABLE app.posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users (id);'
    ].join('\n');
    const result = diffSchemas(inline, standalone);
    expect(result.identical).toBe(true);
    expect(result.objects).toEqual([]);
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

/** Deploy SQL of all changes in emitted order, for cross-change ordering assertions. */
const deployScript = (result: ReturnType<typeof diffSchemas>): string =>
  result.changes.map(c => c.deploy).join('\n');
const at = (script: string, needle: string): number => {
  const i = script.indexOf(needle);
  expect(i).toBeGreaterThanOrEqual(0);
  return i;
};
const changeWith = (result: ReturnType<typeof diffSchemas>, needle: string) => {
  const c = result.changes.find(x => x.deploy.includes(needle));
  expect(c).toBeDefined();
  return c!;
};

describe('diffSchemas dependency order', () => {
  const A1 = 'CREATE SCHEMA app;\nCREATE TABLE app.a (id int PRIMARY KEY);';

  it('orders objects added on a NEW column of an existing table after that ALTER, with requires', () => {
    const to = [
      'CREATE SCHEMA app;',
      'CREATE VIEW app.av AS SELECT a.id, a.x FROM app.a a;',
      'CREATE INDEX a_x_idx ON app.a (x);',
      'CREATE POLICY a_read ON app.a FOR SELECT USING (x > 0);',
      'CREATE FUNCTION app.sum_x() RETURNS bigint LANGUAGE sql AS $$ SELECT sum(x) FROM app.a $$;',
      'CREATE TABLE app.a (id int PRIMARY KEY, x int);'
    ].join('\n');
    const result = diffSchemas(A1, to);
    const alter = changeWith(result, 'ADD COLUMN x');
    for (const needle of ['CREATE VIEW app.av', 'CREATE INDEX a_x_idx', 'CREATE POLICY a_read', 'CREATE FUNCTION app.sum_x']) {
      const dependent = changeWith(result, needle);
      expect(result.changes.indexOf(dependent)).toBeGreaterThan(result.changes.indexOf(alter));
      expect(dependent.dependencies).toContain(alter.name);
    }
  });

  it('orders an ALTER adding an FK to a NEW table after that table, with requires', () => {
    const to = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.a (id int PRIMARY KEY, b_id int REFERENCES app.b (id));',
      'CREATE TABLE app.b (id int PRIMARY KEY);'
    ].join('\n');
    const result = diffSchemas(A1, to);
    const b = changeWith(result, 'CREATE TABLE app.b');
    const fk = changeWith(result, 'REFERENCES app.b');
    expect(result.changes.indexOf(fk)).toBeGreaterThan(result.changes.indexOf(b));
    expect(fk.dependencies).toContain(b.name);
  });

  it('splits constraints to order a new<->modified FK cycle', () => {
    const to = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.b (id int PRIMARY KEY, a_x int REFERENCES app.a (x));',
      'CREATE TABLE app.a (id int PRIMARY KEY, x int UNIQUE, b_id int REFERENCES app.b (id));'
    ].join('\n');
    const result = diffSchemas(A1, to);
    const script = deployScript(result);
    expect(at(script, 'ADD COLUMN x')).toBeLessThan(at(script, 'REFERENCES app.a'));
    expect(at(script, 'UNIQUE')).toBeLessThan(at(script, 'REFERENCES app.a'));
    expect(at(script, 'CREATE TABLE app.b')).toBeLessThan(at(script, 'REFERENCES app.b'));
  });

  it('drops a replaced view before dropping the column it used, and recreates it after', () => {
    const from = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.a (id int PRIMARY KEY, y int);',
      'CREATE VIEW app.av AS SELECT a.id, a.y FROM app.a a;'
    ].join('\n');
    const to = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.a (id int PRIMARY KEY);',
      'CREATE VIEW app.av AS SELECT a.id FROM app.a a;'
    ].join('\n');
    const result = diffSchemas(from, to, { allowDataLoss: true });
    const script = deployScript(result);
    expect(at(script, 'DROP VIEW app.av')).toBeLessThan(at(script, 'DROP COLUMN y'));
    expect(at(script, 'DROP VIEW app.av')).toBeLessThan(at(script, 'CREATE VIEW app.av'));
    expect(changeWith(result, 'DROP COLUMN y').dependencies).toContain(changeWith(result, 'DROP VIEW app.av').name);
  });

  it('drops a removed view before dropping the column it used', () => {
    const from = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.a (id int PRIMARY KEY, y int);',
      'CREATE VIEW app.av AS SELECT a.id, a.y FROM app.a a;'
    ].join('\n');
    const result = diffSchemas(from, A1, { allowDataLoss: true });
    const script = deployScript(result);
    expect(at(script, 'DROP VIEW app.av')).toBeLessThan(at(script, 'DROP COLUMN y'));
    const drop = changeWith(result, 'DROP COLUMN y');
    expect(drop.dependencies).toContain(changeWith(result, 'DROP VIEW app.av').name);
  });

  it('rebuilds an unchanged view around a column type change it depends on', () => {
    const from = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.a (id int PRIMARY KEY, n int);',
      'CREATE VIEW app.nv AS SELECT a.n FROM app.a a;'
    ].join('\n');
    const to = from.replace('n int', 'n bigint');
    const result = diffSchemas(from, to, { allowDataLoss: true });
    const script = deployScript(result);
    expect(at(script, 'DROP VIEW app.nv')).toBeLessThan(at(script, 'TYPE bigint'));
    expect(at(script, 'TYPE bigint')).toBeLessThan(at(script, 'CREATE VIEW app.nv'));
    // the revert undoes the whole sequence back to the `from` shape
    const revert = [...result.changes].reverse().map(c => c.revert).join('\n');
    expect(at(revert, 'DROP VIEW app.nv')).toBeLessThan(at(revert, 'TYPE int'));
    expect(at(revert, 'TYPE int')).toBeLessThan(at(revert, 'CREATE VIEW app.nv'));
  });

  it('leaves an unchanged view alone when the type change does not touch its columns', () => {
    const from = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.a (id int PRIMARY KEY, n int, m int);',
      'CREATE VIEW app.nv AS SELECT a.n FROM app.a a;'
    ].join('\n');
    const result = diffSchemas(from, from.replace('m int', 'm bigint'), { allowDataLoss: true });
    expect(deployScript(result)).not.toContain('app.nv');
  });

  it('does not let PL/pgSQL body references constrain order', () => {
    const to = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.a (id int PRIMARY KEY);',
      'CREATE FUNCTION app.count_t() RETURNS bigint LANGUAGE plpgsql AS $$ BEGIN RETURN (SELECT count(*) FROM app.t); END $$;',
      'CREATE TABLE app.t (id int PRIMARY KEY);'
    ].join('\n');
    const result = diffSchemas(A1, to);
    const fn = changeWith(result, 'CREATE FUNCTION app.count_t');
    const t = changeWith(result, 'CREATE TABLE app.t');
    expect(fn.dependencies).not.toContain(t.name);
    expect(result.changes.indexOf(fn)).toBeLessThan(result.changes.indexOf(t));
  });

  it('throws on a new<->modified cycle it cannot split', () => {
    const from = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.a (id int PRIMARY KEY);',
      'CREATE VIEW app.v AS SELECT a.id FROM app.a a;'
    ].join('\n');
    const to = [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.a (id int PRIMARY KEY);',
      'CREATE FUNCTION app.f() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM app.v $$;',
      'CREATE VIEW app.v AS SELECT a.id, app.f() AS f FROM app.a a;'
    ].join('\n');
    expect(() => diffSchemas(from, to)).toThrow(/cycle/i);
  });

  it('gives each alteration its own graph-ordered change under changeGranularity alteration', () => {
    const to = [
      'CREATE SCHEMA app;',
      'CREATE VIEW app.av AS SELECT a.id, a.x FROM app.a a;',
      'CREATE TABLE app.a (id int PRIMARY KEY, x int, y int);'
    ].join('\n');
    const result = diffSchemas(A1, to, { changeGranularity: 'alteration' });
    const x = changeWith(result, 'ADD COLUMN x');
    const y = changeWith(result, 'ADD COLUMN y');
    expect(x).not.toBe(y);
    const view = changeWith(result, 'CREATE VIEW app.av');
    expect(view.dependencies).toContain(x.name);
    expect(view.dependencies).not.toContain(y.name);
  });
});

describe('diffSchemas: column removed together with the constraints on it', () => {
  const FROM = [
    'CREATE SCHEMA app;',
    'CREATE TABLE app.p (id int PRIMARY KEY);',
    'CREATE TABLE app.t (',
    '  id int PRIMARY KEY,',
    '  a int,',
    '  b int,',
    '  CONSTRAINT t_a_check CHECK (a > 0),',
    '  CONSTRAINT t_a_b_key UNIQUE (a, b),',
    '  CONSTRAINT t_a_fkey FOREIGN KEY (a) REFERENCES app.p (id)',
    ');'
  ].join('\n');
  const TO = [
    'CREATE SCHEMA app;',
    'CREATE TABLE app.p (id int PRIMARY KEY);',
    'CREATE TABLE app.t (id int PRIMARY KEY, b int);'
  ].join('\n');

  it('drops the constraints before the column, and re-adds the column before the constraints', () => {
    const result = diffSchemas(FROM, TO, { allowDataLoss: true });
    const deploy = deployScript(result);
    for (const c of ['t_a_check', 't_a_b_key', 't_a_fkey']) {
      expect(at(deploy, `DROP CONSTRAINT ${c}`)).toBeLessThan(at(deploy, 'DROP COLUMN a'));
    }
    const revert = [...result.changes].reverse().map(c => c.revert).join('\n');
    for (const c of ['t_a_check', 't_a_b_key', 't_a_fkey']) {
      expect(at(revert, 'ADD COLUMN a')).toBeLessThan(at(revert, `ADD CONSTRAINT ${c}`));
    }
  });

  it('with changeGranularity alteration, the column drop requires each constraint drop', () => {
    const result = diffSchemas(FROM, TO, { changeGranularity: 'alteration', allowDataLoss: true });
    const column = changeWith(result, 'DROP COLUMN a');
    for (const c of ['t_a_check', 't_a_b_key', 't_a_fkey']) {
      const constraint = changeWith(result, `DROP CONSTRAINT ${c}`);
      expect(column.dependencies).toContain(constraint.name);
    }
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
