# pg-seed

PostgreSQL seeding utilities for CSV, JSON, and SQL data loading.

## Installation

```bash
npm install pg-seed
# or
pnpm add pg-seed
```

## Usage

### CSV Loading (COPY protocol)

```typescript
import { Client } from 'pg';
import { loadCsv, loadCsvMap, exportCsv } from 'pg-seed';

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
import { insertJson, insertJsonMap } from 'pg-seed';

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
import { loadSql, loadSqlFiles, execSql } from 'pg-seed';

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

## License

MIT
