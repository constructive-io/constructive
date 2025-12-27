# pgsql-seed

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

## License

MIT
