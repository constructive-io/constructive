import { col, fn, lit, param, QueryBuilder } from '../src/query-builder';

// PostgreSQL parses COALESCE/NULLIF/GREATEST/LEAST into dedicated parse nodes;
// no functions with those names exist. Emitted as a FuncCall they deparse to
// `"coalesce"(...)`, which parses but fails at runtime. These tests pin the SQL
// the builder produces for that family, the guard for keyword names with no
// function behind them, and that ordinary functions are untouched.

const selectExprSql = (expr: ReturnType<typeof fn>) =>
  new QueryBuilder().table('users').selectExpr('value', expr).build().text;

describe('keyword expressions', () => {
  describe('COALESCE', () => {
    it('should emit unquoted COALESCE', () => {
      const text = selectExprSql(fn('coalesce', [col('nickname'), col('name')]));

      expect(text).toMatch(/COALESCE\s*\(\s*nickname,\s*name\s*\)/);
      expect(text).not.toMatch(/"coalesce"/);
    });

    it('should accept any argument count above one', () => {
      const text = selectExprSql(
        fn('coalesce', [col('a'), col('b'), col('c'), lit('fallback')])
      );

      expect(text).toMatch(/COALESCE\s*\(\s*a,\s*b,\s*c,\s*'fallback'\s*\)/);
    });

    it('should be case-insensitive', () => {
      for (const name of ['COALESCE', 'Coalesce', 'coALESce']) {
        const text = selectExprSql(fn(name, [col('a'), col('b')]));

        expect(text).toMatch(/COALESCE\s*\(\s*a,\s*b\s*\)/);
        expect(text.toLowerCase()).not.toContain('"coalesce"');
      }
    });

    it('should accept parameters as arguments', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .selectExpr('value', fn('coalesce', [col('name'), param('anonymous')]))
        .build();

      expect(text).toMatch(/COALESCE\s*\(\s*name,\s*\$1\s*\)/);
      expect(values).toEqual(['anonymous']);
    });

    it('should reject an empty argument list', () => {
      expect(() => selectExprSql(fn('coalesce'))).toThrow(
        /COALESCE requires at least 1 argument/
      );
    });

    it('should reject named arguments', () => {
      expect(() =>
        selectExprSql(fn('coalesce', { a: col('name'), b: lit('x') }))
      ).toThrow(/does not accept named arguments/);
    });
  });

  describe('NULLIF', () => {
    it('should emit unquoted NULLIF', () => {
      const text = selectExprSql(fn('nullif', [col('name'), lit('')]));

      expect(text).toMatch(/NULLIF\s*\(\s*name,\s*''\s*\)/);
      expect(text).not.toMatch(/"nullif"/);
    });

    it('should require exactly two arguments', () => {
      expect(() => selectExprSql(fn('NULLIF', [col('a')]))).toThrow(
        /NULLIF requires exactly 2 argument/
      );
      expect(() =>
        selectExprSql(fn('nullif', [col('a'), col('b'), col('c')]))
      ).toThrow(/NULLIF requires exactly 2 argument/);
    });
  });

  describe('GREATEST / LEAST', () => {
    it('should emit unquoted GREATEST', () => {
      const text = selectExprSql(fn('greatest', [col('a'), col('b'), lit(0)]));

      expect(text).toMatch(/GREATEST\s*\(\s*a,\s*b,\s*0\s*\)/);
      expect(text).not.toMatch(/"greatest"/);
    });

    it('should emit unquoted LEAST', () => {
      const text = selectExprSql(fn('LEAST', [col('a'), col('b')]));

      expect(text).toMatch(/LEAST\s*\(\s*a,\s*b\s*\)/);
      expect(text).not.toMatch(/"least"/);
    });

    it('should require at least one argument', () => {
      expect(() => selectExprSql(fn('greatest'))).toThrow(
        /GREATEST requires at least 1 argument/
      );
      expect(() => selectExprSql(fn('least', []))).toThrow(
        /LEAST requires at least 1 argument/
      );
    });
  });

  describe('usable anywhere an expression is', () => {
    it('should work in WHERE', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ status: { equalTo: fn('coalesce', [col('status'), lit('new')]) } })
        .build();

      expect(text).toMatch(/COALESCE\s*\(\s*status,\s*'new'\s*\)/);
      expect(values).toEqual([]);
    });

    it('should work in UPDATE ... SET', () => {
      const { text } = new QueryBuilder()
        .table('nodes')
        .update({ state: fn('coalesce', [col('state'), lit('{}')]) })
        .where({ id: { equalTo: 1 } })
        .build();

      expect(text).toMatch(/state\s*=\s*COALESCE\s*\(\s*state,\s*'\{\}'\s*\)/);
    });

    it('should work in ORDER BY', () => {
      const { text } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .orderBy(fn('coalesce', [col('nickname'), col('name')]), 'DESC')
        .build();

      expect(text).toMatch(/ORDER BY\s+COALESCE\s*\(\s*nickname,\s*name\s*\)\s+DESC/);
    });

    it('should be selectable as a bare function call', () => {
      const { text } = new QueryBuilder()
        .call('coalesce', [col('a'), col('b')], { as: 'value' })
        .build();

      expect(text).toMatch(/SELECT\s+COALESCE\s*\(\s*a,\s*b\s*\)/);
    });

    it('should reject a keyword expression in FROM', () => {
      expect(() =>
        new QueryBuilder().call('coalesce', [col('a'), col('b')]).select(['x']).build()
      ).toThrow(/cannot appear in FROM/);
      expect(() =>
        new QueryBuilder().table('users').fromFunction('coalesce', [col('a')]).select().build()
      ).toThrow(/cannot appear in FROM/);
    });
  });

  describe('unmapped keyword names', () => {
    it('should reject TRIM, naming the alternative', () => {
      expect(() => selectExprSql(fn('trim', [col('name')]))).toThrow(
        /'trim' is a PostgreSQL COL_NAME_KEYWORD[\s\S]*btrim/
      );
    });

    it('should reject a reserved keyword', () => {
      expect(() => selectExprSql(fn('cast', [col('name')]))).toThrow(
        /'cast' is a PostgreSQL RESERVED_KEYWORD/
      );
      expect(() => selectExprSql(fn('current_date'))).toThrow(
        /is a PostgreSQL RESERVED_KEYWORD/
      );
    });

    it('should still allow keyword names that really are functions', () => {
      // "substring"(...) and friends resolve: pg_catalog has functions with
      // those names, so the quoted call the deparser emits runs fine.
      const text = selectExprSql(fn('substring', [col('name'), lit(1), lit(3)]));

      expect(text).toMatch(/"substring"\s*\(\s*name,\s*1,\s*3\s*\)/);
    });
  });

  describe('ordinary functions are untouched', () => {
    it('should keep now()', () => {
      const text = selectExprSql(fn('now'));

      expect(text).toMatch(/now\s*\(\s*\)/);
    });

    it('should keep jsonb_set()', () => {
      const text = selectExprSql(
        fn('jsonb_set', [col('state'), lit('{a}'), lit('1')])
      );

      expect(text).toMatch(/jsonb_set\s*\(\s*state,\s*'\{a\}',\s*'1'\s*\)/);
    });

    it('should keep schema-qualified calls a function call', () => {
      const text = selectExprSql(fn('priv.secrets_get', [col('name')]));

      expect(text).toMatch(/priv\.secrets_get\s*\(\s*name\s*\)/);
    });

    it('should keep a schema-qualified keyword name a function call', () => {
      const dotted = selectExprSql(fn('pg_catalog.coalesce', [col('a'), col('b')]));
      const viaOpts = selectExprSql(
        fn('coalesce', [col('a'), col('b')], { schema: 'pg_catalog' })
      );

      for (const text of [dotted, viaOpts]) {
        expect(text).toMatch(/pg_catalog\.("?)coalesce\1\s*\(\s*a,\s*b\s*\)/);
        expect(text).not.toMatch(/COALESCE\s*\(/);
      }
    });

    it('should keep set-returning functions usable in FROM', () => {
      const { text } = new QueryBuilder()
        .call('generate_series', [lit(1), lit(3)])
        .select(['*'])
        .build();

      expect(text).toMatch(/FROM\s+generate_series\s*\(\s*1,\s*3\s*\)/);
    });
  });
});
