import {
  validateFieldType,
  validateFieldDefault,
  fieldTypeToAst,
  fieldTypeToSql,
  fieldDefaultToAst,
  fieldDefaultToSql,
  FORBIDDEN_TYPES
} from '../src/field-types';
import type {
  FieldType,
  FieldDefault,
  FieldTypeValidationOptions,
  FieldDefaultValidationOptions
} from '../src/field-types';
import { DEFAULT_ALLOWED_FUNCTIONS } from '../src/validator';

// ═══════════════════════════════════════════════════════════════════
// FieldType Validation
// ═══════════════════════════════════════════════════════════════════

describe('validateFieldType', () => {
  // ─── Valid types ────────────────────────────────────────────────

  describe('valid types', () => {
    it('should accept simple type: text', () => {
      const result = validateFieldType({ name: 'text' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('text');
    });

    it('should accept simple type: uuid', () => {
      const result = validateFieldType({ name: 'uuid' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('uuid');
    });

    it('should accept simple type: jsonb', () => {
      const result = validateFieldType({ name: 'jsonb' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('jsonb');
    });

    it('should accept simple type: boolean', () => {
      const result = validateFieldType({ name: 'boolean' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('boolean');
    });

    it('should accept simple type: integer', () => {
      const result = validateFieldType({ name: 'integer' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('integer');
    });

    it('should accept simple type: timestamptz', () => {
      const result = validateFieldType({ name: 'timestamptz' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('timestamptz');
    });

    it('should accept simple type: citext', () => {
      const result = validateFieldType({ name: 'citext' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('citext');
    });

    it('should accept simple type: tsvector', () => {
      const result = validateFieldType({ name: 'tsvector' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('tsvector');
    });
  });

  // ─── Types with arguments ──────────────────────────────────────

  describe('types with arguments', () => {
    it('should accept geometry(Point, 4326)', () => {
      const result = validateFieldType({
        name: 'geometry',
        args: ['Point', 4326]
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('geometry(Point, 4326)');
    });

    it('should accept geometry(PointZM, 4326)', () => {
      const result = validateFieldType({
        name: 'geometry',
        args: ['PointZM', 4326]
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('geometry(PointZM, 4326)');
    });

    it('should accept geography(Point, 4326)', () => {
      const result = validateFieldType({
        name: 'geography',
        args: ['Point', 4326]
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('geography(Point, 4326)');
    });

    it('should accept numeric(10, 2)', () => {
      const result = validateFieldType({
        name: 'numeric',
        args: [10, 2]
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('numeric(10, 2)');
    });

    it('should accept varchar(255)', () => {
      const result = validateFieldType({
        name: 'varchar',
        args: [255]
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('varchar(255)');
    });

    it('should accept vector(1536)', () => {
      const result = validateFieldType({
        name: 'vector',
        args: [1536]
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('vector(1536)');
    });

    it('should accept bit(32)', () => {
      const result = validateFieldType({
        name: 'bit',
        args: [32]
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('bit(32)');
    });

    it('should accept interval(6) — precision arg', () => {
      const result = validateFieldType({
        name: 'interval',
        args: [6]
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('interval(6)');
    });

    it('should accept geometry(LineString, 4326)', () => {
      const result = validateFieldType({
        name: 'geometry',
        args: ['LineString', 4326]
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('geometry(LineString, 4326)');
    });

    it('should accept geometry(Polygon, 4326)', () => {
      const result = validateFieldType({
        name: 'geometry',
        args: ['Polygon', 4326]
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('geometry(Polygon, 4326)');
    });

    it('should accept geometry(MultiPoint, 4326)', () => {
      const result = validateFieldType({
        name: 'geometry',
        args: ['MultiPoint', 4326]
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('geometry(MultiPoint, 4326)');
    });
  });

  // ─── Array types ───────────────────────────────────────────────

  describe('array types', () => {
    it('should accept text[]', () => {
      const result = validateFieldType({
        name: 'text',
        array_dimensions: 1
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('text[]');
    });

    it('should accept integer[]', () => {
      const result = validateFieldType({
        name: 'integer',
        array_dimensions: 1
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('integer[]');
    });

    it('should accept text[][]', () => {
      const result = validateFieldType({
        name: 'text',
        array_dimensions: 2
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('text[][]');
    });

    it('should accept numeric(10,2)[]', () => {
      const result = validateFieldType({
        name: 'numeric',
        args: [10, 2],
        array_dimensions: 1
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('numeric(10, 2)[]');
    });

    it('should accept array_dimensions: 0 (scalar)', () => {
      const result = validateFieldType({
        name: 'text',
        array_dimensions: 0
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('text');
    });
  });

  // ─── Schema-qualified types ────────────────────────────────────

  describe('schema-qualified types', () => {
    it('should accept schema-qualified type when schema is allowed', () => {
      const result = validateFieldType(
        { name: 'my_type', schema: 'my_schema' },
        { allowedTypeSchemas: ['my_schema'] }
      );
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('my_schema.my_type');
    });

    it('should reject schema-qualified type when schema is not allowed', () => {
      const result = validateFieldType(
        { name: 'my_type', schema: 'evil_schema' },
        { allowedTypeSchemas: ['my_schema'] }
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in the allowed schemas list');
    });

    it('should accept schema-qualified type when no schema allowlist configured', () => {
      const result = validateFieldType(
        { name: 'my_type', schema: 'any_schema' }
      );
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('any_schema.my_type');
    });

    it('should match schema allowlist case-insensitively', () => {
      const result = validateFieldType(
        { name: 'my_type', schema: 'My_Schema' },
        { allowedTypeSchemas: ['my_schema'] }
      );
      expect(result.valid).toBe(true);
    });
  });

  // ─── Interval range types ─────────────────────────────────────

  describe('interval range types', () => {
    it('should accept interval day to second', () => {
      const result = validateFieldType({
        name: 'interval',
        range: ['day', 'second']
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('interval day to second');
    });

    it('should accept interval year to month', () => {
      const result = validateFieldType({
        name: 'interval',
        range: ['year', 'month']
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('interval year to month');
    });

    it('should accept interval hour', () => {
      const result = validateFieldType({
        name: 'interval',
        range: ['hour']
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('interval hour');
    });

    it('should reject range on non-interval type', () => {
      const result = validateFieldType({
        name: 'text',
        range: ['day', 'second']
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('only valid for interval types');
    });

    it('should reject invalid interval field', () => {
      const result = validateFieldType({
        name: 'interval',
        range: ['week']
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid interval field');
    });

    it('should reject range with more than 2 elements', () => {
      const result = validateFieldType({
        name: 'interval',
        range: ['day', 'hour', 'second']
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('1 or 2 elements');
    });

    it('should reject empty range', () => {
      const result = validateFieldType({
        name: 'interval',
        range: []
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('1 or 2 elements');
    });
  });

  // ─── Forbidden types ──────────────────────────────────────────

  describe('forbidden types', () => {
    it.each([
      'regclass', 'regtype', 'regproc', 'regprocedure',
      'regoper', 'regoperator', 'regnamespace', 'regrole',
      'regconfig', 'regdictionary'
    ])('should reject forbidden type: %s', (typeName) => {
      const result = validateFieldType({ name: typeName });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Forbidden type');
      expect(result.error).toContain('system catalog');
    });

    it('should reject additional forbidden types', () => {
      const result = validateFieldType(
        { name: 'dangerous_type' },
        { additionalForbiddenTypes: ['dangerous_type'] }
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Forbidden type');
    });
  });

  // ─── Invalid inputs ───────────────────────────────────────────

  describe('invalid inputs', () => {
    it('should reject null', () => {
      const result = validateFieldType(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-null object');
    });

    it('should reject undefined', () => {
      const result = validateFieldType(undefined);
      expect(result.valid).toBe(false);
    });

    it('should reject string', () => {
      const result = validateFieldType('text');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-null object');
    });

    it('should reject array', () => {
      const result = validateFieldType(['text']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-null object');
    });

    it('should reject missing name', () => {
      const result = validateFieldType({});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('name is required');
    });

    it('should reject non-string name', () => {
      const result = validateFieldType({ name: 42 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('name is required and must be a string');
    });

    it('should reject name with special characters', () => {
      const result = validateFieldType({ name: 'text; DROP TABLE' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid SQL identifier');
    });

    it('should reject name starting with number', () => {
      const result = validateFieldType({ name: '3text' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid SQL identifier');
    });

    it('should reject name with spaces', () => {
      const result = validateFieldType({ name: 'my type' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid SQL identifier');
    });

    it('should reject unknown keys', () => {
      const result = validateFieldType({ name: 'text', evil: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown FieldType key');
    });

    it('should reject schema with special characters', () => {
      const result = validateFieldType({ name: 'text', schema: 'evil; DROP' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid SQL identifier');
    });

    it('should reject non-array args', () => {
      const result = validateFieldType({ name: 'geometry', args: 'Point' as unknown as (string | number | boolean)[] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('args must be an array');
    });

    it('should reject object in args', () => {
      const result = validateFieldType({ name: 'geometry', args: [{ evil: true }] as unknown as (string | number | boolean)[] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('args[0] must be a string, number, or boolean');
    });

    it('should reject non-identifier string in args', () => {
      const result = validateFieldType({ name: 'geometry', args: ['Point; DROP TABLE'] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('args[0] string must be a valid identifier');
    });

    it('should reject negative array_dimensions', () => {
      const result = validateFieldType({ name: 'text', array_dimensions: -1 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('between 0 and 6');
    });

    it('should reject array_dimensions > 6', () => {
      const result = validateFieldType({ name: 'text', array_dimensions: 7 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('between 0 and 6');
    });

    it('should reject non-integer array_dimensions', () => {
      const result = validateFieldType({ name: 'text', array_dimensions: 1.5 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be an integer');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// FieldType to SQL
// ═══════════════════════════════════════════════════════════════════

describe('fieldTypeToSql', () => {
  it('should convert simple type', () => {
    expect(fieldTypeToSql({ name: 'text' })).toBe('text');
  });

  it('should convert type with args', () => {
    expect(fieldTypeToSql({ name: 'geometry', args: ['Point', 4326] })).toBe('geometry(Point, 4326)');
  });

  it('should convert type with schema', () => {
    expect(fieldTypeToSql({ name: 'my_type', schema: 'my_schema' })).toBe('my_schema.my_type');
  });

  it('should convert array type', () => {
    expect(fieldTypeToSql({ name: 'text', array_dimensions: 1 })).toBe('text[]');
  });

  it('should convert 2D array type', () => {
    expect(fieldTypeToSql({ name: 'text', array_dimensions: 2 })).toBe('text[][]');
  });

  it('should convert type with args and array', () => {
    expect(fieldTypeToSql({ name: 'numeric', args: [10, 2], array_dimensions: 1 }))
      .toBe('numeric(10, 2)[]');
  });

  it('should convert interval with range', () => {
    expect(fieldTypeToSql({ name: 'interval', range: ['day', 'second'] }))
      .toBe('interval day to second');
  });

  it('should convert interval with single range field', () => {
    expect(fieldTypeToSql({ name: 'interval', range: ['hour'] }))
      .toBe('interval hour');
  });

  it('should convert schema + args + array', () => {
    expect(fieldTypeToSql({ name: 'my_type', schema: 'my_schema', args: [10], array_dimensions: 1 }))
      .toBe('my_schema.my_type(10)[]');
  });
});

// ═══════════════════════════════════════════════════════════════════
// FieldType to AST
// ═══════════════════════════════════════════════════════════════════

describe('fieldTypeToAst', () => {
  it('should produce TypeName AST for simple type', () => {
    const ast = fieldTypeToAst({ name: 'text' });
    expect(ast.names).toEqual([{ String: { sval: 'text' } }]);
    expect(ast.typemod).toBe(-1);
  });

  it('should produce TypeName AST for schema-qualified type', () => {
    const ast = fieldTypeToAst({ name: 'my_type', schema: 'my_schema' });
    expect(ast.names).toEqual([
      { String: { sval: 'my_schema' } },
      { String: { sval: 'my_type' } }
    ]);
  });

  it('should produce TypeName AST with typmods for args', () => {
    const ast = fieldTypeToAst({ name: 'numeric', args: [10, 2] });
    expect(ast.typmods).toEqual([
      { A_Const: { ival: { ival: 10 } } },
      { A_Const: { ival: { ival: 2 } } }
    ]);
  });

  it('should produce TypeName AST with arrayBounds', () => {
    const ast = fieldTypeToAst({ name: 'text', array_dimensions: 2 });
    expect(ast.arrayBounds).toEqual([
      { Integer: { ival: -1 } },
      { Integer: { ival: -1 } }
    ]);
  });

  it('should produce ColumnRef typmods for string args (geometry)', () => {
    const ast = fieldTypeToAst({ name: 'geometry', args: ['Point', 4326] });
    expect(ast.typmods).toEqual([
      { ColumnRef: { fields: [{ String: { sval: 'point' } }] } },
      { A_Const: { ival: { ival: 4326 } } }
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// FieldDefault Validation
// ═══════════════════════════════════════════════════════════════════

describe('validateFieldDefault', () => {
  // ─── Simple function calls ────────────────────────────────────

  describe('simple function calls', () => {
    it('should accept now()', () => {
      const result = validateFieldDefault({ function: 'now' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('now()');
    });

    it('should accept gen_random_uuid()', () => {
      const result = validateFieldDefault({ function: 'gen_random_uuid' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('gen_random_uuid()');
    });

    it('should accept uuid_generate_v4()', () => {
      const result = validateFieldDefault({ function: 'uuid_generate_v4' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('uuid_generate_v4()');
    });

    it('should accept uuidv7()', () => {
      const result = validateFieldDefault({ function: 'uuidv7' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('uuidv7()');
    });

    it('should accept clock_timestamp()', () => {
      const result = validateFieldDefault({ function: 'clock_timestamp' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('clock_timestamp()');
    });
  });

  // ─── Schema-qualified function calls ──────────────────────────

  describe('schema-qualified function calls', () => {
    it('should accept jwt_public.current_user_id() with schema function map', () => {
      const result = validateFieldDefault(
        { function: 'current_user_id', schema: 'jwt_public' },
        {
          allowedSchemaFunctions: {
            jwt_public: ['current_user_id', 'current_origin']
          }
        }
      );
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('jwt_public.current_user_id()');
    });

    it('should accept jwt_public.current_origin() with schema function map', () => {
      const result = validateFieldDefault(
        { function: 'current_origin', schema: 'jwt_public' },
        {
          allowedSchemaFunctions: {
            jwt_public: ['current_user_id', 'current_origin']
          }
        }
      );
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('jwt_public.current_origin()');
    });

    it('should reject schema-qualified function when schema not allowed', () => {
      const result = validateFieldDefault(
        { function: 'evil_func', schema: 'evil_schema' }
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in the allowed');
    });

    it('should reject function when schema is allowed but function is not', () => {
      const result = validateFieldDefault(
        { function: 'evil_func', schema: 'jwt_public' },
        {
          allowedSchemaFunctions: {
            jwt_public: ['current_user_id']
          }
        }
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in the allowed functions list');
    });
  });

  // ─── Literal values ───────────────────────────────────────────

  describe('literal values', () => {
    it('should accept boolean false', () => {
      const result = validateFieldDefault({ value: false });
      expect(result.valid).toBe(true);
    });

    it('should accept boolean true', () => {
      const result = validateFieldDefault({ value: true });
      expect(result.valid).toBe(true);
    });

    it('should accept number 0', () => {
      const result = validateFieldDefault({ value: 0 });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('0');
    });

    it('should accept number 250', () => {
      const result = validateFieldDefault({ value: 250 });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toBe('250');
    });

    it('should accept string literal', () => {
      const result = validateFieldDefault({ value: 'pooled' });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toContain('pooled');
    });

    it('should accept null', () => {
      const result = validateFieldDefault({ value: null });
      expect(result.valid).toBe(true);
    });
  });

  // ─── Cast expressions ────────────────────────────────────────

  describe('cast expressions', () => {
    it('should accept {}::jsonb', () => {
      const result = validateFieldDefault({
        value: '{}',
        cast: { name: 'jsonb' }
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toContain('jsonb');
    });

    it('should accept {}::text[]', () => {
      const result = validateFieldDefault({
        value: '{}',
        cast: { name: 'text', array_dimensions: 1 }
      });
      expect(result.valid).toBe(true);
    });

    it('should accept 15 minutes::interval', () => {
      const result = validateFieldDefault({
        value: '15 minutes',
        cast: { name: 'interval' }
      });
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toContain('interval');
    });

    it('should reject cast to forbidden type', () => {
      const result = validateFieldDefault({
        value: '42',
        cast: { name: 'regclass' }
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Forbidden type');
    });
  });

  // ─── Nested function calls ────────────────────────────────────

  describe('nested function calls', () => {
    it('should accept encode(gen_random_bytes(16), hex)', () => {
      const result = validateFieldDefault(
        {
          function: 'encode',
          args: [
            { function: 'gen_random_bytes', args: [16] },
            'hex'
          ]
        },
        {
          allowedFunctions: [
            ...DEFAULT_ALLOWED_FUNCTIONS,
            'encode', 'gen_random_bytes'
          ]
        }
      );
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toContain('encode');
      expect(result.canonicalSql).toContain('gen_random_bytes');
    });

    it('should accept lpad(\'\', 32, \'0\')::bit(32)', () => {
      const result = validateFieldDefault(
        {
          function: 'lpad',
          args: ['', 32, '0'],
          cast: { name: 'bit', args: [32] }
        },
        {
          allowedFunctions: [
            ...DEFAULT_ALLOWED_FUNCTIONS,
            'lpad'
          ]
        }
      );
      expect(result.valid).toBe(true);
      expect(result.canonicalSql).toContain('lpad');
    });

    it('should reject disallowed nested function', () => {
      const result = validateFieldDefault({
        function: 'encode',
        args: [
          { function: 'pg_read_file', args: ['/etc/passwd'] },
          'hex'
        ]
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in the allowed functions list');
    });

    it('should reject excessive nesting depth', () => {
      // Build 5 levels of nesting
      let fd: FieldDefault = { function: 'now' };
      for (let i = 0; i < 5; i++) {
        fd = { function: 'wrapper', args: [fd] };
      }
      const result = validateFieldDefault(fd, { maxNestingDepth: 3 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('nesting exceeds maximum depth');
    });
  });

  // ─── Real-world defaults from codebase ────────────────────────

  describe('real-world defaults from constructive-db generators', () => {
    const realWorldOptions: FieldDefaultValidationOptions = {
      allowedFunctions: [
        ...DEFAULT_ALLOWED_FUNCTIONS,
        'encode', 'gen_random_bytes', 'lpad', 'coalesce'
      ],
      allowedSchemaFunctions: {
        jwt_public: [
          'current_user_id', 'current_origin',
          'current_ip_address', 'current_user_agent'
        ]
      }
    };

    it('default_value: now()', () => {
      const result = validateFieldDefault({ function: 'now' }, realWorldOptions);
      expect(result.valid).toBe(true);
    });

    it('default_value: gen_random_uuid()', () => {
      const result = validateFieldDefault({ function: 'gen_random_uuid' }, realWorldOptions);
      expect(result.valid).toBe(true);
    });

    it('default_value: uuidv7()', () => {
      const result = validateFieldDefault({ function: 'uuidv7' }, realWorldOptions);
      expect(result.valid).toBe(true);
    });

    it('default_value: clock_timestamp()', () => {
      const result = validateFieldDefault({ function: 'clock_timestamp' }, realWorldOptions);
      expect(result.valid).toBe(true);
    });

    it('default_value: jwt_public.current_user_id()', () => {
      const result = validateFieldDefault(
        { function: 'current_user_id', schema: 'jwt_public' },
        realWorldOptions
      );
      expect(result.valid).toBe(true);
    });

    it('default_value: jwt_public.current_origin()', () => {
      const result = validateFieldDefault(
        { function: 'current_origin', schema: 'jwt_public' },
        realWorldOptions
      );
      expect(result.valid).toBe(true);
    });

    it('default_value: jwt_public.current_ip_address()', () => {
      const result = validateFieldDefault(
        { function: 'current_ip_address', schema: 'jwt_public' },
        realWorldOptions
      );
      expect(result.valid).toBe(true);
    });

    it('default_value: jwt_public.current_user_agent()', () => {
      const result = validateFieldDefault(
        { function: 'current_user_agent', schema: 'jwt_public' },
        realWorldOptions
      );
      expect(result.valid).toBe(true);
    });

    it('default_value: false (boolean)', () => {
      const result = validateFieldDefault({ value: false }, realWorldOptions);
      expect(result.valid).toBe(true);
    });

    it('default_value: true (boolean)', () => {
      const result = validateFieldDefault({ value: true }, realWorldOptions);
      expect(result.valid).toBe(true);
    });

    it('default_value: 0 (number)', () => {
      const result = validateFieldDefault({ value: 0 }, realWorldOptions);
      expect(result.valid).toBe(true);
    });

    it("default_value: 'pooled' (string literal)", () => {
      const result = validateFieldDefault({ value: 'pooled' }, realWorldOptions);
      expect(result.valid).toBe(true);
    });

    it("default_value: '{}'::jsonb", () => {
      const result = validateFieldDefault(
        { value: '{}', cast: { name: 'jsonb' } },
        realWorldOptions
      );
      expect(result.valid).toBe(true);
    });

    it("default_value: '{}'::text[]", () => {
      const result = validateFieldDefault(
        { value: '{}', cast: { name: 'text', array_dimensions: 1 } },
        realWorldOptions
      );
      expect(result.valid).toBe(true);
    });

    it("default_value: '15 minutes'::interval", () => {
      const result = validateFieldDefault(
        { value: '15 minutes', cast: { name: 'interval' } },
        realWorldOptions
      );
      expect(result.valid).toBe(true);
    });

    it("default_value: '1 minute'::interval", () => {
      const result = validateFieldDefault(
        { value: '1 minute', cast: { name: 'interval' } },
        realWorldOptions
      );
      expect(result.valid).toBe(true);
    });

    it('default_value: 250 (number)', () => {
      const result = validateFieldDefault({ value: 250 }, realWorldOptions);
      expect(result.valid).toBe(true);
    });

    it("default_value: lpad('', 32, '0')::bit(32)", () => {
      const result = validateFieldDefault(
        {
          function: 'lpad',
          args: ['', 32, '0'],
          cast: { name: 'bit', args: [32] }
        },
        realWorldOptions
      );
      expect(result.valid).toBe(true);
    });
  });

  // ─── Security: SQL injection attempts ─────────────────────────

  describe('SQL injection prevention', () => {
    it('should reject function name with SQL injection', () => {
      const result = validateFieldDefault({ function: 'now(); DROP TABLE users' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid SQL identifier');
    });

    it('should reject schema with SQL injection', () => {
      const result = validateFieldDefault({
        function: 'func',
        schema: 'schema; DROP TABLE'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid SQL identifier');
    });

    it('should reject disallowed function (pg_sleep)', () => {
      const result = validateFieldDefault({ function: 'pg_sleep', args: [5] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in the allowed functions list');
    });

    it('should reject disallowed function (pg_read_file)', () => {
      const result = validateFieldDefault({ function: 'pg_read_file', args: ['/etc/passwd'] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in the allowed functions list');
    });

    it('should reject cast to regclass (system catalog probing)', () => {
      const result = validateFieldDefault({
        value: 'pg_class',
        cast: { name: 'regclass' }
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Forbidden type');
    });

    it('should reject cast to regtype', () => {
      const result = validateFieldDefault({
        value: 'integer',
        cast: { name: 'regtype' }
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Forbidden type');
    });

    it('should reject unknown keys (potential bypass)', () => {
      const result = validateFieldDefault({
        function: 'now',
        evil: 'DROP TABLE users'
      } as unknown as FieldDefault);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown FieldDefault key');
    });
  });

  // ─── Invalid structure ────────────────────────────────────────

  describe('invalid structure', () => {
    it('should reject null', () => {
      const result = validateFieldDefault(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-null object');
    });

    it('should reject string', () => {
      const result = validateFieldDefault('now()');
      expect(result.valid).toBe(false);
    });

    it('should reject empty object', () => {
      const result = validateFieldDefault({});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must have either "function" or "value"');
    });

    it('should reject both function and value', () => {
      const result = validateFieldDefault({ function: 'now', value: 42 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot have both');
    });

    it('should reject schema without function', () => {
      const result = validateFieldDefault({ value: 42, schema: 'public' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('schema is only valid with "function"');
    });

    it('should reject args without function', () => {
      const result = validateFieldDefault({ value: 42, args: [1, 2] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('args is only valid with "function"');
    });

    it('should reject non-string function', () => {
      const result = validateFieldDefault({ function: 42 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('function must be a string');
    });

    it('should reject non-array args', () => {
      const result = validateFieldDefault({ function: 'now', args: 'bad' as unknown as unknown[] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('args must be an array');
    });

    it('should reject object value (not literal)', () => {
      const result = validateFieldDefault({ value: { nested: true } as unknown as string });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string, number, boolean, null, or array');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// FieldDefault to SQL (deparse round-trip)
// ═══════════════════════════════════════════════════════════════════

describe('fieldDefaultToSql', () => {
  it('should deparse simple function call', () => {
    expect(fieldDefaultToSql({ function: 'now' })).toBe('now()');
  });

  it('should deparse schema-qualified function', () => {
    const sql = fieldDefaultToSql({ function: 'current_user_id', schema: 'jwt_public' });
    expect(sql).toBe('jwt_public.current_user_id()');
  });

  it('should deparse integer literal', () => {
    expect(fieldDefaultToSql({ value: 42 })).toBe('42');
  });

  it('should deparse string literal', () => {
    const sql = fieldDefaultToSql({ value: 'hello' });
    expect(sql).toContain('hello');
  });

  it('should deparse cast expression', () => {
    const sql = fieldDefaultToSql({ value: '{}', cast: { name: 'jsonb' } });
    expect(sql).toContain('jsonb');
    expect(sql).toContain('{}');
  });

  it('should deparse nested function call', () => {
    const sql = fieldDefaultToSql({
      function: 'encode',
      args: [
        { function: 'gen_random_bytes', args: [16] },
        'hex'
      ]
    });
    expect(sql).toContain('encode');
    expect(sql).toContain('gen_random_bytes');
    expect(sql).toContain('16');
    expect(sql).toContain('hex');
  });

  it('should deparse function with cast', () => {
    const sql = fieldDefaultToSql({
      function: 'lpad',
      args: ['', 32, '0'],
      cast: { name: 'bit', args: [32] }
    });
    expect(sql).toContain('lpad');
    expect(sql).toContain('bit');
  });
});

// ═══════════════════════════════════════════════════════════════════
// FieldDefault to AST
// ═══════════════════════════════════════════════════════════════════

describe('fieldDefaultToAst', () => {
  it('should produce FuncCall AST for function', () => {
    const ast = fieldDefaultToAst({ function: 'now' });
    expect(ast).toHaveProperty('FuncCall');
    const fc = (ast as { FuncCall: Record<string, unknown> }).FuncCall;
    expect(fc.funcname).toEqual([{ String: { sval: 'now' } }]);
  });

  it('should produce FuncCall AST for schema-qualified function', () => {
    const ast = fieldDefaultToAst({ function: 'current_user_id', schema: 'jwt_public' });
    const fc = (ast as { FuncCall: Record<string, unknown> }).FuncCall;
    expect(fc.funcname).toEqual([
      { String: { sval: 'jwt_public' } },
      { String: { sval: 'current_user_id' } }
    ]);
  });

  it('should produce A_Const AST for integer literal', () => {
    const ast = fieldDefaultToAst({ value: 42 });
    expect(ast).toEqual({ A_Const: { ival: { ival: 42 } } });
  });

  it('should produce A_Const AST for string literal', () => {
    const ast = fieldDefaultToAst({ value: 'hello' });
    expect(ast).toEqual({ A_Const: { sval: { sval: 'hello' } } });
  });

  it('should produce A_Const AST for boolean true', () => {
    const ast = fieldDefaultToAst({ value: true });
    expect(ast).toEqual({ A_Const: { boolval: { boolval: true } } });
  });

  it('should produce A_Const AST for boolean false', () => {
    const ast = fieldDefaultToAst({ value: false });
    expect(ast).toEqual({ A_Const: { boolval: {} } });
  });

  it('should produce A_Const AST for null', () => {
    const ast = fieldDefaultToAst({ value: null });
    expect(ast).toEqual({ A_Const: { isnull: true } });
  });

  it('should produce TypeCast AST for cast expression', () => {
    const ast = fieldDefaultToAst({ value: '{}', cast: { name: 'jsonb' } });
    expect(ast).toHaveProperty('TypeCast');
    const tc = (ast as { TypeCast: Record<string, unknown> }).TypeCast;
    expect(tc.arg).toEqual({ A_Const: { sval: { sval: '{}' } } });
    expect(tc.typeName).toBeDefined();
  });

  it('should produce nested FuncCall AST', () => {
    const ast = fieldDefaultToAst({
      function: 'encode',
      args: [
        { function: 'gen_random_bytes', args: [16] },
        'hex'
      ]
    });
    const fc = (ast as { FuncCall: Record<string, unknown> }).FuncCall;
    const args = fc.args as Record<string, unknown>[];
    expect(args).toHaveLength(2);
    expect(args[0]).toHaveProperty('FuncCall'); // nested gen_random_bytes
    expect(args[1]).toEqual({ A_Const: { sval: { sval: 'hex' } } });
  });

  it('should throw on excessive nesting depth', () => {
    let fd: FieldDefault = { function: 'now' };
    for (let i = 0; i < 15; i++) {
      fd = { function: 'wrapper', args: [fd] };
    }
    expect(() => fieldDefaultToAst(fd)).toThrow('nesting exceeds maximum depth');
  });

  it('should produce A_ArrayExpr AST for array value', () => {
    const ast = fieldDefaultToAst({ value: ['a', 'b', 'c'] });
    expect(ast).toHaveProperty('A_ArrayExpr');
    const arr = (ast as { A_ArrayExpr: { elements: unknown[] } }).A_ArrayExpr;
    expect(arr.elements).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// FORBIDDEN_TYPES constant
// ═══════════════════════════════════════════════════════════════════

describe('FORBIDDEN_TYPES', () => {
  it('should contain all system catalog OID-alias types', () => {
    expect(FORBIDDEN_TYPES.has('regclass')).toBe(true);
    expect(FORBIDDEN_TYPES.has('regtype')).toBe(true);
    expect(FORBIDDEN_TYPES.has('regproc')).toBe(true);
    expect(FORBIDDEN_TYPES.has('regprocedure')).toBe(true);
    expect(FORBIDDEN_TYPES.has('regoper')).toBe(true);
    expect(FORBIDDEN_TYPES.has('regoperator')).toBe(true);
    expect(FORBIDDEN_TYPES.has('regnamespace')).toBe(true);
    expect(FORBIDDEN_TYPES.has('regrole')).toBe(true);
    expect(FORBIDDEN_TYPES.has('regconfig')).toBe(true);
    expect(FORBIDDEN_TYPES.has('regdictionary')).toBe(true);
  });

  it('should have exactly 10 entries', () => {
    expect(FORBIDDEN_TYPES.size).toBe(10);
  });

  it('should NOT contain normal types', () => {
    expect(FORBIDDEN_TYPES.has('text')).toBe(false);
    expect(FORBIDDEN_TYPES.has('integer')).toBe(false);
    expect(FORBIDDEN_TYPES.has('jsonb')).toBe(false);
  });
});
