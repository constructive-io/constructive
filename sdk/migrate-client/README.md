# @pgpmjs/migrate-client

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@pgpmjs/migrate-client"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=sdk%2Fmigrate-client%2Fpackage.json"/></a>
</p>

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

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
