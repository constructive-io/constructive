# Graphile tenant-density security audit

Audit date: 2026-08-02. Current branch:
`research/graphile-density-06-measured-optimization`.

## Verdict

Zhi's concern is correct for the old blueprint-pooling design, so that design is
not part of this candidate. The executable candidate does not rewrite runtime
SQL and does not share one PostGraphile instance between tenants. It builds one
instance against each exact physical database, login, API, ordered schema set,
role set, plugin/settings contract, and surface configuration. Scoped
introspection reduces catalog input during schema construction; it is not a
routing or authorization mechanism.

The current data plane passed the latest disposable PostgreSQL 18 A/B/C hostile
gate: 56 of 56 checks passed, including generated/plugin SQL, metadata,
functions, sequences, owner/BYPASS rejection, poisoned GUCs, rollback,
same-backend prepared-statement reuse, schema drift, cache invalidation,
serialized builds, realtime-resident instances, and ten alternating connection
reuse rounds with zero cross-tenant tokens. That is strong evidence for the
exact physical boundary, but it is not a production approval.

Production remains blocked on an atomic, versioned route-and-security contract.
Today a request resolves the route and then reads RLS/auth/features through
separate statements. Exact database/API identities prevent this from becoming
an arbitrary A-to-B pool/cache alias, but a domain handover or revocation can
leave one in-flight HTTP request using the old tenant snapshot. An accepted
WebSocket can retain the old route/session indefinitely because operations and
subscriptions are not checked against a control-plane revision. This is a real
stale-authorization defect and must be fixed before production.

## Claim-by-claim disposition

| Concern | Finding | Current protection and remaining limit |
|---|---|---|
| SQL is rewritten | True only of rejected #1333/#1334; false in the current runtime. | The current path gives the exact runtime pool and physical schema names directly to `makePgService`. There is no canonical-schema substitution, rewrite pool, or blueprint pool in runtime source. |
| RLS cannot prove SQL routing | Correct. | The candidate does not use RLS to justify routing. Dedicated logins/pools, schema/object ACLs, exact build identities, and runtime role audits enforce the physical boundary. RLS remains row-level defense in depth. |
| A missed identifier or raw plugin SQL can hit another tenant | Correct for rewrite pooling. | There is no rewrite coverage list to miss. Built-in raw SQL paths were audited and run against exact tenant pools. Arbitrary plugins are unsandboxed trusted code, so production now rejects all caller presets/plugins unless explicitly admitted. An admitted plugin remains part of the process and database trusted computing base. |
| RLS does not protect metadata, functions, sequences, indexes, or privileged code | Correct. | Runtime admission rejects cross-schema relation, sequence, function, and type privileges; object ownership; `SUPERUSER`, `BYPASSRLS`, `CREATEROLE`, `CREATEDB`, and replication; unexpected inherited/`SET ROLE` paths; `SECURITY DEFINER`; owner-rights views; foreign/materialized views; and unsafe stored-expression dependencies. PostgreSQL catalog names are still generally visible to connected roles, so the claim is non-use/non-exposure through GraphQL, not catalog-name confidentiality. |
| Fail-closed behavior is required | Correct. | Missing/ambiguous route rows, database/API IDs, physical schemas, roles, feature contracts, runtime credentials, scoped schemas, unsafe roles, protected preset overrides, untrusted production plugins, and invalid internal headers all fail closed. The remaining fail-closed gap is coherent revisioning across route/security reads and long-lived WebSockets. |
| Prepared statements can cross tenant state | Correct in a shared pool. | Pools are split by an opaque HMAC over endpoint, TLS, database, login, password, driver, pool settings, purpose, and sanitation mode. Reused checkouts run `DISCARD ALL`, then clear node-postgres and Graphile prepared-statement bookkeeping; reset failure destroys the client. The real same-backend A/B/C test passed. |
| The fingerprint groups tenants into one Graphile instance | False for the current candidate. | The HMAC build contract includes opaque pool identity, database/API IDs, ordered schemas, roles, resolved plugins/settings, compute/storage bindings, surface flags, and introspection mode. Each exact tenant/API contract gets its own instance. The hash is a cache identity, not a code signature or sandbox. |
| More separate APIs improve reuse | False under the secure design. | API ID participates in the build contract, so a separate API intentionally gets a separate instance. Density comes from lowering each dedicated instance's retained memory and governing builds, not weakening isolation through reuse. |
| BM25 is skipped | False in the current candidate; true of the old rewrite design's compatibility exclusions. | BM25 stays enabled and binds the physical schema-qualified index name. The A/B/C fixture built and exercised BM25 together with tsvector, trigram, vector, PostGIS, and ltree. |
| GUC values can revert to an earlier tenant | `SET LOCAL` restores the prior value after transaction end, so the concern is correct. | Every request writes the full security-GUC allowlist, including empty values, plus role, read-only state, `row_security`, and a pinned `search_path`. Checkout sanitation removes any earlier session and prepared state first. |
| Plugins that reference RLS/schema objects may bypass the design | Plugins are trusted code, so the concern is correct in principle. | Built-ins receive the exact pool, physical schemas, and request `pgSettings`; metadata loaders use same-database/API joins and quoted identifiers. Production caller presets are denied by default. Any explicit opt-in requires pinned dependencies, code review, and requalification because a plugin can open its own connection or use process I/O. |

## Evidence

### Latest hostile A/B/C execution

The final rerun used a disposable `constructiveio/postgres-plus:18` container, a
fresh database, three distinct `LOGIN NOINHERIT` roles, forced-RLS tenant tables,
denied cross-database/schema privileges, exact per-tenant pools, scoped-required
introspection, and realtime-resident instances. It completed in 3.9 seconds and
recorded 56 passing checks with `crossTenantTokens: 0`. The fixture is
deliberately marked `customerQualified: false`: it proves hostile isolation, not
the 15-minute workload/provider/density gates.

Evidence artifact:
`complete-tenant-fixture/generated/hostile-validation.json`.

Separate real PostgreSQL integration tests passed 2 of 2 checkout-sanitizer
checks and 2 of 2 runtime-role checks. Those tests deliberately reused one
backend after poisoning session/prepared state and created actual inherited
owner, `BYPASSRLS`, object-ownership, `SECURITY DEFINER`, and cross-schema
relation/sequence/function/type violations that admission had to reject.

### Relevant source boundaries

- `graphql/server/src/middleware/graphile.ts` resolves one exact runtime pool,
  passes physical schemas to `makePgService`, audits the role boundary on every
  resident request, and keys the resident instance by the exact build contract.
- `graphql/server/src/middleware/graphile-build-contract.ts` builds and HMACs the
  exact contract. Function source and exact in-process identity participate, but
  mutable closure state and supply-chain integrity cannot be attested by a hash.
- `graphql/server/src/middleware/runtime-pg-config.ts` accepts only explicit
  credential data, matches the routed physical database and network/TLS target,
  and keeps raw credentials in a request-keyed `WeakMap`.
- `graphql/server/src/middleware/runtime-role-safety.ts` performs the catalog
  privilege, ownership, role-reachability, privileged-object, and stored
  dependency audit. Successful-result reuse defaults to zero milliseconds.
- `postgres/pg-cache/src/pg.ts` defines exact pool identity, executes
  `DISCARD ALL`, clears both prepared-statement caches, pins the safe baseline,
  and destroys a client on sanitation failure.
- `packages/express-context/src/pg-settings.ts` initializes every security GUC,
  role, read-only state, `row_security`, and the allowlisted search path for each
  Graphile transaction.
- `graphql/server/src/middleware/graphile-preset-composition.ts` rejects
  production caller plugins by default and prevents admitted presets from
  replacing server-owned PostgreSQL services, request context, transport/error
  policy, build-state policy, or protected plugins. This is admission, not a
  sandbox.
- `research/graphile-density/PLUGIN-SQL-AUDIT.md` records the built-in plugin/raw
  SQL review and the remaining deliberate system/build lanes.

### Performance result retained under the secure architecture

On the clean three-repetition 62,298-`pg_class` single-surface fixture, stock
introspection retained a median 449.42 MiB heap, ended 1,106.94 MiB above the
RSS baseline, and built in 3,495.95 ms. Scoped dependency introspection retained
6.55 MiB heap, ended 47.77 MiB above the RSS baseline, and built in 130.34 ms:
68.60 times less retained heap, 23.17 times less final RSS, and a 26.82 times
faster cold build. The compared schema was byte-equivalent and the recorded
operations had zero errors, mismatches, or cross-tenant tokens.

These are performance-only instance measurements, not a complete-customer
tenants-per-GiB qualification. Security hardening added authoritative metadata
reads and role admission work, so final throughput/p99 must be remeasured; no
security check may be removed to recover a benchmark.

## Production blockers

1. **Atomic security contract.** Add `TenantSecurityContractV1` with an immutable
   revision. Resolve route plus routing-plane security/exposure fields in one
   parameterized read-only snapshot. Publish tenant-local auth settings under
   that revision, then atomically activate it in routing; absence or mismatch
   must fail closed. Carry the revision through `ApiStructure`, runtime resolver
   input, the Graphile build contract, and WebSocket admission.
2. **Revocation semantics for long-lived transports.** Recheck
   `(selector, apiId, databaseId, revision)` before every WebSocket operation,
   retire the resident generation on mismatch, and terminate existing
   subscriptions through event-driven invalidation plus an authoritative
   fallback. Decide and document whether an HTTP request owns an admission
   snapshot or must recheck immediately before execution.
3. **Production database policy proof.** Against disposable production-shaped
   databases, verify the exact runtime login and both request roles for every
   exposed/dependency object, and assert the intended RLS/policy/FORCE-RLS
   manifest for shared-row tables. The fixture proves the mechanism, not every
   deployed tenant schema.
4. **Explicit auth-required contract.** `strictAuth=false` permits an API with no
   RLS module to proceed anonymously. Public/no-auth APIs may be intentional, so
   production needs an authoritative per-API `authRequired` field rather than a
   process-wide guess; missing required auth metadata must fail closed.
5. **Upstream introspection review.** `scoped-required` depends on source-level
   Graphile patches and dependency-closure semantics. It must stay off by
   default until Graphile maintainers review the isolated API and the patches
   are replaced by supported upstream code.
6. **Operational trust boundary.** The internal-header secret must be stripped
   at public ingress and carried only over authenticated encrypted service hops.
   `X-Meta-Schema` is a deliberate cross-tenant administration capability,
   disabled by default, and must use a separate private ingress and safe roles
   if enabled. Runtime credential resolution and every explicitly admitted
   plugin remain trusted code.
7. **Release qualification.** Rerun the 15-minute repeated complete-customer
   density matrix and two-hour churn soak on the final security code, including
   multipart upload/storage byte roundtrips and intended external providers.

Until blockers 1–5 are closed, the production decision is **no-go**. The
dedicated-instance/scoped-introspection architecture remains the right candidate
because its measured memory gain does not depend on SQL rewrite or weakened
tenant isolation.

