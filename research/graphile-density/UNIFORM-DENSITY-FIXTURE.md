# Uniform Graphile density fixture

`graphile_density_uniform_20260801_a` is a performance-only routing-canary
fixture. It measures Graphile memory density across a uniform 4,000-tenant
catalog; it does not prove database-enforced tenant isolation or qualify a
complete customer surface. The shared `gd_runtime_20260801_a` login can read
every tenant schema by design.

The fixture was physically cloned from `graphile_density_20260801_a` without
modifying or dropping the source. Tenants 401 through 4,000 were populated in
100-tenant transactions, and 7,920 complete disposable noise tables were
removed in 100-table transactions. The exact `pg_class` accounting is:

| Catalog bucket | Rows |
| --- | ---: |
| 4,000 tenant schemas, seven direct classes each | 28,000 |
| Remaining `gd_noise` tables, sequences, and indexes | 10,094 |
| Tenant, noise, and system TOAST tables/indexes | 22,808 |
| System classes outside `pg_toast` | 337 |
| **Total** | **61,239** |

Each tenant has two tables, two identity sequences, three indexes, four owned
TOAST classes, one stable `tenant_token()` function, and nine PostgreSQL 18
constraints (including cataloged `NOT NULL` constraints). Objects are owned by
`postgres`; the runtime role has schema `USAGE`, table `SELECT`, sequence
`SELECT, USAGE`, and function `EXECUTE`, but no schema/database `CREATE` and no
table write privileges.

## Reproduce locally

Run with an already configured PostgreSQL administrator environment; neither
script contains credentials:

```bash
psql -X -v ON_ERROR_STOP=1 -d postgres \
  -f research/graphile-density/create-uniform-density-fixture.sql

psql -X -v ON_ERROR_STOP=1 -d postgres \
  -f research/graphile-density/validate-uniform-density-fixture.sql
```

The creator fails when the fixed target already exists and never drops a
database. Its explicit `-v resume=1` path is limited to an existing clone that
still passes the asserted 61,239-row heterogeneous source shape before any
tenant DDL runs.

## Recorded validation

The final standalone validation completed all 40 least-privilege runtime
batches and reported:

```text
database_name:               graphile_density_uniform_20260801_a
pg_class_count:              61239
tenant_schema_count:         4000
distinct_tenant_shapes:      1
logical_pg_class_fingerprint ec670a0d19a77919732f544d54bb34c9
tenant_shape_fingerprint:    91910068fdc30af0dc304390ee3a605a
```

The logical class fingerprint normalizes OID-derived TOAST names and excludes
volatile physical statistics, so it records catalog shape rather than clone
OID allocation or post-benchmark `ANALYZE` state.
