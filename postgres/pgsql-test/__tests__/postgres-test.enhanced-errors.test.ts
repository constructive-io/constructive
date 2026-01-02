process.env.LOG_SCOPE = 'pgsql-test';

import { getConnections } from '../src/connect';
import { PgTestClient } from '../src/test-client';

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
});

beforeEach(async () => {
  await pg.beforeEach();
});

afterEach(async () => {
  await pg.afterEach();
});

afterAll(async () => {
  await teardown();
});

describe('Enhanced PostgreSQL Error Messages', () => {
  describe('JSON/JSONB Type Mismatch Errors', () => {
    beforeEach(async () => {
      // Create a table with a jsonb column
      await pg.query(`
        CREATE TABLE test_json_errors (
          id serial PRIMARY KEY,
          name text NOT NULL,
          config jsonb NOT NULL
        )
      `);
    });

    it('captures JSON type mismatch error with detail field', async () => {
      let caughtError: any = null;
      try {
        await pg.query(
          'INSERT INTO test_json_errors (name, config) VALUES ($1, $2)',
          ['test', 'not_valid_json']
        );
      } catch (err) {
        caughtError = err;
      }

      // Verify we caught an error
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatch(/invalid input syntax for type json/i);
      
      // Verify PostgreSQL extended error fields are present
      expect(caughtError.code).toBe('22P02'); // invalid_text_representation
      
      // The error message should be enhanced with detail, query, and values
      expect(caughtError.message).toContain('Detail:');
      expect(caughtError.message).toContain('Query:');
      expect(caughtError.message).toContain('Values:');
    });

    it('snapshot: JSON/JSONB type mismatch error', async () => {
      let caughtError: any = null;
      try {
        await pg.query(
          'INSERT INTO test_json_errors (name, config) VALUES ($1, $2)',
          ['test_name', 'not_valid_json']
        );
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatchSnapshot();
    });
  });

  describe('Unique Constraint Violation Errors', () => {
    beforeEach(async () => {
      await pg.query(`
        CREATE TABLE test_unique_errors (
          id serial PRIMARY KEY,
          email text UNIQUE NOT NULL
        )
      `);
    });

    it('captures unique constraint violation with table and constraint info', async () => {
      // Insert first row
      await pg.query(
        'INSERT INTO test_unique_errors (email) VALUES ($1)',
        ['test@example.com']
      );

      // Try to insert duplicate
      let caughtError: any = null;
      try {
        await pg.query(
          'INSERT INTO test_unique_errors (email) VALUES ($1)',
          ['test@example.com']
        );
      } catch (err) {
        caughtError = err;
      }

      // Verify we caught an error
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatch(/duplicate key value violates unique constraint/i);
      
      // Verify PostgreSQL extended error fields are present
      expect(caughtError.code).toBe('23505'); // unique_violation
      
      // The error message should be enhanced with schema, table, constraint info
      expect(caughtError.message).toContain('Detail:');
      expect(caughtError.message).toContain('Schema:');
      expect(caughtError.message).toContain('Table:');
      expect(caughtError.message).toContain('Constraint:');
    });

    it('snapshot: unique constraint violation error', async () => {
      await pg.query(
        'INSERT INTO test_unique_errors (email) VALUES ($1)',
        ['admin@example.com']
      );

      let caughtError: any = null;
      try {
        await pg.query(
          'INSERT INTO test_unique_errors (email) VALUES ($1)',
          ['admin@example.com']
        );
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatchSnapshot();
    });
  });

  describe('Foreign Key Violation Errors', () => {
    beforeEach(async () => {
      await pg.query(`
        CREATE TABLE test_parent (
          id serial PRIMARY KEY,
          name text NOT NULL
        )
      `);
      
      await pg.query(`
        CREATE TABLE test_child (
          id serial PRIMARY KEY,
          parent_id integer REFERENCES test_parent(id) NOT NULL
        )
      `);
    });

    it('captures foreign key violation with table and constraint info', async () => {
      let caughtError: any = null;
      try {
        await pg.query(
          'INSERT INTO test_child (parent_id) VALUES ($1)',
          [999]
        );
      } catch (err) {
        caughtError = err;
      }

      // Verify we caught an error
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatch(/violates foreign key constraint/i);
      
      // Verify PostgreSQL extended error fields are present
      expect(caughtError.code).toBe('23503'); // foreign_key_violation
      
      // The error message should be enhanced
      expect(caughtError.message).toContain('Detail:');
      expect(caughtError.message).toContain('Schema:');
      expect(caughtError.message).toContain('Table:');
    });

    it('snapshot: foreign key violation error', async () => {
      let caughtError: any = null;
      try {
        await pg.query(
          'INSERT INTO test_child (parent_id) VALUES ($1)',
          [999]
        );
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatchSnapshot();
    });
  });

  describe('Undefined Table Errors', () => {
    it('captures undefined table error', async () => {
      let caughtError: any = null;
      try {
        await pg.query('SELECT * FROM nonexistent_table_xyz');
      } catch (err) {
        caughtError = err;
      }

      // Verify we caught an error
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatch(/relation.*nonexistent_table_xyz.*does not exist/i);
      
      // Verify PostgreSQL extended error fields are present
      expect(caughtError.code).toBe('42P01'); // undefined_table
      
      // The error message should include the query
      expect(caughtError.message).toContain('Query:');
    });

    it('snapshot: undefined table error', async () => {
      let caughtError: any = null;
      try {
        await pg.query('SELECT * FROM nonexistent_table_xyz');
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatchSnapshot();
    });
  });

  describe('Nested PL/pgSQL Errors (Migration-style)', () => {
    it('captures error from nested EXECUTE with call stack in where field', async () => {
      // Create a function that uses EXECUTE internally (simulating migration behavior)
      await pg.query(`
        CREATE FUNCTION test_nested_execute() RETURNS void AS $$
        BEGIN
          EXECUTE 'CREATE TABLE nonexistent_schema_xyz.some_table (id serial PRIMARY KEY)';
        END;
        $$ LANGUAGE plpgsql
      `);

      let caughtError: any = null;
      try {
        await pg.query('SELECT test_nested_execute()');
      } catch (err) {
        caughtError = err;
      }

      // Verify we caught an error
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatch(/schema.*nonexistent_schema_xyz.*does not exist/i);
      
      // Verify the 'where' field captures the PL/pgSQL call stack
      // The enhanced error should include the Where: field showing the function context
      expect(caughtError.message).toContain('Where:');
      expect(caughtError.message).toContain('test_nested_execute');
    });

    it('snapshot: nested EXECUTE error with PL/pgSQL call stack', async () => {
      await pg.query(`
        CREATE FUNCTION test_migration_error() RETURNS void AS $$
        BEGIN
          EXECUTE 'INSERT INTO nonexistent_migration_table (col) VALUES (1)';
        END;
        $$ LANGUAGE plpgsql
      `);

      let caughtError: any = null;
      try {
        await pg.query('SELECT test_migration_error()');
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatchSnapshot();
    });

    it('captures constraint violation inside nested EXECUTE', async () => {
      // Create a table and function that will cause a constraint violation
      await pg.query(`
        CREATE TABLE test_nested_constraint (
          id serial PRIMARY KEY,
          email text UNIQUE NOT NULL
        )
      `);

      await pg.query(`
        CREATE FUNCTION test_nested_constraint_error() RETURNS void AS $$
        BEGIN
          EXECUTE 'INSERT INTO test_nested_constraint (email) VALUES (''duplicate@test.com'')';
          EXECUTE 'INSERT INTO test_nested_constraint (email) VALUES (''duplicate@test.com'')';
        END;
        $$ LANGUAGE plpgsql
      `);

      let caughtError: any = null;
      try {
        await pg.query('SELECT test_nested_constraint_error()');
      } catch (err) {
        caughtError = err;
      }

      // Verify we caught an error
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatch(/duplicate key value violates unique constraint/i);
      
      // Verify the error includes the nested context
      expect(caughtError.message).toContain('Where:');
      expect(caughtError.message).toContain('test_nested_constraint_error');
      expect(caughtError.message).toContain('Detail:');
    });

    it('snapshot: constraint violation inside nested EXECUTE', async () => {
      await pg.query(`
        CREATE TABLE test_nested_unique (
          id serial PRIMARY KEY,
          code text UNIQUE NOT NULL
        )
      `);

      await pg.query(`
        CREATE FUNCTION test_nested_unique_error() RETURNS void AS $$
        BEGIN
          EXECUTE 'INSERT INTO test_nested_unique (code) VALUES (''ABC123'')';
          EXECUTE 'INSERT INTO test_nested_unique (code) VALUES (''ABC123'')';
        END;
        $$ LANGUAGE plpgsql
      `);

      let caughtError: any = null;
      try {
        await pg.query('SELECT test_nested_unique_error()');
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatchSnapshot();
    });
  });
});
