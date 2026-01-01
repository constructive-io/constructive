import {
  parseAndValidateSqlExpression,
  validateAst,
} from '../src';

describe('SQL Expression Validator', () => {
  describe('parseAndValidateSqlExpression', () => {
    describe('valid expressions', () => {
      it('accepts simple constants', async () => {
        const result = await parseAndValidateSqlExpression("'hello'");
        expect(result.valid).toBe(true);
        expect(result.canonicalText).toBeDefined();
        expect(result.ast).toBeDefined();
      });

      it('accepts numeric constants', async () => {
        const result = await parseAndValidateSqlExpression('42');
        expect(result.valid).toBe(true);
        expect(result.canonicalText).toBe('42');
      });

      it('accepts boolean constants', async () => {
        const result = await parseAndValidateSqlExpression('true');
        expect(result.valid).toBe(true);
      });

      it('accepts NULL', async () => {
        const result = await parseAndValidateSqlExpression('NULL');
        expect(result.valid).toBe(true);
      });

      it('accepts type casts', async () => {
        const result = await parseAndValidateSqlExpression("'2024-01-01'::date");
        expect(result.valid).toBe(true);
      });

      it('accepts allowed functions - uuid_generate_v4', async () => {
        const result = await parseAndValidateSqlExpression('uuid_generate_v4()');
        expect(result.valid).toBe(true);
        expect(result.canonicalText).toContain('uuid_generate_v4');
      });

      it('accepts allowed functions - gen_random_uuid', async () => {
        const result = await parseAndValidateSqlExpression('gen_random_uuid()');
        expect(result.valid).toBe(true);
      });

      it('accepts allowed functions - now', async () => {
        const result = await parseAndValidateSqlExpression('now()');
        expect(result.valid).toBe(true);
      });

      it('accepts allowed functions - current_timestamp', async () => {
        const result = await parseAndValidateSqlExpression('current_timestamp');
        expect(result.valid).toBe(true);
      });

      it('accepts COALESCE expressions', async () => {
        const result = await parseAndValidateSqlExpression("COALESCE(NULL, 'default')");
        expect(result.valid).toBe(true);
      });

      it('accepts CASE expressions', async () => {
        const result = await parseAndValidateSqlExpression("CASE WHEN true THEN 'yes' ELSE 'no' END");
        expect(result.valid).toBe(true);
      });

      it('accepts arithmetic expressions', async () => {
        const result = await parseAndValidateSqlExpression('1 + 2 * 3');
        expect(result.valid).toBe(true);
      });

      it('accepts boolean expressions', async () => {
        const result = await parseAndValidateSqlExpression('true AND false OR true');
        expect(result.valid).toBe(true);
      });

      it('accepts NULL test', async () => {
        const result = await parseAndValidateSqlExpression("'value' IS NOT NULL");
        expect(result.valid).toBe(true);
      });
    });

    describe('invalid expressions', () => {
      it('rejects SELECT statements (as subqueries)', async () => {
        const result = await parseAndValidateSqlExpression('SELECT * FROM users');
        expect(result.valid).toBe(false);
        // When wrapped in SELECT (...), this becomes a SubLink (subquery)
        expect(result.error).toContain('SubLink');
      });

      it('rejects INSERT statements', async () => {
        const result = await parseAndValidateSqlExpression("INSERT INTO users VALUES (1, 'test')");
        expect(result.valid).toBe(false);
      });

      it('rejects UPDATE statements', async () => {
        const result = await parseAndValidateSqlExpression("UPDATE users SET name = 'test'");
        expect(result.valid).toBe(false);
      });

      it('rejects DELETE statements', async () => {
        const result = await parseAndValidateSqlExpression('DELETE FROM users');
        expect(result.valid).toBe(false);
      });

      it('rejects subqueries', async () => {
        const result = await parseAndValidateSqlExpression('(SELECT 1)');
        expect(result.valid).toBe(false);
      });

      it('rejects column references', async () => {
        const result = await parseAndValidateSqlExpression('users.id');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('ColumnRef');
      });

      it('rejects semicolons (stacked statements)', async () => {
        const result = await parseAndValidateSqlExpression("'test'; DROP TABLE users");
        expect(result.valid).toBe(false);
        expect(result.error).toContain('semicolon');
      });

      it('rejects unknown functions', async () => {
        const result = await parseAndValidateSqlExpression('unknown_function()');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not in the allowed functions list');
      });

      it('rejects empty expressions', async () => {
        const result = await parseAndValidateSqlExpression('');
        expect(result.valid).toBe(false);
      });

      it('rejects expressions exceeding max length', async () => {
        const longExpression = 'a'.repeat(20000);
        const result = await parseAndValidateSqlExpression(longExpression);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds maximum length');
      });
    });

    describe('schema-qualified functions', () => {
      it('rejects schema-qualified functions by default', async () => {
        const result = await parseAndValidateSqlExpression('my_schema.my_function()');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not in the allowed schemas list');
      });

      it('accepts schema-qualified functions when schema is allowed', async () => {
        const result = await parseAndValidateSqlExpression('my_schema.my_function()', {
          allowedSchemas: ['my_schema'],
        });
        expect(result.valid).toBe(true);
      });

      it('rejects schema-qualified functions when schema is not in allowlist', async () => {
        const result = await parseAndValidateSqlExpression('other_schema.my_function()', {
          allowedSchemas: ['my_schema'],
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('other_schema');
      });
    });

    describe('custom allowed functions', () => {
      it('accepts custom allowed functions', async () => {
        const result = await parseAndValidateSqlExpression('my_custom_function()', {
          allowedFunctions: ['my_custom_function'],
        });
        expect(result.valid).toBe(true);
      });

      it('function matching is case-insensitive', async () => {
        const result = await parseAndValidateSqlExpression('UUID_GENERATE_V4()');
        expect(result.valid).toBe(true);
      });
    });

    describe('canonicalization', () => {
      it('normalizes whitespace', async () => {
        const result = await parseAndValidateSqlExpression('  uuid_generate_v4(  )  ');
        expect(result.valid).toBe(true);
        expect(result.canonicalText).not.toContain('  ');
      });

      it('produces consistent output for equivalent expressions', async () => {
        const result1 = await parseAndValidateSqlExpression('1+2');
        const result2 = await parseAndValidateSqlExpression('1 + 2');
        expect(result1.canonicalText).toBe(result2.canonicalText);
      });
    });
  });

  describe('validateAst', () => {
    it('validates a valid AST', async () => {
      const parseResult = await parseAndValidateSqlExpression('uuid_generate_v4()');
      expect(parseResult.valid).toBe(true);

      const validateResult = await validateAst(parseResult.ast);
      expect(validateResult.valid).toBe(true);
      expect(validateResult.canonicalText).toBeDefined();
    });

    it('rejects invalid AST structure', async () => {
      const result = await validateAst(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-null object');
    });

    it('rejects AST with forbidden node types', async () => {
      const maliciousAst: Record<string, unknown> = {
        SelectStmt: {
          targetList: [] as unknown[],
        },
      };
      const result = await validateAst(maliciousAst);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SelectStmt');
    });
  });
});
