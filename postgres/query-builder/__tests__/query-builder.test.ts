import {
  add,
  and,
  col,
  eq,
  fn,
  gt,
  isNotNull,
  isNull,
  lit,
  lte,
  not,
  or,
  param,
  QueryBuilder,
} from '../src/query-builder';

// The deparser outputs pretty-printed SQL with newlines.
// Use the `s` flag on regex so `.` matches newlines, or use [\s\S].
// The deparser outputs `JOIN` for inner joins (standard SQL), not `INNER JOIN`.
// Named args use `=>` syntax (PG 14+), not `:=`.

describe('QueryBuilder', () => {
  // =========================================================================
  // SELECT
  // =========================================================================
  describe('SELECT', () => {
    it('should build a basic SELECT *', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select()
        .build();

      expect(text).toMatch(/SELECT\s+\*/);
      expect(text).toMatch(/FROM\s+users/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with specific columns', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id', 'name', 'email'])
        .build();

      expect(text).toMatch(/SELECT/);
      expect(text).toMatch(/id/);
      expect(text).toMatch(/name/);
      expect(text).toMatch(/email/);
      expect(text).toMatch(/FROM\s+users/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with WHERE', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id', 'name'])
        .where({ age: { greaterThan: 18 } })
        .build();

      expect(text).toMatch(/WHERE/);
      expect(text).toMatch(/age\s*>\s*\$1/);
      expect(values).toEqual([18]);
    });

    it('should build SELECT with multiple WHERE conditions (AND)', () => {
      const { text, values } = new QueryBuilder()
        .table('orders')
        .select(['order_id', 'total'])
        .where({ total: { greaterThanOrEqualTo: 100 } })
        .where({ status: { equalTo: 'active' } })
        .build();

      expect(text).toMatch(/total\s*>=\s*\$1/);
      expect(text).toMatch(/status\s*=\s*\$2/);
      expect(text).toMatch(/AND/);
      expect(values).toEqual([100, 'active']);
    });

    it('should build SELECT with LIMIT', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .limit(10)
        .build();

      expect(text).toMatch(/LIMIT\s+10/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with OFFSET', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .limit(10)
        .offset(20)
        .build();

      expect(text).toMatch(/LIMIT\s+10/);
      expect(text).toMatch(/OFFSET\s+20/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with ORDER BY', () => {
      const { text, values } = new QueryBuilder()
        .table('products')
        .select(['id', 'name', 'price'])
        .orderBy('price', 'DESC')
        .orderBy('name', 'ASC')
        .build();

      expect(text).toMatch(/ORDER BY/);
      expect(text).toMatch(/price\s+DESC/);
      expect(text).toMatch(/name\s+ASC/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with ORDER BY NULLS FIRST/LAST', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id', 'name'])
        .orderBy('name', 'ASC', 'LAST')
        .build();

      expect(text).toMatch(/ORDER BY/);
      expect(text).toMatch(/name\s+ASC\s+NULLS LAST/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with GROUP BY', () => {
      const { text, values } = new QueryBuilder()
        .table('orders')
        .select(['customer_id', 'total'])
        .groupBy(['customer_id'])
        .build();

      expect(text).toMatch(/GROUP BY\s+customer_id/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with DISTINCT', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['email'])
        .distinct()
        .build();

      expect(text).toMatch(/SELECT\s+DISTINCT/);
      expect(text).toMatch(/email/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with table alias', () => {
      const { text, values } = new QueryBuilder()
        .table('users', 'u')
        .select(['u.id', 'u.name'])
        .build();

      expect(text).toMatch(/users\s+(AS\s+)?u/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with WHERE IS NULL', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ deleted_at: { isNull: true } })
        .build();

      expect(text).toMatch(/deleted_at\s+IS\s+NULL/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with WHERE IS NOT NULL', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ email: { isNull: false } })
        .build();

      expect(text).toMatch(/email\s+IS\s+NOT\s+NULL/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with WHERE IN', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id', 'name'])
        .where({ id: { in: [1, 2, 3] } })
        .build();

      expect(text).toMatch(/id\s+IN\s*\(\s*\$1,\s*\$2,\s*\$3\s*\)/);
      expect(values).toEqual([1, 2, 3]);
    });
  });

  // =========================================================================
  // Schema qualification
  // =========================================================================
  describe('Schema Qualification', () => {
    it('should build SELECT with schema-qualified table', () => {
      const { text, values } = new QueryBuilder()
        .schema('public')
        .table('users')
        .select(['id'])
        .build();

      expect(text).toMatch(/FROM\s+public\.users/);
      expect(values).toEqual([]);
    });

    it('should quote schema names with special characters', () => {
      const { text } = new QueryBuilder()
        .schema('my-schema')
        .table('users')
        .select(['id'])
        .build();

      expect(text).toMatch(/"my-schema"\.users/);
    });

    it('should handle schema-qualified column references', () => {
      const { text } = new QueryBuilder()
        .table('users')
        .select(['users.id', 'users.name'])
        .build();

      expect(text).toMatch(/users\.id/);
      expect(text).toMatch(/users\.name/);
    });
  });

  // =========================================================================
  // INSERT
  // =========================================================================
  describe('INSERT', () => {
    it('should build a basic INSERT', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert({ name: 'Alice', email: 'alice@example.com' })
        .build();

      expect(text).toMatch(/INSERT\s+INTO\s+users/);
      expect(text).toMatch(/name/);
      expect(text).toMatch(/email/);
      expect(text).toMatch(/\$1/);
      expect(text).toMatch(/\$2/);
      expect(values).toEqual(['Alice', 'alice@example.com']);
    });

    it('should build INSERT with numeric and boolean values', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert({ name: 'Bob', age: 30, is_active: true })
        .build();

      expect(text).toMatch(/INSERT\s+INTO\s+users/);
      expect(values).toEqual(['Bob', 30, true]);
    });

    it('should build INSERT with NULL values', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert({ name: 'Charlie', email: null })
        .build();

      expect(text).toMatch(/INSERT\s+INTO\s+users/);
      expect(values).toEqual(['Charlie', null]);
    });

    it('should build multi-row INSERT', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert([
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 },
        ])
        .build();

      expect(text).toMatch(/\$1/);
      expect(text).toMatch(/\$2/);
      expect(text).toMatch(/\$3/);
      expect(text).toMatch(/\$4/);
      expect(values).toEqual(['Alice', 25, 'Bob', 30]);
    });

    it('should build INSERT with RETURNING', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert({ name: 'Alice' })
        .returning(['id', 'name'])
        .build();

      expect(text).toMatch(/RETURNING/);
      expect(text).toMatch(/id/);
      expect(values).toEqual(['Alice']);
    });

    it('should build INSERT with RETURNING *', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert({ name: 'Alice' })
        .returning()
        .build();

      expect(text).toMatch(/RETURNING\s+\*/);
      expect(values).toEqual(['Alice']);
    });

    it('should build INSERT with schema-qualified table', () => {
      const { text, values } = new QueryBuilder()
        .schema('public')
        .table('users')
        .insert({ name: 'Alice' })
        .build();

      expect(text).toMatch(/INSERT\s+INTO\s+public\.users/);
      expect(values).toEqual(['Alice']);
    });

    it('should build INSERT with ON CONFLICT DO NOTHING', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert({ name: 'Alice', email: 'alice@example.com' })
        .onConflict({
          columns: ['email'],
          action: 'nothing',
        })
        .build();

      expect(text).toMatch(/ON CONFLICT\s*\(\s*email\s*\)\s*DO NOTHING/);
      expect(values).toEqual(['Alice', 'alice@example.com']);
    });

    it('should build INSERT with ON CONFLICT DO UPDATE', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert({ name: 'Alice', email: 'alice@example.com' })
        .onConflict({
          columns: ['email'],
          action: 'update',
          updateColumns: { name: 'Alice Updated' },
        })
        .build();

      expect(text).toMatch(/ON CONFLICT\s*\(\s*email\s*\)\s*DO UPDATE/);
      expect(text).toMatch(/SET/);
      expect(text).toMatch(/name\s*=\s*\$3/);
      expect(values).toEqual(['Alice', 'alice@example.com', 'Alice Updated']);
    });
  });

  // =========================================================================
  // UPDATE
  // =========================================================================
  describe('UPDATE', () => {
    it('should build a basic UPDATE', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .update({ name: 'Bob' })
        .where({ id: { equalTo: 1 } })
        .build();

      expect(text).toMatch(/UPDATE\s+users\s+SET\s+name\s*=\s*\$1/);
      expect(text).toMatch(/WHERE\s+id\s*=\s*\$2/);
      expect(values).toEqual(['Bob', 1]);
    });

    it('should build UPDATE with multiple SET values', () => {
      const { text, values } = new QueryBuilder()
        .table('inventory')
        .update({ stock: 0, price: 9.99 })
        .where({ product_id: { equalTo: 'abc' } })
        .build();

      expect(text).toMatch(/SET\s+stock\s*=\s*\$1/);
      expect(text).toMatch(/price\s*=\s*\$2/);
      expect(text).toMatch(/product_id\s*=\s*\$3/);
      expect(values).toEqual([0, 9.99, 'abc']);
    });

    it('should build UPDATE with multiple WHERE conditions', () => {
      const { text, values } = new QueryBuilder()
        .table('inventory')
        .update({ stock: 0 })
        .where({ product_id: { equalTo: 'abc' } })
        .where({ warehouse_id: { equalTo: 'xyz' } })
        .build();

      expect(text).toMatch(/product_id\s*=\s*\$2/);
      expect(text).toMatch(/warehouse_id\s*=\s*\$3/);
      expect(text).toMatch(/AND/);
      expect(values).toEqual([0, 'abc', 'xyz']);
    });

    it('should build UPDATE with RETURNING', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .update({ name: 'Bob' })
        .where({ id: { equalTo: 1 } })
        .returning(['id', 'name'])
        .build();

      expect(text).toMatch(/RETURNING/);
      expect(text).toMatch(/id/);
      expect(values).toEqual(['Bob', 1]);
    });

    it('should build UPDATE with schema qualification', () => {
      const { text, values } = new QueryBuilder()
        .schema('public')
        .table('users')
        .update({ name: 'Bob' })
        .where({ id: { equalTo: 1 } })
        .build();

      expect(text).toMatch(/UPDATE\s+public\.users/);
      expect(values).toEqual(['Bob', 1]);
    });
  });

  // =========================================================================
  // DELETE
  // =========================================================================
  describe('DELETE', () => {
    it('should build a basic DELETE', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .delete()
        .where({ id: { equalTo: 1 } })
        .build();

      expect(text).toMatch(/DELETE\s+FROM\s+users/);
      expect(text).toMatch(/WHERE\s+id\s*=\s*\$1/);
      expect(values).toEqual([1]);
    });

    it('should build DELETE with multiple WHERE conditions', () => {
      const { text, values } = new QueryBuilder()
        .table('inventory')
        .delete()
        .where({ product_id: { equalTo: 'abc' } })
        .where({ warehouse_id: { equalTo: 'xyz' } })
        .build();

      expect(text).toMatch(/product_id\s*=\s*\$1/);
      expect(text).toMatch(/warehouse_id\s*=\s*\$2/);
      expect(text).toMatch(/AND/);
      expect(values).toEqual(['abc', 'xyz']);
    });

    it('should build DELETE with RETURNING', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .delete()
        .where({ id: { equalTo: 1 } })
        .returning()
        .build();

      expect(text).toMatch(/RETURNING\s+\*/);
      expect(values).toEqual([1]);
    });

    it('should build DELETE with schema qualification', () => {
      const { text } = new QueryBuilder()
        .schema('my-schema')
        .table('users')
        .delete()
        .where({ id: { equalTo: 1 } })
        .build();

      expect(text).toMatch(/"my-schema"\.users/);
    });
  });

  // =========================================================================
  // JOINs
  // =========================================================================
  describe('JOINs', () => {
    it('should build SELECT with INNER JOIN', () => {
      const { text, values } = new QueryBuilder()
        .table('orders')
        .select(['orders.id', 'customers.name'])
        .innerJoin('customers', 'orders.customer_id', '=', 'customers.id')
        .build();

      // Deparser outputs `JOIN` for inner joins (standard SQL)
      expect(text).toMatch(/JOIN\s+customers\s+ON\s+orders\.customer_id\s*=\s*customers\.id/);
      expect(values).toEqual([]);
    });

    it('should build SELECT with LEFT JOIN', () => {
      const { text } = new QueryBuilder()
        .table('users')
        .select(['users.id', 'profiles.bio'])
        .leftJoin('profiles', 'users.id', '=', 'profiles.user_id')
        .build();

      expect(text).toMatch(/LEFT JOIN\s+profiles\s+ON\s+users\.id\s*=\s*profiles\.user_id/);
    });

    it('should build SELECT with RIGHT JOIN', () => {
      const { text } = new QueryBuilder()
        .table('users')
        .select(['*'])
        .rightJoin('orders', 'users.id', '=', 'orders.user_id')
        .build();

      expect(text).toMatch(/RIGHT JOIN\s+orders\s+ON\s+users\.id\s*=\s*orders\.user_id/);
    });

    it('should build SELECT with FULL JOIN', () => {
      const { text } = new QueryBuilder()
        .table('users')
        .select(['*'])
        .fullJoin('logs', 'users.id', '=', 'logs.user_id')
        .build();

      expect(text).toMatch(/FULL JOIN\s+logs\s+ON\s+users\.id\s*=\s*logs\.user_id/);
    });

    it('should build SELECT with multiple JOINs', () => {
      const { text } = new QueryBuilder()
        .table('orders')
        .select(['orders.id', 'customers.name', 'products.title'])
        .innerJoin('customers', 'orders.customer_id', '=', 'customers.id')
        .leftJoin('products', 'orders.product_id', '=', 'products.id')
        .build();

      expect(text).toMatch(/JOIN\s+customers/);
      expect(text).toMatch(/LEFT JOIN\s+products/);
    });

    it('should build JOIN with schema-qualified table', () => {
      const { text } = new QueryBuilder()
        .table('orders')
        .select(['*'])
        .innerJoin('customers', 'orders.customer_id', '=', 'customers.id', { schema: 'public' })
        .build();

      expect(text).toMatch(/JOIN\s+public\.customers/);
    });

    it('should build JOIN with table alias', () => {
      const { text } = new QueryBuilder()
        .table('orders')
        .select(['o.id'])
        .innerJoin('customers', 'o.customer_id', '=', 'c.id', { alias: 'c' })
        .build();

      expect(text).toMatch(/JOIN\s+customers\s+(AS\s+)?c/);
    });
  });

  // =========================================================================
  // CTEs (WITH clauses)
  // =========================================================================
  describe('CTEs', () => {
    it('should build SELECT with a single CTE', () => {
      const cteQuery = new QueryBuilder()
        .table('users')
        .select(['id', 'name'])
        .where({ age: { greaterThan: 18 } });

      const { text, values } = new QueryBuilder()
        .with('active_users', cteQuery)
        .table('active_users')
        .select(['*'])
        .build();

      expect(text).toMatch(/WITH\s+active_users\s+AS\s*\(/);
      expect(text).toMatch(/FROM\s+active_users/);
      expect(values).toEqual([18]);
    });

    it('should build SELECT with multiple CTEs', () => {
      const cte1 = new QueryBuilder()
        .table('users')
        .select(['id', 'name'])
        .where({ active: { equalTo: true } });

      const cte2 = new QueryBuilder()
        .table('orders')
        .select(['user_id', 'total'])
        .where({ total: { greaterThan: 100 } });

      const { text, values } = new QueryBuilder()
        .with('active_users', cte1)
        .with('big_orders', cte2)
        .table('active_users')
        .select(['*'])
        .build();

      expect(text).toMatch(/WITH\s+active_users\s+AS\s*\(/);
      expect(text).toMatch(/big_orders\s+AS\s*\(/);
      expect(values).toEqual([true, 100]);
    });

    it('should build WITH RECURSIVE', () => {
      const recursiveQuery = new QueryBuilder()
        .table('categories')
        .select(['id', 'parent_id', 'name'])
        .where({ parent_id: { isNull: true } });

      const { text, values } = new QueryBuilder()
        .withRecursive('tree', recursiveQuery)
        .table('tree')
        .select(['*'])
        .build();

      expect(text).toMatch(/WITH\s+RECURSIVE\s+tree\s+AS\s*\(/);
      expect(values).toEqual([]);
    });
  });

  // =========================================================================
  // Function / Procedure calls
  // =========================================================================
  describe('Function Calls', () => {
    it('should build a function call without args', () => {
      const { text, values } = new QueryBuilder()
        .call('my_function')
        .build();

      expect(text).toMatch(/SELECT\s+my_function\(\)/);
      expect(values).toEqual([]);
    });

    it('should build a function call with positional args', () => {
      const { text, values } = new QueryBuilder()
        .call('my_procedure', [1, 'test', true])
        .build();

      expect(text).toMatch(/my_procedure\(\s*\$1,\s*\$2,\s*\$3\s*\)/);
      expect(values).toEqual([1, 'test', true]);
    });

    it('should build a function call with named args', () => {
      const { text, values } = new QueryBuilder()
        .call('my_procedure', { id: 42, status: 'active' })
        .build();

      expect(text).toMatch(/my_procedure\(/);
      // PG 14+ uses => for named args
      expect(text).toMatch(/id\s*=>\s*\$1/);
      expect(text).toMatch(/status\s*=>\s*\$2/);
      expect(values).toEqual([42, 'active']);
    });

    it('should build a schema-qualified function call', () => {
      const { text, values } = new QueryBuilder()
        .schema('my_schema')
        .call('my_function', [42])
        .build();

      expect(text).toMatch(/my_schema\.my_function\(\s*\$1\s*\)/);
      expect(values).toEqual([42]);
    });

    it('should build a function call with SELECT columns', () => {
      const { text, values } = new QueryBuilder()
        .select(['result', 'status'])
        .call('my_procedure', [42])
        .build();

      expect(text).toMatch(/SELECT/);
      expect(text).toMatch(/result/);
      expect(text).toMatch(/status/);
      expect(text).toMatch(/FROM\s+my_procedure\(\s*\$1\s*\)/);
      expect(values).toEqual([42]);
    });

    it('should build a schema-qualified function call with columns', () => {
      const { text, values } = new QueryBuilder()
        .schema('app')
        .select(['result', 'status'])
        .call('my_procedure', { id: 42, is_active: true })
        .build();

      expect(text).toMatch(/FROM\s+app\.my_procedure\(/);
      expect(values).toEqual([42, true]);
    });
  });

  // =========================================================================
  // Parameterized queries
  // =========================================================================
  describe('Parameterized Queries', () => {
    it('should auto-parameterize string values', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ name: { equalTo: 'Alice' } })
        .build();

      expect(text).toMatch(/\$1/);
      expect(text).not.toMatch(/'Alice'/);
      expect(values).toEqual(['Alice']);
    });

    it('should auto-parameterize numeric values', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ age: { greaterThan: 21 } })
        .build();

      expect(text).toMatch(/\$1/);
      expect(values).toEqual([21]);
    });

    it('should auto-parameterize boolean values', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ is_active: { equalTo: true } })
        .build();

      expect(text).toMatch(/\$1/);
      expect(values).toEqual([true]);
    });

    it('should assign correct parameter indices across operations', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert({ name: 'Alice', age: 25 })
        .returning(['id'])
        .build();

      expect(text).toMatch(/\$1/);
      expect(text).toMatch(/\$2/);
      expect(values).toEqual(['Alice', 25]);
    });

    it('should maintain parameter order in INSERT + ON CONFLICT', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert({ name: 'Alice', email: 'a@b.com' })
        .onConflict({
          columns: ['email'],
          action: 'update',
          updateColumns: { name: 'Alice Updated' },
        })
        .build();

      expect(values).toEqual(['Alice', 'a@b.com', 'Alice Updated']);
      expect(text).toMatch(/\$1/);
      expect(text).toMatch(/\$2/);
      expect(text).toMatch(/\$3/);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('Edge Cases', () => {
    it('should throw if no table is specified', () => {
      expect(() => new QueryBuilder().select(['id']).build()).toThrow(
        'Table name is not specified.'
      );
    });

    it('should handle empty WHERE conditions', () => {
      const { text } = new QueryBuilder()
        .table('users')
        .select(['*'])
        .build();

      expect(text).not.toMatch(/WHERE/);
    });

    it('should handle SELECT with WHERE and special characters in values', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ name: { equalTo: "O'Brien" } })
        .build();

      expect(values).toEqual(["O'Brien"]);
      expect(text).toMatch(/\$1/);
    });

    it('toSQL() returns just the text string', () => {
      const sql = new QueryBuilder()
        .table('users')
        .select(['id'])
        .toSQL();

      expect(typeof sql).toBe('string');
      expect(sql).toMatch(/SELECT/);
      expect(sql).toMatch(/FROM\s+users/);
    });

    it('should handle reserved words as identifiers', () => {
      const { text } = new QueryBuilder()
        .table('order')
        .select(['select', 'from'])
        .build();

      // Deparser quotes reserved words
      expect(text).toMatch(/"order"/);
      expect(text).toMatch(/"select"/);
    });

    it('should handle float values in INSERT', () => {
      const { text, values } = new QueryBuilder()
        .table('products')
        .insert({ price: 19.99, name: 'Widget' })
        .build();

      expect(values).toEqual([19.99, 'Widget']);
    });

    it('should handle DELETE without WHERE', () => {
      const { text, values } = new QueryBuilder()
        .table('temp_data')
        .delete()
        .build();

      expect(text).toMatch(/DELETE\s+FROM\s+temp_data/);
      expect(text).not.toMatch(/WHERE/);
      expect(values).toEqual([]);
    });
  });

  // =========================================================================
  // HAVING
  // =========================================================================
  describe('HAVING', () => {
    it('should build SELECT with GROUP BY and HAVING', () => {
      const { text, values } = new QueryBuilder()
        .table('orders')
        .select(['customer_id'])
        .groupBy(['customer_id'])
        .having({ total: { greaterThan: 1000 } })
        .build();

      expect(text).toMatch(/GROUP BY\s+customer_id/);
      expect(text).toMatch(/HAVING\s+total\s*>\s*\$1/);
      expect(values).toEqual([1000]);
    });
  });

  // =========================================================================
  // Complex queries combining multiple features
  // =========================================================================
  describe('Complex Queries', () => {
    it('should build a full SELECT with all clauses', () => {
      const { text, values } = new QueryBuilder()
        .schema('app')
        .table('orders', 'o')
        .select(['o.customer_id', 'o.total'])
        .innerJoin('customers', 'o.customer_id', '=', 'customers.id')
        .where({ 'o.status': { equalTo: 'completed' } })
        .groupBy(['o.customer_id'])
        .having({ 'o.total': { greaterThan: 500 } })
        .orderBy('o.total', 'DESC')
        .limit(25)
        .offset(0)
        .build();

      expect(text).toMatch(/FROM\s+app\.orders/);
      expect(text).toMatch(/JOIN\s+customers/);
      expect(text).toMatch(/WHERE/);
      expect(text).toMatch(/GROUP BY/);
      expect(text).toMatch(/HAVING/);
      expect(text).toMatch(/ORDER BY/);
      expect(text).toMatch(/LIMIT/);
      expect(values).toEqual(['completed', 500]);
    });

    it('should build INSERT with CTE', () => {
      const cte = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ active: { equalTo: true } });

      const { text, values } = new QueryBuilder()
        .with('active_ids', cte)
        .table('notifications')
        .insert({ message: 'Hello', user_id: 1 })
        .build();

      expect(text).toMatch(/WITH\s+active_ids\s+AS/);
      expect(text).toMatch(/INSERT\s+INTO\s+notifications/);
      expect(values).toEqual([true, 'Hello', 1]);
    });

    it('should build UPDATE with RETURNING *', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .update({ status: 'inactive' })
        .where({ last_login: { lessThan: '2024-01-01' } })
        .returning()
        .build();

      expect(text).toMatch(/UPDATE\s+users\s+SET\s+status\s*=\s*\$1/);
      expect(text).toMatch(/last_login\s*<\s*\$2/);
      expect(text).toMatch(/RETURNING\s+\*/);
      expect(values).toEqual(['inactive', '2024-01-01']);
    });
  });

  // =========================================================================
  // Expression system (col / lit / param / fn) + computed SELECT columns
  // =========================================================================
  describe('Expressions', () => {
    it('should pass a column reference as a function arg (not a param)', () => {
      const { text, values } = new QueryBuilder()
        .schema('priv')
        .call('secrets_get', { secret_name: col('s.name'), namespace_id: col('s.namespace_id') })
        .build();

      expect(text).toMatch(/priv\.secrets_get\(/);
      expect(text).toMatch(/secret_name\s*=>\s*s\.name/);
      expect(text).toMatch(/namespace_id\s*=>\s*s\.namespace_id/);
      // Column refs are not parameterized.
      expect(values).toEqual([]);
    });

    it('should emit a literal NULL via lit(null) (not a bound param)', () => {
      const { text, values } = new QueryBuilder()
        .call('f', { d: lit(null) })
        .build();

      expect(text).toMatch(/d\s*=>\s*NULL/i);
      expect(values).toEqual([]);
    });

    it('should bind an explicit param() and auto-bind a plain value', () => {
      const { text, values } = new QueryBuilder()
        .call('f', { a: param('x'), b: 'y' })
        .build();

      expect(text).toMatch(/a\s*=>\s*\$1/);
      expect(text).toMatch(/b\s*=>\s*\$2/);
      expect(values).toEqual(['x', 'y']);
    });

    it('should mix column-ref, param, and literal args in one named call', () => {
      const { text, values } = new QueryBuilder()
        .call('f', {
          owner_id: col('s.owner_id'),
          secret_name: col('s.name'),
          ns: param('11111111-1111-1111-1111-111111111111'),
          d: lit(null),
        })
        .build();

      expect(text).toMatch(/owner_id\s*=>\s*s\.owner_id/);
      expect(text).toMatch(/secret_name\s*=>\s*s\.name/);
      expect(text).toMatch(/ns\s*=>\s*\$1/);
      expect(text).toMatch(/d\s*=>\s*NULL/i);
      expect(values).toEqual(['11111111-1111-1111-1111-111111111111']);
    });

    it('should support fn() with schema-qualified name', () => {
      const { text } = new QueryBuilder()
        .selectExpr('v', fn('priv.secrets_get', { secret_name: col('s.name') }))
        .table('secrets', 's')
        .schema('priv')
        .build();

      expect(text).toMatch(/priv\.secrets_get\(\s*secret_name\s*=>\s*s\.name\s*\)\s+AS\s+v/);
    });

    it('should build a computed function-call column over a base table (scope-switch shape)', () => {
      // Mirrors decryptScopeSecrets for an entity scope.
      const nsId = '22222222-2222-2222-2222-222222222222';
      const { text, values } = new QueryBuilder()
        .schema('priv')
        .table('secrets', 's')
        .select(['s.name'])
        .selectCall('decrypted_value', 'secrets_get', {
          owner_id: col('s.owner_id'),
          secret_name: col('s.name'),
          namespace_id: col('s.namespace_id'),
          default_value: lit(null),
        }, { schema: 'priv' })
        .where({ 's.namespace_id': { equalTo: nsId } })
        .where({ 's.owner_id': { equalTo: 'owner-1' } })
        .where({ 's.retired_at': { isNull: true } })
        .orderBy('s.created_at', 'ASC')
        .build();

      expect(text).toMatch(/SELECT/);
      expect(text).toMatch(/s\.name/);
      expect(text).toMatch(/priv\.secrets_get\(/);
      expect(text).toMatch(/owner_id\s*=>\s*s\.owner_id/);
      expect(text).toMatch(/default_value\s*=>\s*NULL/i);
      expect(text).toMatch(/AS\s+decrypted_value/);
      expect(text).toMatch(/FROM\s+priv\.secrets\s+(AS\s+)?s/);
      expect(text).toMatch(/s\.namespace_id\s*=\s*\$1/);
      expect(text).toMatch(/s\.owner_id\s*=\s*\$2/);
      expect(text).toMatch(/s\.retired_at\s+IS\s+NULL/);
      expect(text).toMatch(/ORDER\s+BY\s+s\.created_at/);
      // Column-ref getter args bind nothing; only WHERE values are params.
      expect(values).toEqual([nsId, 'owner-1']);
    });

    it('should keep param numbering correct when a computed column also binds a param', () => {
      const { text, values } = new QueryBuilder()
        .table('t', 's')
        .select(['s.id'])
        .selectExpr('v', fn('f', { a: param('A'), b: col('s.b') }))
        .where({ 's.active': { equalTo: true } })
        .build();

      // Target-list param comes before WHERE param.
      expect(text).toMatch(/a\s*=>\s*\$1/);
      expect(text).toMatch(/s\.active\s*=\s*\$2/);
      expect(values).toEqual(['A', true]);
    });
  });

  // =========================================================================
  // JSON filters (SDK style)
  // =========================================================================
  describe('JSON Filters', () => {
    it('should combine multiple operators on one field', () => {
      const { text, values } = new QueryBuilder()
        .table('jobs')
        .select(['id'])
        .where({ attempts: { greaterThanOrEqualTo: 1, lessThan: 5 } })
        .build();

      expect(text).toMatch(/attempts\s*>=\s*\$1/);
      expect(text).toMatch(/attempts\s*<\s*\$2/);
      expect(text).toMatch(/AND/);
      expect(values).toEqual([1, 5]);
    });

    it('should build notEqualTo and notIn', () => {
      const { text, values } = new QueryBuilder()
        .table('jobs')
        .select(['id'])
        .where({ status: { notEqualTo: 'failed' } })
        .where({ kind: { notIn: ['a', 'b'] } })
        .build();

      expect(text).toMatch(/status\s*<>\s*\$1/);
      expect(text).toMatch(/kind\s+NOT\s+IN\s*\(\s*\$2,\s*\$3\s*\)/);
      expect(values).toEqual(['failed', 'a', 'b']);
    });

    it('should build or/and/not combinators', () => {
      const { text, values } = new QueryBuilder()
        .table('jobs')
        .select(['id'])
        .where({
          or: [
            { priority: { greaterThan: 0 } },
            { escalated: { equalTo: true } },
          ],
          not: { status: { equalTo: 'done' } },
          and: [{ attempts: { lessThan: 3 } }],
        })
        .build();

      expect(text).toMatch(/priority\s*>\s*\$1\s+OR\s+escalated\s*=\s*\$2/);
      expect(text).toMatch(/NOT\s*\(?\s*status\s*=\s*\$3/);
      expect(text).toMatch(/attempts\s*<\s*\$4/);
      expect(values).toEqual([0, true, 'done', 3]);
    });

    it('should build nested or inside and', () => {
      const { text, values } = new QueryBuilder()
        .table('t')
        .select(['id'])
        .where({
          a: { equalTo: 1 },
          or: [{ b: { isNull: true } }, { b: { equalTo: 2 } }],
        })
        .build();

      expect(text).toMatch(/a\s*=\s*\$1/);
      expect(text).toMatch(/b\s+IS\s+NULL\s+OR\s+b\s*=\s*\$2/);
      expect(values).toEqual([1, 2]);
    });

    it('should build LIKE / ILIKE operators', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ name: { like: 'Al%' } })
        .where({ email: { likeInsensitive: '%@example.com' } })
        .build();

      expect(text).toMatch(/name\s+LIKE\s+\$1/);
      expect(text).toMatch(/email\s+ILIKE\s+\$2/);
      expect(values).toEqual(['Al%', '%@example.com']);
    });

    it('should build includes / startsWith / endsWith pattern sugar', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ name: { includes: 'li' } })
        .where({ email: { startsWithInsensitive: 'alice' } })
        .where({ host: { endsWith: '.io' } })
        .build();

      expect(text).toMatch(/name\s+LIKE\s+\$1/);
      expect(text).toMatch(/email\s+ILIKE\s+\$2/);
      expect(text).toMatch(/host\s+LIKE\s+\$3/);
      expect(values).toEqual(['%li%', 'alice%', '%.io']);
    });

    it('should build IS DISTINCT FROM / IS NOT DISTINCT FROM', () => {
      const { text, values } = new QueryBuilder()
        .table('t')
        .select(['id'])
        .where({ a: { distinctFrom: 1 } })
        .where({ b: { notDistinctFrom: 2 } })
        .build();

      expect(text).toMatch(/a\s+IS\s+DISTINCT\s+FROM\s+\$1/);
      expect(text).toMatch(/b\s+IS\s+NOT\s+DISTINCT\s+FROM\s+\$2/);
      expect(values).toEqual([1, 2]);
    });

    it('should accept Expr operands (column-to-column and function comparisons)', () => {
      const { text, values } = new QueryBuilder()
        .table('jobs')
        .select(['id'])
        .where({ updated_at: { lessThan: fn('now') } })
        .where({ a: { equalTo: col('b') } })
        .build();

      expect(text).toMatch(/updated_at\s*<\s*now\(\)/);
      expect(text).toMatch(/a\s*=\s*b/);
      expect(values).toEqual([]);
    });

    it('should support a subquery as a comparison operand', () => {
      const sub = new QueryBuilder()
        .table('teams')
        .select(['id'])
        .where({ name: { equalTo: 'core' } });

      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ team_id: { equalTo: sub } })
        .build();

      expect(text).toMatch(/team_id\s*=\s*\(+\s*SELECT/s);
      expect(text).toMatch(/name\s*=\s*\$1/);
      expect(values).toEqual(['core']);
    });

    it('should support a subquery for in / notIn', () => {
      const sub = new QueryBuilder()
        .table('teams')
        .select(['id'])
        .where({ active: { equalTo: true } });

      const { text, values } = new QueryBuilder()
        .table('users')
        .select(['id'])
        .where({ team_id: { in: sub } })
        .build();

      expect(text).toMatch(/team_id\s+IN\s*\(\s*SELECT/s);
      expect(values).toEqual([true]);
    });

    it('should apply filters to HAVING', () => {
      const { text, values } = new QueryBuilder()
        .table('orders')
        .select(['customer_id'])
        .groupBy(['customer_id'])
        .having({ total: { greaterThan: 1000 } })
        .build();

      expect(text).toMatch(/HAVING\s+total\s*>\s*\$1/);
      expect(values).toEqual([1000]);
    });

    it('should apply a filter to ON CONFLICT DO UPDATE WHERE', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert({ name: 'Alice', email: 'a@b.com' })
        .onConflict({
          columns: ['email'],
          action: 'update',
          updateColumns: { name: 'Alice Updated' },
          where: { locked: { equalTo: false } },
        })
        .build();

      expect(text).toMatch(/DO UPDATE/);
      expect(text).toMatch(/locked\s*=\s*\$4/);
      expect(values).toEqual(['Alice', 'a@b.com', 'Alice Updated', false]);
    });

    it('should throw on an empty filter object', () => {
      expect(() =>
        new QueryBuilder().table('t').select(['id']).where({}).build()
      ).toThrow('Empty filter object.');
    });

    it('should throw on an empty in array', () => {
      expect(() =>
        new QueryBuilder()
          .table('t')
          .select(['id'])
          .where({ id: { in: [] } })
          .build()
      ).toThrow('Empty array for "in" filter on "id".');
    });

    it('should throw on an unsupported operator', () => {
      expect(() =>
        new QueryBuilder()
          .table('t')
          .select(['id'])
          .where({ id: { bogus: 1 } as any })
          .build()
      ).toThrow('Unsupported filter operator "bogus" on "id".');
    });
  });

  // =========================================================================
  // Expression predicates and helpers
  // =========================================================================
  describe('Expression Predicates', () => {
    it('should build where() expression with eq / isNull / and', () => {
      const { text, values } = new QueryBuilder()
        .table('jobs')
        .select(['id'])
        .where(and(eq(col('a'), col('b')), isNull(col('completed_at'))))
        .build();

      expect(text).toMatch(/a\s*=\s*b/);
      expect(text).toMatch(/completed_at\s+IS\s+NULL/);
      expect(values).toEqual([]);
    });

    it('should build where() expression with or / not / isNotNull and bound values', () => {
      const { text, values } = new QueryBuilder()
        .table('jobs')
        .select(['id'])
        .where(or(gt(col('priority'), 5), not(isNotNull(col('locked_at')))))
        .build();

      expect(text).toMatch(/priority\s*>\s*\$1/);
      expect(text).toMatch(/NOT\s*\(?\s*locked_at\s+IS\s+NOT\s+NULL/);
      expect(values).toEqual([5]);
    });

    it('should mix where filters and expression predicates', () => {
      const { text, values } = new QueryBuilder()
        .table('jobs')
        .select(['id'])
        .where({ status: { equalTo: 'queued' } })
        .where(lte(col('attempts'), col('max_attempts')))
        .build();

      expect(text).toMatch(/status\s*=\s*\$1/);
      expect(text).toMatch(/attempts\s*<=\s*max_attempts/);
      expect(values).toEqual(['queued']);
    });

    it('should build having() expression', () => {
      const { text, values } = new QueryBuilder()
        .table('orders')
        .select(['customer_id'])
        .groupBy(['customer_id'])
        .having(gt(fn('sum', [col('total')]), 1000))
        .build();

      expect(text).toMatch(/HAVING\s+sum\(\s*total\s*\)\s*>\s*\$1/);
      expect(values).toEqual([1000]);
    });
  });

  // =========================================================================
  // Expressions in UPDATE / ON CONFLICT / RETURNING
  // =========================================================================
  describe('UPDATE Expressions', () => {
    it('should build SET with arithmetic and function expressions', () => {
      const { text, values } = new QueryBuilder()
        .table('jobs')
        .update({
          attempts: add(col('attempts'), 1),
          updated_at: fn('now'),
          status: 'running',
        })
        .where({ completed_at: { isNull: true } })
        .returning(['id'])
        .build();

      expect(text).toMatch(/attempts\s*=\s*attempts\s*\+\s*\$1/);
      expect(text).toMatch(/updated_at\s*=\s*now\(\)/);
      expect(text).toMatch(/status\s*=\s*\$2/);
      expect(text).toMatch(/completed_at\s+IS\s+NULL/);
      expect(text).toMatch(/RETURNING/);
      expect(values).toEqual([1, 'running']);
    });

    it('should build ON CONFLICT DO UPDATE with excluded expressions', () => {
      const { text, values } = new QueryBuilder()
        .table('counters')
        .insert({ key: 'k', count: 1 })
        .onConflict({
          columns: ['key'],
          action: 'update',
          updateColumns: { count: add(col('counters.count'), col('excluded.count')) },
        })
        .build();

      expect(text).toMatch(/DO UPDATE/);
      expect(text).toMatch(/count\s*=\s*counters\.count\s*\+\s*excluded\.count/);
      expect(values).toEqual(['k', 1]);
    });

    it('should build RETURNING with expressions and aliases', () => {
      const { text, values } = new QueryBuilder()
        .table('users')
        .insert({ name: 'Alice' })
        .returning(['id', { expr: fn('lower', [col('name')]), as: 'name_lower' }])
        .build();

      expect(text).toMatch(/RETURNING/);
      expect(text).toMatch(/lower\(\s*name\s*\)\s+AS\s+name_lower/);
      expect(values).toEqual(['Alice']);
    });
  });

  // =========================================================================
  // Function call aliases
  // =========================================================================
  describe('Function Call Aliases', () => {
    it('should alias a scalar function call result', () => {
      const { text, values } = new QueryBuilder()
        .call('rollup_compute_daily', { day: '2026-01-01' }, { schema: 'private', as: 'result' })
        .build();

      expect(text).toMatch(/private\.rollup_compute_daily\(/);
      expect(text).toMatch(/AS\s+result/);
      expect(values).toEqual(['2026-01-01']);
    });
  });
});
