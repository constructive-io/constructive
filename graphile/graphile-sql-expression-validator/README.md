# graphile-sql-expression-validator

A Graphile plugin for SQL expression validation and AST normalization. This plugin validates SQL expressions at the GraphQL layer before they reach the database, preventing SQL injection and ensuring only safe expressions are executed.

## Installation

```sh
npm install graphile-sql-expression-validator
```

## Usage

### Smart Comment

Tag columns that contain SQL expressions with `@sqlExpression`:

```sql
COMMENT ON COLUMN collections_public.field.default_value IS E'@sqlExpression';
```

The plugin will automatically look for a companion `*_ast` column (e.g., `default_value_ast`) to store the parsed AST.

### Plugin Configuration

```typescript
import SqlExpressionValidatorPlugin from 'graphile-sql-expression-validator';

const postgraphileOptions = {
  appendPlugins: [SqlExpressionValidatorPlugin],
  graphileBuildOptions: {
    sqlExpressionValidator: {
      // Optional: Additional allowed functions beyond defaults
      allowedFunctions: ['my_custom_function'],
      // Optional: Allowed schema names for schema-qualified functions
      allowedSchemas: ['my_schema'],
      // Optional: Maximum expression length (default: 10000)
      maxExpressionLength: 5000,
    },
  },
};
```

## How It Works

1. **On mutation input**, the plugin detects fields tagged with `@sqlExpression`
2. **If text is provided**: Parses the SQL expression, validates the AST, and stores both the canonical text and AST
3. **If AST is provided**: Validates the AST and deparses to canonical text
4. **Validation includes**:
   - Node type allowlist (constants, casts, operators, function calls)
   - Function name allowlist for unqualified functions
   - Schema allowlist for schema-qualified functions
   - Rejection of dangerous constructs (subqueries, DDL, DML, column references)

## Default Allowed Functions

- `uuid_generate_v4`
- `gen_random_uuid`
- `now`
- `current_timestamp`
- `current_date`
- `current_time`
- `localtime`
- `localtimestamp`
- `clock_timestamp`
- `statement_timestamp`
- `transaction_timestamp`
- `timeofday`
- `random`
- `setseed`

## API

### `parseAndValidateSqlExpression(expression, options)`

Parse and validate a SQL expression string.

```typescript
import { parseAndValidateSqlExpression } from 'graphile-sql-expression-validator';

const result = parseAndValidateSqlExpression('uuid_generate_v4()');
// { valid: true, ast: {...}, canonicalText: 'uuid_generate_v4()' }

const invalid = parseAndValidateSqlExpression('SELECT * FROM users');
// { valid: false, error: 'Forbidden node type "SelectStmt"...' }
```

### `validateAst(ast, options)`

Validate an existing AST and get canonical text.

```typescript
import { validateAst } from 'graphile-sql-expression-validator';

const result = validateAst(myAst);
// { valid: true, canonicalText: 'uuid_generate_v4()' }
```

## Security Notes

- This plugin provides defense-in-depth at the GraphQL layer
- It does not replace database-level security measures
- Superuser/admin paths that bypass GraphQL are not protected
- Always use RLS and proper database permissions as the primary security layer
