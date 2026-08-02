import { LINT_RULES,lintDefinition } from '../src/lint';

describe('lint: rule registry', () => {
  it('exposes the four convention rules with stable codes', () => {
    expect(LINT_RULES.map((r) => r.code).sort()).toEqual(['C1', 'C2', 'C3', 'C4']);
    expect(LINT_RULES.map((r) => r.id).sort()).toEqual([
      'no-dynamic-sql',
      'no-set-search-path',
      'no-variable-conflict',
      'require-qualified-refs'
    ]);
  });

  it('only no-dynamic-sql requires a suppression reason', () => {
    const reasonRequired = LINT_RULES.filter((r) => r.reasonRequired).map((r) => r.id);
    expect(reasonRequired).toEqual(['no-dynamic-sql']);
  });
});

describe('lint: no-set-search-path (C1)', () => {
  it('flags a SET search_path clause', async () => {
    const def = `CREATE FUNCTION app.f() RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM app.g();
END;
$$;`;
    const { problems } = await lintDefinition(def, 'plpgsql', 'app.f()');
    const c1 = problems.filter((p) => p.ruleId === 'no-set-search-path');
    expect(c1).toHaveLength(1);
    expect(c1[0].line).toBe(2);
  });

  it('flags set_config(\'search_path\', ...) in the body', async () => {
    const def = `CREATE FUNCTION app.f() RETURNS void LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('search_path', 'public', true);
END;
$$;`;
    const { problems } = await lintDefinition(def, 'plpgsql');
    expect(problems.some((p) => p.ruleId === 'no-set-search-path')).toBe(true);
  });

  it('does not flag a function that never touches search_path', async () => {
    const def = `CREATE FUNCTION app.f() RETURNS void LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM app.g();
END;
$$;`;
    const { problems } = await lintDefinition(def, 'plpgsql');
    expect(problems.some((p) => p.ruleId === 'no-set-search-path')).toBe(false);
  });
});

describe('lint: no-variable-conflict (C2)', () => {
  it('flags a #variable_conflict directive', async () => {
    const def = `CREATE FUNCTION app.f() RETURNS void LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE x int;
BEGIN
  x := 1;
END;
$$;`;
    const { problems } = await lintDefinition(def, 'plpgsql');
    const c2 = problems.filter((p) => p.ruleId === 'no-variable-conflict');
    expect(c2).toHaveLength(1);
    expect(c2[0].line).toBe(3);
    expect(c2[0].message).toContain('use_column');
  });
});

describe('lint: no-dynamic-sql (C4)', () => {
  it('flags EXECUTE and requires a reason to waive', async () => {
    const def = `CREATE FUNCTION app.f(tbl text) RETURNS void LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('SELECT 1 FROM %I', tbl);
END;
$$;`;
    const { problems, suppressed } = await lintDefinition(def, 'plpgsql');
    expect(problems.some((p) => p.ruleId === 'no-dynamic-sql')).toBe(true);
    expect(suppressed).toHaveLength(0);
  });

  it('a reasonless waiver does not suppress (reason required)', async () => {
    const def = `CREATE FUNCTION app.f(tbl text) RETURNS void LANGUAGE plpgsql
AS $$
BEGIN
  -- safegres-disable-next-line no-dynamic-sql
  EXECUTE format('SELECT 1 FROM %I', tbl);
END;
$$;`;
    const { problems, suppressed } = await lintDefinition(def, 'plpgsql');
    const c4 = problems.filter((p) => p.ruleId === 'no-dynamic-sql');
    expect(c4).toHaveLength(1);
    expect(c4[0].message).toContain('suppression ignored');
    expect(suppressed).toHaveLength(0);
  });

  it('a reasoned waiver suppresses and is retained as accepted risk', async () => {
    const def = `CREATE FUNCTION app.f(tbl text) RETURNS void LANGUAGE plpgsql
AS $$
BEGIN
  -- safegres-disable-next-line no-dynamic-sql -- lookup-only: building IN-list from integers
  EXECUTE format('SELECT 1 FROM %I', tbl);
END;
$$;`;
    const { problems, suppressed } = await lintDefinition(def, 'plpgsql');
    expect(problems.some((p) => p.ruleId === 'no-dynamic-sql')).toBe(false);
    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].reason).toBe('lookup-only: building IN-list from integers');
    expect(suppressed[0].scope).toBe('next-line');
  });
});

describe('lint: require-qualified-refs (C3)', () => {
  it('flags an unqualified relation reference', async () => {
    const def = `CREATE FUNCTION app.f() RETURNS int LANGUAGE sql
AS $$
  SELECT count(*) FROM users
$$;`;
    const { problems } = await lintDefinition(def, 'sql');
    const c3 = problems.filter((p) => p.ruleId === 'require-qualified-refs');
    expect(c3).toHaveLength(1);
    expect(c3[0].message).toContain('users');
  });

  it('does not flag a schema-qualified reference', async () => {
    const def = `CREATE FUNCTION app.f() RETURNS int LANGUAGE sql
AS $$
  SELECT count(*) FROM app_public.users
$$;`;
    const { problems } = await lintDefinition(def, 'sql');
    expect(problems.some((p) => p.ruleId === 'require-qualified-refs')).toBe(false);
  });

  it('does not flag a CTE name used as a relation', async () => {
    const def = `CREATE FUNCTION app.f() RETURNS int LANGUAGE sql
AS $$
  WITH recent AS (SELECT id FROM app_public.users)
  SELECT count(*) FROM recent
$$;`;
    const { problems } = await lintDefinition(def, 'sql');
    expect(problems.some((p) => p.ruleId === 'require-qualified-refs')).toBe(false);
  });
});

describe('lint: suppression scopes', () => {
  it('disable-file silences a rule for the whole definition', async () => {
    const def = `CREATE FUNCTION app.f() RETURNS int LANGUAGE sql
AS $$
  -- safegres-disable-file require-qualified-refs -- legacy, tracked in #123
  SELECT count(*) FROM users
$$;`;
    const { problems, suppressed } = await lintDefinition(def, 'sql');
    expect(problems.some((p) => p.ruleId === 'require-qualified-refs')).toBe(false);
    expect(suppressed.some((p) => p.ruleId === 'require-qualified-refs')).toBe(true);
  });

  it('disable/enable bracket a range', async () => {
    const def = `CREATE FUNCTION app.f() RETURNS void LANGUAGE plpgsql
AS $$
BEGIN
  -- safegres-disable no-dynamic-sql -- codegen block
  EXECUTE 'SELECT 1';
  EXECUTE 'SELECT 2';
  -- safegres-enable no-dynamic-sql
END;
$$;`;
    const { problems, suppressed } = await lintDefinition(def, 'plpgsql');
    expect(problems.some((p) => p.ruleId === 'no-dynamic-sql')).toBe(false);
    expect(suppressed.filter((p) => p.ruleId === 'no-dynamic-sql')).toHaveLength(2);
  });

  it('an unparseable definition yields no findings', async () => {
    const { problems, suppressed } = await lintDefinition('this is not sql', 'plpgsql');
    expect(problems).toHaveLength(0);
    expect(suppressed).toHaveLength(0);
  });
});
