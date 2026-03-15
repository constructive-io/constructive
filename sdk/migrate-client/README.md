# @pgpmjs/migrate-client

Typed GraphQL ORM client for the Constructive Migrate API (`db_migrate` schema).

Generated from `migrate.graphql` via `@constructive-io/graphql-codegen`.

## Usage

```typescript
import { createClient } from '@pgpmjs/migrate-client';

const db = createClient({
  endpoint: 'https://migrate.example.com/graphql',
  headers: { Authorization: 'Bearer <token>' },
});

// Fetch all sql_actions for a database
const result = await db.sqlAction.findMany({
  select: { id: true, name: true, deploy: true, revert: true, verify: true, content: true },
  where: { databaseId: { equalTo: '<database-uuid>' } },
}).unwrap();

console.log(result.sqlActions.nodes);
```

## Regeneration

```bash
pnpm generate
```

This runs codegen against `schemas/migrate.graphql` and outputs to `src/`.
