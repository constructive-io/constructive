# @pgpmjs/transform

Change-aware SQL transformation for PGPM. A **superset of [`@pgsql/transform`](https://www.npmjs.com/package/@pgsql/transform)** — everything from the pure AST layer is re-exported, plus the layers that understand pgpm *changes*:

- **`categorizeChange` / `buildCategoryOf` / `TIER_PROFILE`** — profile-driven categorization of migration changes (schema / functionality / security / fixtures) from their AST facts, ready for `@pgpmjs/core`'s `boundary: 'category'` rebundle mode.
- **`resolveFixtureClosure`** — transitive dependency closure over a set of changes (name + deploy SQL + optional plan dependencies): forward producers of every referenced object/schema/role, attached fixtures (policies/grants/RLS targeting closure members), explicit unresolved-reference reporting.
- **`makeSchemaTranspiler` / `makeNamespaceValidator`** — drivers plugging `transformSql`/`classifyStatements` into the pgpm migration-bundle seams (`transpileBundle`'s `renameChange`/`transformScript`, `applyBundle`'s `validateReferences`).

Re-exported from `@pgsql/transform`: `transformSql` (schema-name rewriting incl. PL/pgSQL bodies), `classifyStatements` (per-statement AST facts), `qualifyUnqualified`, and round-trip validation utilities.

## Installation

```bash
npm install @pgpmjs/transform
```

The parser runs on a WASM build of the real PostgreSQL parser; call `loadModule()` from `plpgsql-parser` once before using any synchronous API.

## Usage

```typescript
import { loadModule } from 'plpgsql-parser';
import { buildCategoryOf, resolveFixtureClosure, TIER_PROFILE, transformSql } from '@pgpmjs/transform';

await loadModule();

const categoryOf = buildCategoryOf(changes, TIER_PROFILE);
const closure = resolveFixtureClosure(allChanges, ['schemas/api/procedures/get_totals']);
```
