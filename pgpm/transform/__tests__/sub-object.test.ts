import { classifyStatements } from '@pgsql/transform';
import { loadModule } from 'plpgsql-parser';

import { nameUnnamedConstraints, subObjectIdentityOf } from '../src/sub-object';

beforeAll(async () => {
  await loadModule();
});

const factsOf = (sql: string) => classifyStatements(sql);

describe('subObjectIdentityOf', () => {
  it('recovers the column identity from ADD COLUMN', () => {
    const [f] = factsOf('ALTER TABLE app.users ADD COLUMN email text NOT NULL;');
    expect(subObjectIdentityOf(f)).toEqual({
      kind: 'column',
      schema: 'app',
      name: 'email',
      table: 'users'
    });
  });

  it('recovers the constraint identity from a named ADD CONSTRAINT', () => {
    const [f] = factsOf('ALTER TABLE app.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);');
    expect(subObjectIdentityOf(f)).toEqual({
      kind: 'constraint',
      schema: 'app',
      name: 'users_pkey',
      table: 'users'
    });
  });

  it('names unnamed constraints with their Postgres default', () => {
    const [pk] = factsOf('ALTER TABLE app.users ADD PRIMARY KEY (id);');
    expect(subObjectIdentityOf(pk)!.name).toEqual('users_pkey');

    const [uq] = factsOf('ALTER TABLE app.users ADD UNIQUE (email);');
    expect(subObjectIdentityOf(uq)!.name).toEqual('users_email_key');

    const [fk] = factsOf('ALTER TABLE app.posts ADD FOREIGN KEY (user_id) REFERENCES app.users (id);');
    expect(subObjectIdentityOf(fk)!.name).toEqual('posts_user_id_fkey');
  });

  it('returns null for multi-command ALTERs and other statements', () => {
    const [multi] = factsOf('ALTER TABLE app.users ADD COLUMN a int, ADD COLUMN b int;');
    expect(subObjectIdentityOf(multi)).toBeNull();

    const [create] = factsOf('CREATE TABLE app.users (id int);');
    expect(subObjectIdentityOf(create)).toBeNull();

    const [rls] = factsOf('ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;');
    expect(subObjectIdentityOf(rls)).toBeNull();
  });
});

describe('nameUnnamedConstraints', () => {
  it('rewrites unnamed ADD <constraint> to carry its Postgres default name', () => {
    const out = nameUnnamedConstraints('ALTER TABLE app.users ADD PRIMARY KEY (id);');
    expect(out).toContain('ADD CONSTRAINT users_pkey PRIMARY KEY (id)');
  });

  it('leaves already-named constraints and other statements untouched', () => {
    const sql = [
      'CREATE TABLE app.users (id int);',
      'ALTER TABLE app.users ADD CONSTRAINT my_pk PRIMARY KEY (id);'
    ].join('\n');
    const out = nameUnnamedConstraints(sql);
    expect(out).toContain('CREATE TABLE app.users (id int);');
    expect(out).toContain('ADD CONSTRAINT my_pk PRIMARY KEY (id)');
    expect(out).not.toContain('users_pkey');
  });
});
