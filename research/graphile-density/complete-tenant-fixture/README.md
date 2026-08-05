# Complete-tenant A/B/C research fixture

This fixture is the correctness half of the tenant-density spike. The uniform
catalog fixture finds the memory-capacity curve; this fixture asks whether a
candidate can keep a small, production-shaped A/B/C fleet complete and isolated.
Three tenants are too few to establish tenants per GiB, so no performance claim
may be derived from this fixture alone.

The A/B/C database and generated GraphQL operation names were validated end to
end on 2026-08-02 against a disposable PostgreSQL 18 `postgres-plus` instance.
The latest-source hostile run passed all 56 checks, including all declared
capability operations, realtime-resident instances, same-backend sanitation,
schema drift/rebuild, and alternating connection reuse with zero cross-tenant
tokens. Its local evidence is `generated/hostile-validation.json`. Unsupported
or renamed fields still fail the run; nothing is silently skipped. This is an
offline hostile-isolation result, not complete-customer density or production
provider qualification.

## Isolation model

`schema.sql` creates three physical tenant schemas (`ctf_a`, `ctf_b`, `ctf_c`)
with identical objects, forced RLS policies, and distinct canary values. It
requires three distinct `LOGIN NOINHERIT` runtime roles. Each role receives
USAGE and object privileges for exactly one tenant schema, while shared access is
limited to the audited `ctf_extensions` and `jwt_private` dependency schemas.
Configured request roles must not reach parent roles through either `INHERIT`
or `SET`; the startup audit evaluates each request role as a separate execution
root, so a privilege or ownership path that appears only after `SET ROLE` fails
closed.
Each role also receives USAGE and EXECUTE on its own `ctf_<id>_realtime` cursor
schema, with PUBLIC and both foreign tenant roles denied. The fixture setup
asserts that ACL matrix before it succeeds.

`server.cjs` creates one PostGraphile instance and one dedicated runtime pool
for each tenant. The default non-realtime lane uses `max=1`; realtime fails
closed unless the pool has at least two slots because its cursor manager keeps
one client resident. A live build contract includes the exact credential-sensitive,
process-keyed pool identity and physical schema, so host labels cannot alias cache
entries. Cross-process evidence uses a separate deterministic credential-free
contract fingerprint and proves its live role/database/schema mapping at runtime.
Runtime checkouts use `DISCARD ALL`; each request then sets the complete security-GUC
allowlist, role, read-only state, RLS state, and pinned search path. The hostile
probe deliberately reuses a named statement with different SQL after checkout
to verify both PostgreSQL and node-postgres prepared-statement bookkeeping were
cleared.

Schema drift is deliberately outside the runtime boundary. The runtime roles
have no USAGE or EXECUTE access to `ctf_control`; the loopback control endpoint
uses the separately configured control-plane `PG*` login and a random in-memory
token. RLS remains defense in depth for rows, while schema ACLs and dedicated
logins enforce the physical routing boundary.

The metadata canary covers GraphQL schema and introspection isolation. It does
not claim that tenant schema names are confidential inside PostgreSQL:
system-catalog object names are generally visible to connected roles, and
hiding those names would require a stronger database/process boundary. The
security claim here is that another tenant's objects cannot be used or exposed
through the GraphQL build, not that their catalog names cannot be observed.

## What the offline lane covers

The candidate fleet includes generated CRUD/function plans, i18n, deterministic
LLM/RAG, BM25, tsvector, trigram, pgvector, PostGIS, ltree, presigned-upload
metadata/signing, bulk mutations, realtime-tagged writes, and preloaded function
bindings. BM25 stays enabled because every instance compiles against its real
physical schema; there is no SQL schema rewrite.

`hostile-validation.cjs` checks every declared canary plus dynamic session
poisoning, savepoint rollback, prepared-statement reset, schema drift and cache
invalidation, serialized cold builds, and alternating A/B/C connection reuse.
Every dynamic identity and authenticated control response must also return the
caller-supplied `current_database()` identity, and every tenant runs a negative
role-safety probe that must reject the control-plane role.
The exact roles and pools prevent cross-tenant session reuse by construction;
the reuse checks prove sanitation within each tenant pool and distinct build
contracts prove that pools cannot alias. Any unavailable or inconclusive probe
exits non-zero.

Realtime mutations exercise the tagged database write and NOTIFY trigger. With
`--enable-realtime`, every cached instance keeps a cursor manager resident
against its exact tenant cursor schema and exposes a no-server Grafserv upgrade
handler. The outer fixture server selects that handler only after an exact
tenant path match, and disposal terminates that generation's long-lived sockets
before releasing its pool. The physical-density wrapper keeps one
`graphql-transport-ws` subscription resident per surface and requires a real,
tenant-specific event before the surface can count.

## External-provider boundary

The exact fixture currently injects a deterministic LLM and uses a signing-only
S3 client. Those paths exercise plugin and database integration but prove
neither model semantics nor an object-storage byte roundtrip. Consequently:

- `--class offline-research` may pass local gates but always records
  `customerQualified: false`.
- `--class production` currently fails with
  `CTF_PRODUCTION_EQUIVALENCE_NOT_IMPLEMENTED`, even when provider arguments are
  supplied. Missing arguments fail earlier with
  `CTF_EXTERNAL_PROVIDER_GATES_UNSATISFIED`.
- Production support requires wiring and testing the intended Ollama-compatible
  models plus disposable S3/MinIO PUT, HEAD/GET, and cleanup paths. The manifest
  requires `--ollama-url`, `--embedding-model`, `--chat-model`, `--s3-endpoint`,
  and `--s3-bucket`; provider credentials stay in the environment and never in
  artifacts.

## Disposable local setup

Create the three runtime logins separately under an administrator. They must be
distinct, `LOGIN NOINHERIT`, and must not be superuser, `BYPASSRLS`,
`CREATEROLE`, `CREATEDB`, replication, a tenant-schema owner, or able to CREATE
in a tenant schema. The fixture intentionally does not create or alter roles.

```bash
createdb graphile_complete_tenant_spike
psql --set=ON_ERROR_STOP=1 \
  --set=runtime_role_a=ctf_runtime_a \
  --set=runtime_role_b=ctf_runtime_b \
  --set=runtime_role_c=ctf_runtime_c \
  --dbname=graphile_complete_tenant_spike \
  --file=research/graphile-density/complete-tenant-fixture/schema.sql
```

Keep the ordinary `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`
pointed at the fixture owner/control login. Supply runtime credentials only in
`CTF_RUNTIME_A_PGPASSWORD`, `CTF_RUNTIME_B_PGPASSWORD`, and
`CTF_RUNTIME_C_PGPASSWORD`; `GRAPHQL_RUNTIME_PGPASSWORD` is an optional shared
password fallback. Role names are non-secret command arguments.

Start the candidate and run the hostile gate with a control token of at least 32
bytes:

```bash
export CTF_CONTROL_TOKEN="$(openssl rand -hex 32)"
export GRAPHILE_CACHE_MAX=3 PG_CACHE_MAX=4 PG_POOL_MAX=1 PG_POOL_MAX_USES=0
export DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE=100

node research/graphile-density/complete-tenant-fixture/server.cjs \
  --port 3391 --arm local-complete-tenant --mode scoped-required \
  --runtime-role-a ctf_runtime_a \
  --runtime-role-b ctf_runtime_b \
  --runtime-role-c ctf_runtime_c

node research/graphile-density/complete-tenant-fixture/hostile-validation.cjs \
  --base-url http://127.0.0.1:3391 \
  --expected-physical-database-identity graphile_complete_tenant_spike \
  --arm local-complete-tenant --mode scoped-required
```

For the realtime-resident lane, add `--enable-realtime true
--runtime-pool-max 2`, keep process-global `PG_POOL_MAX=1`, and set
`PG_CACHE_MAX` high enough for the three dedicated runtime identities plus the
control identity. Runtime capacity is explicit per pool and must not leak into
the control-plane baseline.

Generate credential-free cperf inputs only after the server reports exact,
unique `graphile:v1:` contracts:

```bash
node research/graphile-density/complete-tenant-fixture/generate-inputs.cjs \
  --port 3391 --postgres-container postgres \
  --runtime-role-a ctf_runtime_a \
  --runtime-role-b ctf_runtime_b \
  --runtime-role-c ctf_runtime_c
```

The one-command research gate is explicitly offline and runs three 15-minute
repetitions at a 4-GiB V8 old-space setting, followed by the mandatory repository
suites. It is a completeness gate, not a capacity search:

```bash
node research/graphile-density/complete-tenant-fixture/qualification-runner.cjs \
  --class offline-research \
  --postgres-container postgres \
  --runtime-role-a ctf_runtime_a \
  --runtime-role-b ctf_runtime_b \
  --runtime-role-c ctf_runtime_c
```

The perf harness rejects a dirty server provenance. Commit the local research
branches and confirm `git status --short` is empty before a qualifying run; the
fixture ignores only its generated inputs and run-artifact directories so those
outputs do not invalidate provenance. No commit or push is performed by these
scripts.

Build the affected packages before starting the fixture. Its exact runtime
`dist` artifact fingerprint is part of every Graphile build contract and the
generated benchmark provenance; a stale build-contract API fails closed instead
of silently measuring old code.

Before using any result, inspect `qualification.json`. The offline lane is valid
only when `localPassed` is true, and `customerQualified` must remain false until
the provider-backed production runner exists and passes.
