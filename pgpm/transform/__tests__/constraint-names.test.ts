import { loadModule, parseSync } from 'plpgsql-parser';

import { ConstraintNode, defaultConstraintName, firstColumnRef } from '../src/constraint-names';

beforeAll(async () => {
  await loadModule();
});

/** The Constraint nodes of a one-statement `ALTER TABLE` script. */
const constraintOf = (sql: string): ConstraintNode => {
  const stmt = parseSync(sql).sql.stmts[0].stmt as {
    AlterTableStmt: { cmds: { AlterTableCmd: { def: { Constraint: ConstraintNode } } }[] };
  };
  return stmt.AlterTableStmt.cmds[0].AlterTableCmd.def.Constraint;
};

describe('defaultConstraintName', () => {
  it('derives Postgres default names for unnamed table-level constraints', () => {
    expect(defaultConstraintName('users', constraintOf('ALTER TABLE users ADD PRIMARY KEY (id);')))
      .toBe('users_pkey');
    expect(defaultConstraintName('users', constraintOf('ALTER TABLE users ADD UNIQUE (email);')))
      .toBe('users_email_key');
    expect(defaultConstraintName('users', constraintOf('ALTER TABLE users ADD UNIQUE (a, b);')))
      .toBe('users_a_b_key');
    expect(defaultConstraintName('posts', constraintOf('ALTER TABLE posts ADD FOREIGN KEY (user_id) REFERENCES users (id);')))
      .toBe('posts_user_id_fkey');
    expect(defaultConstraintName('users', constraintOf('ALTER TABLE users ADD CHECK (age > 0);')))
      .toBe('users_age_check');
  });

  it('uses the owning column for column-attached constraints', () => {
    expect(defaultConstraintName('users', { contype: 'CONSTR_UNIQUE' }, 'email')).toBe('users_email_key');
    expect(defaultConstraintName('posts', { contype: 'CONSTR_FOREIGN' }, 'user_id')).toBe('posts_user_id_fkey');
    expect(defaultConstraintName('users', { contype: 'CONSTR_CHECK' }, 'age')).toBe('users_age_check');
  });

  it('returns null when no stable name derives', () => {
    expect(defaultConstraintName('users', { contype: 'CONSTR_UNIQUE' })).toBeNull();
    expect(defaultConstraintName('users', { contype: 'CONSTR_EXCLUSION' })).toBeNull();
  });
});

describe('firstColumnRef', () => {
  it('finds the first referenced column in an expression tree', () => {
    const check = constraintOf('ALTER TABLE t ADD CHECK (price > 0 AND qty > 0);');
    expect(firstColumnRef(check.raw_expr)).toBe('price');
  });

  it('returns null for column-free expressions', () => {
    const check = constraintOf('ALTER TABLE t ADD CHECK (1 = 1);');
    expect(firstColumnRef(check.raw_expr)).toBeNull();
  });
});
