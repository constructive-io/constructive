# graphile-multi-tenancy-cache

Template-based multi-tenancy optimization for PostGraphile v5. Shares PostGraphile instances across tenants with identical schema structures using AST-based SQL rewriting.

## Features

- **Schema fingerprinting** — structural comparison (tables, columns, constraints) ignoring schema names
- **Template sharing** — one PostGraphile instance per unique fingerprint, shared across N tenants
- **AST-based SQL rewrite** — safe schema remapping via `pgsql-parser`/`pgsql-deparser`
- **Three cache layers** — introspection cache, template registry, SQL rewrite cache (all LRU + TTL)
- **No Crystal fork** — wrapper plugin intercepts at `withPgClient` level via Grafast middleware

## Architecture

```
Request → authenticate → resolve tenant schemas
  → introspection cache (fingerprint lookup)
  → template registry (shared PostGraphile instance)
  → PgMultiTenancyWrapperPlugin (client.query Proxy)
  → AST rewrite cache (schema name remapping)
  → PostgreSQL
```

See [SPEC.md](./SPEC.md) for full architecture documentation.
