# Heterogeneous Migration Support for pgpm

This document proposes adding support for CSV, JSON, and other data seeding operations within pgpm migrations.

## Background

Currently, pgpm migrations execute SQL via `EXECUTE p_deploy_sql` inside a stored procedure. This server-side execution model has a critical limitation: PostgreSQL's `COPY FROM STDIN` protocol requires client-side streaming and cannot be invoked through `EXECUTE`.

With the new `pg-seed` package, we have efficient CSV loading via `pg-copy-streams`. This proposal describes how to integrate these capabilities into pgpm's migration flow.

## Key Constraint: Immutability

pgpm enforces migration immutability: if a change name is already deployed and the `script_hash` differs, deployment fails with an error. This is intentional - migrations should be immutable once deployed.

**This has implications for seed data:** If we include seed file hashes in the `script_hash`, changing a CSV after deployment will require creating a new change name. This matches pgpm's existing semantics but may surprise users who expect to "update the CSV and re-run."

## Proposed Architecture

### Sidecar Manifest Files

Each change can have an optional manifest file alongside its SQL script:

```
deploy/
  create-users.sql           # DDL/DML SQL
  create-users.seed.json     # Optional seed manifest
  seeds/
    users.csv                # Seed data files
    roles.csv
```

The manifest describes post-SQL actions to execute:

```json
{
  "seeds": [
    {
      "type": "csv",
      "table": "public.users",
      "file": "./seeds/users.csv",
      "options": {
        "header": true,
        "delimiter": ","
      }
    },
    {
      "type": "json",
      "table": "public.roles",
      "data": [
        { "name": "admin", "level": 100 },
        { "name": "user", "level": 10 }
      ]
    }
  ]
}
```

### Why Sidecar Manifests (Not Comment Directives)

The user's original idea was comment directives like `-- seed: my-csv.csv`. However:

1. Comments can be lost during `cleanSql` parse/deparse (when `TransactionStmt` or `CreateExtensionStmt` are present)
2. Manifests are explicit, auditable, and support richer configuration
3. Manifests can be validated with JSON Schema

**Optional sugar:** We could parse `-- seed: file.csv -> table` from raw SQL bytes *before* `cleanSql`, but the manifest should be authoritative.

### Two-Phase Deployment

Within a single transaction:

1. **Phase 1 (SQL):** Execute the deploy SQL via `CALL pgpm_migrate.deploy(...)`
2. **Phase 2 (Seeds):** Stream CSV/JSON data via `pg-copy-streams` on the same `PoolClient`

Both phases share the same transaction, so rollback is atomic.

```typescript
await withTransaction(targetPool, { useTransaction }, async (context) => {
  // Phase 1: SQL deployment
  await executeQuery(context, 'CALL pgpm_migrate.deploy($1, $2, $3, $4, $5, $6)', [...]);
  
  // Phase 2: Seed data (if manifest exists)
  if (seedManifest) {
    for (const seed of seedManifest.seeds) {
      if (seed.type === 'csv') {
        await loadCsv(context.client, seed.table, seed.file, seed.options);
      } else if (seed.type === 'json') {
        await insertJson(context.client, seed.table, seed.data);
      }
    }
  }
});
```

### Compound Hashing

The `script_hash` should incorporate both SQL and seed files:

```typescript
const sqlHash = await hashSqlFile(deployScriptPath);
const seedHashes = await Promise.all(
  seedManifest.seeds
    .filter(s => s.file)
    .map(s => hashFile(resolve(changeDir, s.file)))
);
const compoundHash = hashString(sqlHash + seedHashes.join(''));
```

**Important:** This means seed file changes are treated the same as SQL changes - they require a new change name if the change is already deployed.

## Design Decisions Required

### Decision 1: Immutable vs Repeatable Seeds

**Option A: Immutable (Recommended)**
- Seed hashes are part of `script_hash`
- Changing seed data after deployment requires a new change name
- Consistent with pgpm's existing immutability model
- Simple implementation

**Option B: Repeatable Seeds**
- Separate `pgpm_migrate.seed_artifacts` table to track seed hashes
- Seeds can be re-run when files change
- Requires `mode: once | repeatable` in manifest
- Repeatable seeds need idempotency strategy: `truncate-insert | upsert | append`
- More complex, but more flexible

### Decision 2: Transaction Requirement

Seeds require a real `PoolClient` for COPY streaming. Options:

**Option A: Require `useTransaction=true` for seeds**
- Simplest, guarantees atomicity
- Error if manifest exists but `useTransaction=false`

**Option B: Allow non-transactional seeds**
- Acquire separate `PoolClient` for seed phase
- Seeds are not atomic with SQL deployment
- Risk of partial state on failure

### Decision 3: Revert Behavior

What happens when reverting a change that had seeds?

**Option A: No seed revert (Recommended)**
- Revert only executes `revert/*.sql`
- User must handle data cleanup in revert SQL if needed
- Simple, predictable

**Option B: Optional seed revert actions**
- Manifest can specify `revert` actions
- Complex, often impractical (can't "un-insert" data easily)

## Implementation Plan

### Phase 1: Core Infrastructure

1. Add `pg-seed` as dependency to `@pgpmjs/core` (not `pgsql-seed` to avoid circular dependency)
2. Create manifest parser with JSON Schema validation
3. Implement compound hashing for SQL + seed files
4. Add seed execution to `PgpmMigrate.deploy()`

### Phase 2: CLI Integration

1. Add `--dry-run` flag to show what seeds would be executed
2. Add seed file validation during `pgpm verify`
3. Update `pgpm add` to optionally create seed manifest template

### Phase 3: Documentation & Testing

1. Document manifest format and options
2. Add integration tests with CSV/JSON seeding
3. Document migration patterns for seed data

## Manifest Schema (v1)

```typescript
interface SeedManifest {
  version: 1;
  seeds: SeedAction[];
}

interface CsvSeedAction {
  type: 'csv';
  table: string;           // Schema-qualified table name
  file: string;            // Relative path from change directory
  options?: {
    header?: boolean;      // Default: true
    delimiter?: string;    // Default: ','
    null?: string;         // Default: ''
    columns?: string[];    // Subset of columns to load
  };
}

interface JsonSeedAction {
  type: 'json';
  table: string;
  file?: string;           // Path to JSON file
  data?: object[];         // Inline data (alternative to file)
}

type SeedAction = CsvSeedAction | JsonSeedAction;
```

## Security Considerations

1. **Path traversal:** Resolve seed file paths relative to `modulePath`, reject `..` traversal
2. **Absolute paths:** Disallow or require explicit opt-in
3. **File size limits:** Consider limits for large seed files in CI/production

## Open Questions

1. Should we support YAML manifests in addition to JSON?
2. Should large seed files live in the pgpm package or be fetched externally?
3. Do we need a `pgpm seed` command for running seeds independently of migrations?

## Appendix: Why Not Server-Side COPY?

PostgreSQL's `COPY FROM '/path/to/file.csv'` requires the file to exist on the PostgreSQL server's filesystem. This is:

1. Not portable across environments
2. Requires file system access on the database server
3. Doesn't work with managed PostgreSQL services (RDS, Cloud SQL, etc.)

Client-side `COPY FROM STDIN` via `pg-copy-streams` solves all these issues.
