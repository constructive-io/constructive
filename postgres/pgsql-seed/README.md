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

PostgreSQL seeding utilities with pgpm integration - batteries included.

This package re-exports everything from [`pg-seed`](../pg-seed) and adds pgpm deployment functionality.

## Installation

```bash
npm install pgsql-seed
# or
pnpm add pgsql-seed
```

## Usage

### All pg-seed utilities are available

```typescript
import { 
  loadCsv, loadCsvMap, exportCsv,  // CSV utilities
  insertJson, insertJsonMap,        // JSON utilities
  loadSql, loadSqlFiles, execSql    // SQL utilities
} from 'pgsql-seed';
```

See the [pg-seed documentation](../pg-seed/README.md) for details on these utilities.

### pgpm Integration

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

## When to use pg-seed vs pgsql-seed

- Use **`pg-seed`** if you only need CSV/JSON/SQL seeding and want a lightweight package with no pgpm dependency
- Use **`pgsql-seed`** if you need pgpm deployment functionality or want a single package with all seeding utilities
