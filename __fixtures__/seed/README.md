# Shared Seed Fixtures

Composable SQL seed layers for integration testing. Each layer builds on the previous one.

## Layers

| Layer | Files | What it provides |
|-------|-------|-----------------|
| **base** | `base/setup.sql` | `uuid-ossp` extension, `stamps` schema + `timestamps()` trigger |
| **routing (real modules)** | `seed.pgpm(repoRoot)` | Real `@pgpm/metaschema-modules` (+ deps: `@constructive-db/{catalog,routing,apps,routing-functions}`, `@pgpm/metaschema-schema`, ...) installed into the gitignored root `extensions/` — see `.agents/skills/ephemeral-pgpm-fixtures/SKILL.md`; run `pnpm fixtures:install` first. `@constructive-db/routing-functions` ships the generated `resolve_route()` / `resolve_http_route()` / `api_schema_names()` and the hostname/route binding-sync triggers |
| **scoped data** | `scoped/test-data.sql` | Example database (`simple-pets`) on the published modules: catalog apis/domains, routing apis/api_schemas/domains/routes, apps + app_components. The compiled hostname/route bindings are maintained by the binding-sync triggers from `@constructive-db/routing-functions` |
| **app-schemas** | `app-schemas/simple-pets/schema.sql` | `simple-pets-*` schemas, animals table with constraints/indexes/triggers |
| **app data** | `app-schemas/simple-pets/test-data.sql` | 5 test animals (Buddy, Max, Whiskers, Mittens, Tweety) |

> **Note:** Roles (`administrator`, `authenticated`, `anonymous`) are created upstream by `pgsql-test`'s `createBaseRoles()` — seed SQL should never create roles.

## Usage with pgsql-test

### Static tests (no metaschema)

```typescript
const SEED = path.resolve(__dirname, '../../../__fixtures__/seed');

seed.sqlfile([
  `${SEED}/base/setup.sql`,          // extensions, stamps
  // ... your app-specific schema + data
])
```

### Scoped-routing tests (metaschema + host route resolution)

Real module DDL comes from the pinned `@pgpm/*` / `@constructive-db/*` modules
installed at the repo root (`pgpm.json` dependencies, populated by
`pnpm fixtures:install`):

```typescript
const REPO_ROOT = path.resolve(__dirname, '../../..');

[
  seed.pgpm(REPO_ROOT),                               // all installed modules
  seed.sqlfile([
    `${SEED}/app-schemas/simple-pets/schema.sql`,     // app tables
    `${SEED}/scoped/test-data.sql`,                   // routing/catalog/apps rows
    `${SEED}/app-schemas/simple-pets/test-data.sql`,  // test animals
  ]),
]
```

## Composition

Pick only the layers you need:

- **Base only** (extensions + stamps, no metaschema): `base/setup.sql` + your own schema/data
- **Metaschema + routing only** (no app tables): `seed.pgpm(repoRoot)` + `scoped/test-data.sql`
- **Full stack with app data**: `seed.pgpm(repoRoot)` + `app-schemas/*` + `scoped/test-data.sql` + `app-schemas/*/test-data.sql`
- **Custom app schema**: `seed.pgpm(repoRoot)` + `scoped/test-data.sql` + your own schema/data SQL

The installed modules grant `administrator`/`authenticated` — there are no
`anonymous` grants anywhere (matching production). Server plugins resolve
module registrations (metaschema config) without the request role, so
anonymous request paths never need grants on the metaschema schemas.

## Consumers

These test files use the shared fixtures:

| Test file | Shared fixtures used |
|-----------|---------------------|
| `graphql/server-test/__tests__/server.integration.test.ts` | `base/*` (simple-seed static), `scoped/*` + `app-schemas/*` (simple-seed-scoped) |
| `graphql/server-test/__tests__/scoped-routing.integration.test.ts` | `scoped/*` + `app-schemas/*` (simple-seed-scoped) |
| `graphql/server-test/__tests__/express-context.integration.test.ts` | `scoped/*` + `app-schemas/*` |
| `graphql/server-test/__tests__/fn-routes.integration.test.ts` | `scoped/*` + `compute/*` + `app-schemas/*` |
| `graphql/server-test/__tests__/upload.integration.test.ts` | `seed.pgpm` modules (storage schemas/data are local) |
| `graphql/server-test/__tests__/cli-e2e.test.ts` | `base/*` + `app-schemas/*` (animals), `base/*` (search) |
| `graphql/server-test/__tests__/search.integration.test.ts` | `base/*` |
| `graphql/server-test/__tests__/schema-snapshot.test.ts` | `base/*` |

## Local Fixtures (not shared)

Some test scenarios have unique content that stays in `graphql/server-test/__fixtures__/seed/`:

| Directory | What's unique |
|-----------|--------------|
| `search-seed/` | `extensions.sql` (pg_trgm + pgvector), `schema.sql` (articles table with tsvector/trigram/vector columns), `test-data.sql` |
| `schema-snapshot/` | `schema.sql` (5-table blog schema: users, posts, tags, post_tags, comments), `test-data.sql` |
| `simple-seed-storage/` | `schema.sql` (3-tenant storage schemas), `test-data.sql` — storage module + JWT functions come from the real pgpm modules |

## Well-Known IDs

| Entity | ID | Notes |
|--------|----|-------|
| Database | `80a2eaaf-f77e-4bfe-8506-df929ef1b8d9` | "simple-pets" |
| Schema (public) | `6dbae92a-5450-401b-1ed5-d69e7754940d` | `simple-pets-public` |
| Schema (private) | `6dba9876-043f-48ee-399d-ddc991ad978d` | `simple-pets-private` |
| Schema (pets_public) | `6dba6f21-0193-43f4-3bdb-61b4b956b6b6` | `simple-pets-pets-public` |
| API (app) | `6c9997a4-591b-4cb3-9313-4ef45d6f134e` | Public, `authenticated`/`anonymous` |
| API (private) | `e257c53d-6ba6-40de-b679-61b37188a316` | Private, `administrator`/`administrator` |
| Domain (app) | `41181146-890e-4991-9da7-3dddf87d9e78` | `app.test` / `constructive.io` |
| Domain (private) | `51181146-890e-4991-9da7-3dddf87d9e79` | `private.test` / `constructive.io` |
