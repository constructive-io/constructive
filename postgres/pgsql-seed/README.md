# pgsql-seed

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
  <a href="https://www.npmjs.com/package/pgsql-seed">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=postgres%2Fpgsql-seed%2Fpackage.json"/>
  </a>
</p>

PostgreSQL seeding utilities for CSV, JSON, SQL data loading, and pgpm deployment.

## Installation

```bash
npm install pgsql-seed
```

## Usage

### CSV Loading (COPY protocol)

```typescript
import { Client } from 'pg';
import { loadCsv, loadCsvMap, exportCsv } from 'pgsql-seed';

const client = new Client();
await client.connect();

// Load a single CSV file
await loadCsv(client, 'users', './data/users.csv');

// Load multiple CSV files
await loadCsvMap(client, {
  'users': './data/users.csv',
  'orders': './data/orders.csv'
});

// Export a table to CSV
await exportCsv(client, 'users', './backup/users.csv');
```

### JSON Insertion

```typescript
import { Client } from 'pg';
import { insertJson, insertJsonMap } from 'pgsql-seed';

const client = new Client();
await client.connect();

// Insert rows into a single table
await insertJson(client, 'users', [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' }
]);

// Insert rows into multiple tables
await insertJsonMap(client, {
  'users': [{ name: 'Alice', email: 'alice@example.com' }],
  'orders': [{ user_id: 1, total: 99.99 }]
});
```

### SQL File Execution

```typescript
import { Client } from 'pg';
import { loadSql, loadSqlFiles, execSql } from 'pgsql-seed';

const client = new Client();
await client.connect();

// Execute a single SQL file
await loadSql(client, './migrations/001-schema.sql');

// Execute multiple SQL files
await loadSqlFiles(client, [
  './migrations/001-schema.sql',
  './migrations/002-data.sql'
]);

// Execute a SQL string with parameters
await execSql(client, 'INSERT INTO users (name) VALUES ($1)', ['Alice']);
```

### pgpm Deployment

Deploy pgpm packages directly from your code:

```typescript
import { deployPgpm, loadPgpm } from 'pgsql-seed';

const config = {
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'password'
};

// Deploy the pgpm package in the current directory
await deployPgpm(config);

// Deploy from a specific directory
await deployPgpm(config, '/path/to/package');

// With caching enabled
await deployPgpm(config, undefined, true);
```

## Client Compatibility

All functions accept either a raw `pg.Client`/`pg.PoolClient` or any wrapper object that exposes a `.client` property containing the underlying pg client. This makes it compatible with testing utilities like `PgTestClient`.

```typescript
// Works with raw pg.Client
const client = new Client();
await loadCsv(client, 'users', './data/users.csv');

// Works with wrappers that have a .client property
const testClient = new PgTestClient(config);
await loadCsv(testClient, 'users', './data/users.csv');
```
