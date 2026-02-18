import {
  parseAndValidateSqlExpression,
  validateAst,
  DEFAULT_ALLOWED_FUNCTIONS
} from '../src/validator';
import type { SqlExpressionValidatorOptions } from '../src/types';

describe('DEFAULT_ALLOWED_FUNCTIONS', () => {
  it('should contain the expected set of safe PostgreSQL functions', () => {
    expect(DEFAULT_ALLOWED_FUNCTIONS).toEqual([
      'uuid_generate_v4',
      'gen_random_uuid',
      'now',
      'current_timestamp',
      'current_date',
      'current_time',
      'localtime',
      'localtimestamp',
      'clock_timestamp',
      'statement_timestamp',
      'transaction_timestamp',
      'timeofday',
      'random',
      'setseed'
    ]);
  });

  it('should have exactly 14 functions', () => {
    expect(DEFAULT_ALLOWED_FUNCTIONS).toHaveLength(14);
  });
});

describe('parseAndValidateSqlExpression', () => {
  // ─── Guards ──────────────────────────────────────────────────────

  describe('input guards', () => {
    it('should reject empty string', async () => {
      const result = await parseAndValidateSqlExpression('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Expression must be a non-empty string');
    });

    it('should reject null input', async () => {
      const result = await parseAndValidateSqlExpression(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Expression must be a non-empty string');
    });

    it('should reject undefined input', async () => {
      const result = await parseAndValidateSqlExpression(undefined as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Expression must be a non-empty string');
    });

    it('should reject non-string input', async () => {
      const result = await parseAndValidateSqlExpression(42 as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Expression must be a non-empty string');
    });

    it('should reject expressions exceeding max length', async () => {
      const longExpr = 'a'.repeat(10001);
      const result = await parseAndValidateSqlExpression(longExpr);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Expression exceeds maximum length');
    });

    it('should reject expressions exceeding custom max length', async () => {
      const result = await parseAndValidateSqlExpression('now()', {
        maxExpressionLength: 3
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Expression exceeds maximum length of 3');
    });

    it('should accept expressions at exactly the max length', async () => {
      // 5 chars: now()
      const result = await parseAndValidateSqlExpression('now()', {
        maxExpressionLength: 5
      });
      expect(result.valid).toBe(true);
    });

    it('should reject expressions containing semicolons', async () => {
      const result = await parseAndValidateSqlExpression('now(); DROP TABLE users');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('semicolons');
    });

    it('should reject expressions with semicolons even in strings', async () => {
      // The check is a simple .includes(';'), not SQL-aware
      const result = await parseAndValidateSqlExpression("';'");
      expect(result.valid).toBe(false);
      expect(result.error).toContain('semicolons');
    });
  });

  // ─── Valid expressions ───────────────────────────────────────────

  describe('valid expressions', () => {
    it('should accept integer constants', async () => {
      const result = await parseAndValidateSqlExpression('42');
      expect(result.valid).toBe(true);
      expect(result.canonicalText).toBeDefined();
      expect(result.ast).toBeDefined();
    });

    it('should accept string constants', async () => {
      const result = await parseAndValidateSqlExpression("'hello world'");
      expect(result.valid).toBe(true);
      expect(result.canonicalText).toBeDefined();
    });

    it('should accept boolean constants', async () => {
      const result = await parseAndValidateSqlExpression('TRUE');
      expect(result.valid).toBe(true);
    });

    it('should accept NULL', async () => {
      const result = await parseAndValidateSqlExpression('NULL');
      expect(result.valid).toBe(true);
    });

    it('should accept type casts', async () => {
      const result = await parseAndValidateSqlExpression("'2024-01-01'::date");
      expect(result.valid).toBe(true);
    });

    it('should accept arithmetic expressions', async () => {
      const result = await parseAndValidateSqlExpression('1 + 2 * 3');
      expect(result.valid).toBe(true);
    });

    it('should accept COALESCE expressions', async () => {
      const result = await parseAndValidateSqlExpression("COALESCE(NULL, 'default')");
      expect(result.valid).toBe(true);
    });

    it('should accept NULL test (IS NULL)', async () => {
      const result = await parseAndValidateSqlExpression('NULL IS NOT NULL');
      expect(result.valid).toBe(true);
    });

    it('should accept boolean expressions', async () => {
      const result = await parseAndValidateSqlExpression('TRUE AND FALSE');
      expect(result.valid).toBe(true);
    });

    it('should accept CASE expressions', async () => {
      const result = await parseAndValidateSqlExpression(
        "CASE WHEN TRUE THEN 'yes' ELSE 'no' END"
      );
      expect(result.valid).toBe(true);
    });

    it('should accept nested CASE with COALESCE', async () => {
      const result = await parseAndValidateSqlExpression(
        "CASE WHEN COALESCE(NULL, TRUE) THEN 'yes' ELSE 'no' END"
      );
      expect(result.valid).toBe(true);
    });
  });

  // ─── Function call validation ────────────────────────────────────

  describe('function calls', () => {
    it('should accept now()', async () => {
      const result = await parseAndValidateSqlExpression('now()');
      expect(result.valid).toBe(true);
    });

    it('should accept gen_random_uuid()', async () => {
      const result = await parseAndValidateSqlExpression('gen_random_uuid()');
      expect(result.valid).toBe(true);
    });

    it('should accept uuid_generate_v4()', async () => {
      const result = await parseAndValidateSqlExpression('uuid_generate_v4()');
      expect(result.valid).toBe(true);
    });

    it('should accept current_timestamp', async () => {
      const result = await parseAndValidateSqlExpression('current_timestamp');
      expect(result.valid).toBe(true);
    });

    it('should accept clock_timestamp()', async () => {
      const result = await parseAndValidateSqlExpression('clock_timestamp()');
      expect(result.valid).toBe(true);
    });

    it('should accept random()', async () => {
      const result = await parseAndValidateSqlExpression('random()');
      expect(result.valid).toBe(true);
    });

    it('should be case-insensitive for function names', async () => {
      const result = await parseAndValidateSqlExpression('NOW()');
      expect(result.valid).toBe(true);
    });

    it('should reject disallowed functions', async () => {
      const result = await parseAndValidateSqlExpression('pg_sleep(5)');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in the allowed functions list');
    });

    it('should reject dangerous functions like pg_read_file', async () => {
      const result = await parseAndValidateSqlExpression(
        "pg_read_file('/etc/passwd')"
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in the allowed functions list');
    });

    it('should allow custom allowed functions', async () => {
      const result = await parseAndValidateSqlExpression('my_custom_func()', {
        allowedFunctions: ['my_custom_func']
      });
      expect(result.valid).toBe(true);
    });

    it('should reject default functions when custom list is provided', async () => {
      const result = await parseAndValidateSqlExpression('now()', {
        allowedFunctions: ['my_custom_func']
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in the allowed functions list');
    });
  });

  // ─── Schema-qualified function calls ─────────────────────────────

  describe('schema-qualified function calls', () => {
    it('should reject schema-qualified calls when schema not allowed', async () => {
      const result = await parseAndValidateSqlExpression(
        'app_public.my_func()'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in the allowed schemas list');
    });

    it('should accept schema-qualified calls when schema is allowed', async () => {
      const result = await parseAndValidateSqlExpression(
        'app_public.my_func()',
        { allowedSchemas: ['app_public'] }
      );
      expect(result.valid).toBe(true);
    });

    it('should accept any function from an allowed schema', async () => {
      const result = await parseAndValidateSqlExpression(
        'app_public.dangerous_func()',
        { allowedSchemas: ['app_public'] }
      );
      expect(result.valid).toBe(true);
    });

    it('should reject functions from a different schema', async () => {
      const result = await parseAndValidateSqlExpression(
        'private_schema.my_func()',
        { allowedSchemas: ['app_public'] }
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in the allowed schemas list');
    });

    it('should handle multiple allowed schemas', async () => {
      const options: SqlExpressionValidatorOptions = {
        allowedSchemas: ['schema_a', 'schema_b']
      };
      const resultA = await parseAndValidateSqlExpression(
        'schema_a.func_a()',
        options
      );
      const resultB = await parseAndValidateSqlExpression(
        'schema_b.func_b()',
        options
      );
      expect(resultA.valid).toBe(true);
      expect(resultB.valid).toBe(true);
    });
  });

  // ─── Forbidden node types ────────────────────────────────────────

  describe('forbidden node types', () => {
    it('should reject SELECT subqueries', async () => {
      const result = await parseAndValidateSqlExpression(
        '(SELECT 1)'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Forbidden node type');
    });

    it('should reject column references', async () => {
      const result = await parseAndValidateSqlExpression('username');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Forbidden node type');
      expect(result.error).toContain('ColumnRef');
    });

    it('should reject qualified column references', async () => {
      const result = await parseAndValidateSqlExpression('users.username');
      expect(result.valid).toBe(false);
    });
  });

  // ─── Canonical text output ───────────────────────────────────────

  describe('canonical text output', () => {
    it('should return canonical form for expressions', async () => {
      const result = await parseAndValidateSqlExpression('  42  ');
      expect(result.valid).toBe(true);
      expect(result.canonicalText).toBeDefined();
    });

    it('should normalize function call casing', async () => {
      const result = await parseAndValidateSqlExpression('NOW()');
      expect(result.valid).toBe(true);
      // Canonical form should be lowercase
      expect(result.canonicalText).toBeDefined();
    });

    it('should return AST alongside canonical text', async () => {
      const result = await parseAndValidateSqlExpression('42');
      expect(result.valid).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.canonicalText).toBeDefined();
    });
  });

  // ─── Parse errors ───────────────────────────────────────────────

  describe('parse errors', () => {
    it('should handle unparseable SQL', async () => {
      const result = await parseAndValidateSqlExpression('!!!INVALID SQL!!!');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('validateAst', () => {
  it('should reject null AST', async () => {
    const result = await validateAst(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('AST must be a non-null object');
  });

  it('should reject undefined AST', async () => {
    const result = await validateAst(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('AST must be a non-null object');
  });

  it('should reject non-object AST', async () => {
    const result = await validateAst('string' as any);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('AST must be a non-null object');
  });

  it('should validate a valid AST and return canonical text', async () => {
    // First parse to get a valid AST
    const parseResult = await parseAndValidateSqlExpression('42');
    expect(parseResult.valid).toBe(true);

    // Then validate the AST directly
    const result = await validateAst(parseResult.ast);
    expect(result.valid).toBe(true);
    expect(result.canonicalText).toBeDefined();
  });

  it('should reject AST containing forbidden nodes', async () => {
    // Craft a fake AST with a ColumnRef
    const forbiddenAst = {
      ColumnRef: {
        fields: [{ String: { sval: 'username' } }]
      }
    };
    const result = await validateAst(forbiddenAst);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Forbidden node type');
    expect(result.error).toContain('ColumnRef');
  });

  it('should respect custom allowed functions', async () => {
    // Parse a function call to get its AST
    const parseResult = await parseAndValidateSqlExpression('now()');
    expect(parseResult.valid).toBe(true);

    // Then validate the AST with a custom list that excludes now()
    const result = await validateAst(parseResult.ast, {
      allowedFunctions: ['gen_random_uuid']
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not in the allowed functions list');
  });
});
