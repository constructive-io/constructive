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

    it('formats nested EXECUTE migration error with full call stack context', () => {
      // This simulates what PostgreSQL returns when an error occurs inside
      // a nested EXECUTE call in the pgpm migration deploy flow:
      // 1. Client calls: CALL pgpm_migrate.deploy(...)
      // 2. pgpm_migrate.deploy does: EXECUTE p_deploy_sql
      // 3. The deploy SQL contains a PL/pgSQL block that fails
      //
      // The 'where' field contains the full PL/pgSQL call stack
      const mockError = {
        message: 'relation "nonexistent_schema.some_table" does not exist',
        code: '42P01',
        where: `PL/pgSQL function inline_code_block line 5 at SQL statement
SQL statement "CREATE TABLE nonexistent_schema.some_table (id serial PRIMARY KEY)"
PL/pgSQL function pgpm_migrate.deploy(text,text,text,text[],text,boolean) line 15 at EXECUTE`,
        internalQuery: 'CREATE TABLE nonexistent_schema.some_table (id serial PRIMARY KEY)',
        position: '14'
      };

      const formatted = formatPgError(mockError, {
        query: 'CALL pgpm_migrate.deploy($1::TEXT, $2::TEXT, $3::TEXT, $4::TEXT[], $5::TEXT, $6::BOOLEAN)',
        values: ['my_package', 'create_tables', 'abc123', null, 'DO $$ BEGIN CREATE TABLE nonexistent_schema.some_table (id serial PRIMARY KEY); END $$;', false]
      });
      
      // Verify the error message is included
      expect(formatted).toContain('relation "nonexistent_schema.some_table" does not exist');
      
      // Verify the nested call stack is captured in the 'where' field
      expect(formatted).toContain('Where:');
      expect(formatted).toContain('inline_code_block');
      expect(formatted).toContain('pgpm_migrate.deploy');
      expect(formatted).toContain('EXECUTE');
      
      // Verify the internal query (the actual failing SQL) is captured
      expect(formatted).toContain('Internal Query:');
      expect(formatted).toContain('CREATE TABLE nonexistent_schema.some_table');
      
      // Verify the outer query context is included
      expect(formatted).toContain('Query: CALL pgpm_migrate.deploy');
      expect(formatted).toContain('Values:');
      expect(formatted).toContain('my_package');
      expect(formatted).toContain('create_tables');
    });

    it('formats migration error with constraint violation in nested EXECUTE', () => {
      // Simulates a constraint violation that occurs inside a migration script
      // executed via pgpm_migrate.deploy -> EXECUTE
      const mockError = {
        message: 'duplicate key value violates unique constraint "users_email_key"',
        code: '23505',
        detail: 'Key (email)=(admin@example.com) already exists.',
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key',
        where: `SQL statement "INSERT INTO users (email, name) VALUES ('admin@example.com', 'Admin')"
PL/pgSQL function pgpm_migrate.deploy(text,text,text,text[],text,boolean) line 15 at EXECUTE`
      };

      const formatted = formatPgError(mockError, {
        query: 'CALL pgpm_migrate.deploy($1::TEXT, $2::TEXT, $3::TEXT, $4::TEXT[], $5::TEXT, $6::BOOLEAN)',
        values: ['my_package', 'seed_users', 'def456', null, "INSERT INTO users (email, name) VALUES ('admin@example.com', 'Admin');", false]
      });
      
      // Verify constraint violation details are captured
      expect(formatted).toContain('duplicate key value violates unique constraint');
      expect(formatted).toContain('Detail: Key (email)=(admin@example.com) already exists.');
      expect(formatted).toContain('Schema: public');
      expect(formatted).toContain('Table: users');
      expect(formatted).toContain('Constraint: users_email_key');
      
      // Verify the nested call stack shows where the error occurred
      expect(formatted).toContain('Where:');
      expect(formatted).toContain('pgpm_migrate.deploy');
      expect(formatted).toContain('EXECUTE');
    });

    it('formats transaction aborted error with context from previous failure', () => {
      // When a previous command in a transaction fails, subsequent commands
      // get error code 25P02 (transaction aborted). This test verifies we
      // capture enough context to help debug the original failure.
      const mockError = {
        message: 'current transaction is aborted, commands ignored until end of transaction block',
        code: '25P02'
      };

      const formatted = formatPgError(mockError, {
        query: 'CALL pgpm_migrate.deploy($1::TEXT, $2::TEXT, $3::TEXT, $4::TEXT[], $5::TEXT, $6::BOOLEAN)',
        values: ['my_package', 'second_change', 'ghi789', ['first_change'], 'CREATE INDEX ...', false]
      });
      
      // Verify the transaction aborted error is captured
      expect(formatted).toContain('current transaction is aborted');
      
      // Verify query context is included to help identify which command triggered this
      expect(formatted).toContain('Query: CALL pgpm_migrate.deploy');
      expect(formatted).toContain('second_change');
    });
  });

  describe('Error Message Snapshots', () => {
    it('snapshot: JSON/JSONB type mismatch error', () => {
      // Simple case: inserting plain text into a jsonb column
      const mockError = {
        message: 'invalid input syntax for type json',
        code: '22P02',
        detail: 'Token "not_valid_json" is invalid.',
        position: '52'
      };

      const formatted = formatPgError(mockError, {
        query: 'INSERT INTO test_constraints (name, config) VALUES ($1, $2)',
        values: ['test_name', 'not_valid_json']
      });
      
      expect(formatted).toMatchSnapshot();
    });

    it('snapshot: nested EXECUTE migration error with full call stack', () => {
      // Complex case: error inside pgpm_migrate.deploy -> EXECUTE p_deploy_sql
      // This shows the full PL/pgSQL call stack in the 'where' field
      const mockError = {
        message: 'relation "nonexistent_schema.some_table" does not exist',
        code: '42P01',
        where: `PL/pgSQL function inline_code_block line 5 at SQL statement
SQL statement "CREATE TABLE nonexistent_schema.some_table (id serial PRIMARY KEY)"
PL/pgSQL function pgpm_migrate.deploy(text,text,text,text[],text,boolean) line 15 at EXECUTE`,
        internalQuery: 'CREATE TABLE nonexistent_schema.some_table (id serial PRIMARY KEY)',
        position: '14'
      };

      const formatted = formatPgError(mockError, {
        query: 'CALL pgpm_migrate.deploy($1::TEXT, $2::TEXT, $3::TEXT, $4::TEXT[], $5::TEXT, $6::BOOLEAN)',
        values: ['my_package', 'create_tables', 'abc123hash', null, 'DO $$ BEGIN CREATE TABLE nonexistent_schema.some_table (id serial PRIMARY KEY); END $$;', false]
      });
      
      expect(formatted).toMatchSnapshot();
    });
  });
});
