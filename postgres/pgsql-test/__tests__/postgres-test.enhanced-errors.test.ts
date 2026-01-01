process.env.LOG_SCOPE = 'pgsql-test';

import { 
  extractPgErrorFields, 
  formatPgErrorFields, 
  formatPgError 
} from '../src/utils';

describe('PostgreSQL Error Formatting Utilities', () => {
  describe('extractPgErrorFields', () => {
    it('extracts PostgreSQL error fields from error object', () => {
      const mockError = {
        message: 'invalid input syntax for type json',
        code: '22P02',
        detail: 'Token "not_valid_json" is invalid.',
        hint: 'Check your JSON syntax',
        where: 'SQL statement',
        position: '42',
        schema: 'public',
        table: 'test_table',
        column: 'config',
        dataType: 'jsonb'
      };

      const fields = extractPgErrorFields(mockError);
      
      expect(fields).not.toBeNull();
      expect(fields!.code).toBe('22P02');
      expect(fields!.detail).toBe('Token "not_valid_json" is invalid.');
      expect(fields!.hint).toBe('Check your JSON syntax');
      expect(fields!.where).toBe('SQL statement');
      expect(fields!.position).toBe('42');
      expect(fields!.schema).toBe('public');
      expect(fields!.table).toBe('test_table');
      expect(fields!.column).toBe('config');
      expect(fields!.dataType).toBe('jsonb');
    });

    it('returns null for non-PostgreSQL errors', () => {
      const genericError = new Error('Something went wrong');
      const fields = extractPgErrorFields(genericError);
      expect(fields).toBeNull();
    });

    it('returns null for null/undefined input', () => {
      expect(extractPgErrorFields(null)).toBeNull();
      expect(extractPgErrorFields(undefined)).toBeNull();
    });
  });

  describe('formatPgErrorFields', () => {
    it('formats PostgreSQL error fields into readable lines', () => {
      const fields = {
        detail: 'Token "not_valid_json" is invalid.',
        hint: 'Check your JSON syntax',
        where: 'SQL statement',
        schema: 'public',
        table: 'test_table',
        column: 'config',
        dataType: 'jsonb',
        position: '42'
      };

      const lines = formatPgErrorFields(fields);
      
      expect(lines).toContain('Detail: Token "not_valid_json" is invalid.');
      expect(lines).toContain('Hint: Check your JSON syntax');
      expect(lines).toContain('Where: SQL statement');
      expect(lines).toContain('Schema: public');
      expect(lines).toContain('Table: test_table');
      expect(lines).toContain('Column: config');
      expect(lines).toContain('Data Type: jsonb');
      expect(lines).toContain('Position: 42');
    });

    it('only includes present fields', () => {
      const fields = {
        detail: 'Some detail'
      };

      const lines = formatPgErrorFields(fields);
      
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('Detail: Some detail');
    });
  });

  describe('formatPgError', () => {
    it('formats error with message and PostgreSQL fields', () => {
      const mockError = {
        message: 'invalid input syntax for type json',
        code: '22P02',
        detail: 'Token "not_valid_json" is invalid.'
      };

      const formatted = formatPgError(mockError);
      
      expect(formatted).toContain('invalid input syntax for type json');
      expect(formatted).toContain('Detail: Token "not_valid_json" is invalid.');
    });

    it('includes query context when provided', () => {
      const mockError = {
        message: 'invalid input syntax for type json',
        code: '22P02',
        detail: 'Token "not_valid_json" is invalid.'
      };

      const formatted = formatPgError(mockError, {
        query: 'INSERT INTO test_table (config) VALUES ($1)',
        values: ['not_valid_json']
      });
      
      expect(formatted).toContain('invalid input syntax for type json');
      expect(formatted).toContain('Detail: Token "not_valid_json" is invalid.');
      expect(formatted).toContain('Query: INSERT INTO test_table (config) VALUES ($1)');
      expect(formatted).toContain('Values: ["not_valid_json"]');
    });

    it('handles non-object errors gracefully', () => {
      expect(formatPgError('string error')).toBe('string error');
      expect(formatPgError(null)).toBe('null');
      expect(formatPgError(undefined)).toBe('undefined');
    });

    it('formats JSON/JSONB type mismatch error with query context', () => {
      const mockError = {
        message: 'invalid input syntax for type json',
        code: '22P02',
        detail: 'Token "not_valid_json" is invalid.',
        position: '42'
      };

      const formatted = formatPgError(mockError, {
        query: 'INSERT INTO test_constraints (name, config) VALUES ($1, $2)',
        values: ['test', 'not_valid_json']
      });
      
      expect(formatted).toContain('invalid input syntax for type json');
      expect(formatted).toContain('Detail: Token "not_valid_json" is invalid.');
      expect(formatted).toContain('Position: 42');
      expect(formatted).toContain('Query: INSERT INTO test_constraints (name, config) VALUES ($1, $2)');
      expect(formatted).toContain('Values: ["test","not_valid_json"]');
    });

    it('formats unique constraint violation error', () => {
      const mockError = {
        message: 'duplicate key value violates unique constraint "users_email_key"',
        code: '23505',
        detail: 'Key (email)=(test@example.com) already exists.',
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key'
      };

      const formatted = formatPgError(mockError);
      
      expect(formatted).toContain('duplicate key value violates unique constraint');
      expect(formatted).toContain('Detail: Key (email)=(test@example.com) already exists.');
      expect(formatted).toContain('Schema: public');
      expect(formatted).toContain('Table: users');
      expect(formatted).toContain('Constraint: users_email_key');
    });

    it('formats foreign key violation error', () => {
      const mockError = {
        message: 'insert or update on table "orders" violates foreign key constraint "orders_user_id_fkey"',
        code: '23503',
        detail: 'Key (user_id)=(999) is not present in table "users".',
        schema: 'public',
        table: 'orders',
        constraint: 'orders_user_id_fkey'
      };

      const formatted = formatPgError(mockError);
      
      expect(formatted).toContain('violates foreign key constraint');
      expect(formatted).toContain('Detail: Key (user_id)=(999) is not present in table "users".');
      expect(formatted).toContain('Schema: public');
      expect(formatted).toContain('Table: orders');
      expect(formatted).toContain('Constraint: orders_user_id_fkey');
    });

    it('formats undefined table error', () => {
      const mockError = {
        message: 'relation "nonexistent_table" does not exist',
        code: '42P01',
        position: '15'
      };

      const formatted = formatPgError(mockError, {
        query: 'SELECT * FROM nonexistent_table'
      });
      
      expect(formatted).toContain('relation "nonexistent_table" does not exist');
      expect(formatted).toContain('Position: 15');
      expect(formatted).toContain('Query: SELECT * FROM nonexistent_table');
    });
  });
});
