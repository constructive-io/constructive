# pgsql-client

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
  <a href="https://www.npmjs.com/package/pgsql-client">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=postgres%2Fpgsql-client%2Fpackage.json"/>
  </a>
</p>

PostgreSQL client utilities with query helpers, RLS context management, and database administration.

## Overview

`pgsql-client` provides a set of utilities for working with PostgreSQL databases:

- **DbAdmin**: Database administration operations (create, drop, templates, extensions, grants)
- **PgClient**: Query helpers with RLS context management
- **Role utilities**: Role name mapping for anonymous, authenticated, and administrator roles
- **Context utilities**: Generate SQL for setting PostgreSQL session context variables
- **Stream utilities**: Stream SQL to psql process

## Installation

```bash
npm install pgsql-client
```

## Usage

### DbAdmin

```typescript
import { DbAdmin } from 'pgsql-client';

const admin = new DbAdmin({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'mydb'
});

// Create a database
admin.create('mydb');

// Install extensions
admin.installExtensions(['uuid-ossp', 'pgcrypto'], 'mydb');

// Drop a database
admin.drop('mydb');
```

### PgClient

```typescript
import { PgClient } from 'pgsql-client';

const client = new PgClient({
  host: 'localhost',
  port: 5432,
  user: 'app_user',
  password: 'password',
  database: 'mydb'
});

// Query helpers
const users = await client.any('SELECT * FROM users');
const user = await client.one('SELECT * FROM users WHERE id = $1', [userId]);
const maybeUser = await client.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);

// Set RLS context
client.setContext({ role: 'authenticated', 'jwt.claims.user_id': userId });

// Or use the auth helper
client.auth({ role: 'authenticated', userId: userId });

// Close the connection
await client.close();
```

## API

### DbAdmin

- `create(dbName?)` - Create a database
- `drop(dbName?)` - Drop a database
- `createFromTemplate(template, dbName?)` - Create database from template
- `installExtensions(extensions, dbName?)` - Install PostgreSQL extensions
- `connectionString(dbName?)` - Generate connection string
- `createTemplateFromBase(base, template)` - Create template database
- `cleanupTemplate(template)` - Clean up template database
- `grantRole(role, user, dbName?)` - Grant role to user
- `grantConnect(role, dbName?)` - Grant connect privilege
- `createUserRole(user, password, dbName)` - Create user with roles
- `loadSql(file, dbName)` - Load SQL file
- `streamSql(sql, dbName)` - Stream SQL to database

### PgClient

- `query(sql, values?)` - Execute query with context
- `any(sql, values?)` - Return all rows
- `one(sql, values?)` - Return exactly one row (throws if not exactly one)
- `oneOrNone(sql, values?)` - Return one row or null
- `many(sql, values?)` - Return many rows (throws if none)
- `manyOrNone(sql, values?)` - Return rows or empty array
- `none(sql, values?)` - Execute without returning rows
- `result(sql, values?)` - Return full QueryResult
- `begin()` - Begin transaction
- `commit()` - Commit transaction
- `savepoint(name?)` - Create savepoint
- `rollback(name?)` - Rollback to savepoint
- `setContext(ctx)` - Set session context variables
- `auth(options?)` - Set authentication context
- `clearContext()` - Clear context and reset to anonymous
- `close()` - Close connection

### Ephemeral Databases

Create temporary databases for testing, code generation, or other ephemeral use cases:

```typescript
import { createEphemeralDb } from 'pgsql-client';

// Create a temporary database with a unique UUID-based name
const { name, config, admin, teardown } = createEphemeralDb();

// Use the database
const pool = new Pool(config);
await pool.query('SELECT 1');
await pool.end();

// Clean up when done
teardown();

// Or keep for debugging
teardown({ keepDb: true });
```

#### Options

```typescript
const { config, teardown } = createEphemeralDb({
  prefix: 'test_',           // Database name prefix (default: 'ephemeral_')
  extensions: ['uuid-ossp'], // PostgreSQL extensions to install
  baseConfig: {              // Override connection settings
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password'
  },
  verbose: true              // Enable logging
});
```

#### Return Value

- `name` - The generated database name (e.g., `ephemeral_a1b2c3d4_...`)
- `config` - Full PostgreSQL configuration for connecting
- `admin` - DbAdmin instance for additional operations
- `teardown(opts?)` - Function to drop the database (pass `{ keepDb: true }` to preserve)

#### Use Cases

Ephemeral databases are useful for:
- **Code generation**: Generate types from a temporary schema
- **Integration tests**: Isolated database per test suite
- **CI pipelines**: Clean database state for each run
- **Local development**: Experiment without affecting shared databases

## License

MIT
