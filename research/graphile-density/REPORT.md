# Graphile tenant-density research spike

The useful non-rewrite work has been rebuilt on current `origin/main` and the
memory result is now measured: on a clean three-repetition 62,298-`pg_class`
fixture, scoped dependency introspection reduced median retained heap from
449.42 MiB to 6.55 MiB and cold build time from 3,495.95 ms to 130.34 ms. The
latest disposable PostgreSQL 18 A/B/C hostile run passed all 56 checks with zero
cross-tenant tokens. The default remains stock introspection and blueprint/SQL
rewrite pooling is absent.

This is still not production-qualified. A final audit found a real
route/security revision race: exact identities prevent arbitrary cross-tenant
pool aliasing, but a domain handover or revocation can leave an in-flight HTTP
request on the old authorization snapshot, and an accepted WebSocket can retain
it indefinitely. `SECURITY-AUDIT.md` records the required atomic versioned
contract and the remaining release gates.

## Local stack

| Branch | Commit at report time | Outcome |
|---|---|---|
| `research/graphile-density-01-plugin-scope` | `7ef0502666d71d33bd7275bd27588698a205f3ee` | Reapplied i18n, LLM/RAG, BM25, quoting, and cache-scope fixes to current plugin architecture; current `graphile-meta` already has build-local state. |
| `research/graphile-density-02-runtime-boundary` | `de92be5a9f459079f75e94f23d35abcb92365d16` | Added exact pool/build identities, optional least-privilege runtime credentials, complete request-GUC initialization, checkout sanitation, and runtime-role safety checks. |
| `research/graphile-density-03-cache-governor` | `5fd90ee2b7aa5c52984cb53269ab4e1ec16422f0` | Hardened disposal, draining, build coalescing/admission, heap budgeting, stable 503 refusal codes, timers, and debug counters. |
| `research/graphile-density-04-scoped-introspection` | `f41e480d55dfee99a68567dc12145b40f5356bd7` | Replaced SQL text substitution with a bind-parameter query API and fail-closed Graphile service mode; stock remains the default. |
| `research/graphile-density-05-cperf` | this report's branch | Refreshed the harness around complete tenants, physical build contracts, hostile per-surface canaries, fresh processes, four arms, immutable run directories, and fail-closed scoring. The audit also extends runtime safety from schema ownership to relation/sequence/view/function/type ownership. |
| `research/graphile-density-06-measured-optimization` | current local branch | Measured the production-shaped catalog, released build-only state, hardened routing/credentials/plugins/storage/auth/GUC boundaries, and ran the complete A/B/C hostile gate. |

All branches and artifacts are local. No push, PR edit, deployment, or `constructive-db` change was made.

## Original PR disposition

| PR | Disposition | Reason |
|---|---|---|
| #1330 | Reimplemented | The SQL quoting and tenant-scoped plugin fixes remain valid. The large old lockfile normalization was not replayed; current package manifests only add dependencies actually used. |
| #1331 | Hardened and split | Cache pressure work remains valuable, but pool/build identity, credentials, GUCs, and checkout sanitation were made an earlier trust boundary rather than mixed into eviction policy. |
| #1332 | Replaced | The old implementation substituted text inside a generated catalog query and could silently fall back. The candidate preserves `makeIntrospectionQuery()`, passes names as values, computes dependency closure, asserts requested schemas, and has no scoped-mode fallback. |
| #1333/#1334 | Rejected for production | Rewriting qualified SQL makes tenant routing depend on exhaustive interception of generated plans, plugins, raw SQL, prepared statements, metadata, functions, sequences, and extension-specific bind values. RLS does not prove that routing layer correct. |
| #1335 | Refreshed with corrected provenance | Process isolation, open-loop load, canaries, and artifacts were retained. Blueprint-specific baselines and success claims are historical and are not accepted as evidence for the dedicated-instance candidate. |

The exact remote heads and unusual #1330/#1331 ancestry are recorded in `ORIGINAL-STACK.md`.

## Decisions on the raised concerns

Zhi's isolation concern is valid, so the aggressive rewrite design is out. Every resident instance compiles against ordered physical schemas, and host/service names are routing labels rather than cache identities. RLS remains valuable for row filtering, but metadata, schema objects, functions, sequences, owner/BYPASS roles, and privileged paths have their own hostile gates.

The owner check now covers objects as well as schemas: a runtime login or reachable request role that owns a relation, sequence, view, function, or type in an exposed schema is rejected. Admission also rejects `SECURITY DEFINER`, owner-rights views, foreign/materialized views, unsafe stored-expression dependencies, unexpected inherited/`SET ROLE` paths, and privileges on unapproved objects. The real PostgreSQL integration suite created these unsafe grants and proved that they are rejected.

Dan's API-separation concern is addressed by isolating `makeSchemaScopedIntrospectionQuery(schemas): { text, values }` from Constructive policy. Graphile selects it through a service option; Constructive only supplies the explicit `stock|scoped-required` setting. It is not presented as a general Graphile plugin because the narrow upstream seam belongs beside `makeIntrospectionQuery()` and the gather layer.

BM25 stays enabled. Its query builder passes the physical schema-qualified index name, so there is no rewrite exclusion or canonical index alias. `SET LOCAL` does restore the prior session state, which is why request initialization alone is insufficient: a reused checkout runs `DISCARD ALL`, clears node-postgres and `@dataplan/pg` prepared bookkeeping, and destroys the connection if reset fails. The hostile fixture proved this on the same backend for A, B, and C.

The plugin audit closed the earlier storage and `PublicKeySignature` request-context gaps. Constructive now supplies one immutable exact-build storage snapshot; the generic presigned fallback is database/API filtered, request-scoped, ambiguity-failing, and non-sliding. Public-key plans require request `pgSettings` and use the native Graphile transaction client. Arbitrary plugins remain unsandboxed Node code, so production rejects all caller presets by default; an explicit trust opt-in makes that code part of the process and database trusted computing base. See `PLUGIN-SQL-AUDIT.md`.

The remaining authorization gap is control-plane atomicity rather than SQL rewrite. Route, RLS, auth, feature, CORS, public-key, and WebAuthn fields are read through separate statements with no shared revision. A handover can allow one stale HTTP request to the former tenant, while a WebSocket can retain a stale route/session until the generation is retired. Exact pool/build identities keep the data path on that captured tenant and prevent an A/B mixture, but production needs a revisioned, single-snapshot contract and long-lived transport revalidation.

## Evidence produced

The clean production-shaped catalog run used 62,298 `pg_class` rows, 346,369
attributes, 8,496 procedures, 23,709 types, and 4,036 namespaces. Across three
fresh-process repetitions, stock introspection retained a median 471,256,024
bytes (449.42 MiB) after forced GC, ended 1,160,708,096 bytes (1,106.94 MiB)
above the RSS baseline, and reached first-build readiness in 3,495.95 ms. Scoped
dependency introspection retained 6,869,560 bytes (6.55 MiB), ended 50,085,888
bytes (47.77 MiB) above the RSS baseline, and built in 130.34 ms. That is 68.60×
less retained heap, 23.17× less final RSS, and a 26.82× faster cold build.

The clean arms had identical source/lockfile/entry provenance within their
comparison, identical catalog fingerprints, and zero recorded errors,
mismatches, or cross-tenant tokens. The broader comparison produced an identical
17,976-byte GraphQL SDL with SHA-256
`5fb82f96153815b23820a9ccf10322a20c864e49605ef5781cd33422b3b31020`.
These are performance-only results for one complete Graphile surface, not a
complete-customer density qualification.

The small disposable PostgreSQL fixtures also proved stock-query byte
stability, bind-only schema names, fail-closed missing schemas, cross-schema
type/FK closure, safe partition direction, and byte-identical Constructive SDL.
The latest full-capability A/B/C fixture then passed all 56 hostile checks on a
fresh PostgreSQL 18 database with three distinct least-privilege logins and
realtime-resident instances. It recorded same-backend prepared reset for every
tenant, serialized cold builds, ten alternating connection rounds, and zero
cross-tenant tokens. The disposable container was stopped and removed; existing
local PostgreSQL containers were not modified.

The new cperf package compiles and its current unit/in-process integration suite passes. It rejects the checked-in placeholder with a precise list of the missing 47 tenants, capabilities, and per-surface canaries, so a five-second smoke or a mislabeled `__typename` query cannot become a qualifying result. Each real run records request samples, canary results, Node/cache telemetry, coarse PostgreSQL container telemetry, server logs, and an immutable scored result.

## Validation performed

The final top-of-stack root build completed all 119 participating workspace
packages (of 120 total). The GraphQL server's CJS/ESM build passed and its full
suite passed 399 tests with two skips.
GraphQL environment passed 42 tests, request context passed 41, pg-cache passed
119 with five environment-gated skips, cperf passed 233, and the focused
Graphile settings security/capability suites passed 22. Separate live PostgreSQL
sanitizer and runtime-role suites passed two checks each.

The complete `graphile-llm` suite additionally passed 53 tests and failed 11
live-provider cases because no Ollama endpoint was available; the changed
discovery/RAG SQL tests pass, but the unavailable model capability remains an
external integration gate rather than being silently skipped. The full Graphile
settings suite has one credential-gated cross-database BM25 case that cannot use
the passwordless local default; the focused changed suites and the independent
A/B/C BM25 fixture pass.

The final admission pass also found and fixed a CAPTCHA bypass: admission now
classifies the selected mutation from its AST rather than trusting a
client-controlled operation label, rejects malformed/ambiguous/batched requests,
parses all supported HTTP body formats before admission, rejects protected
WebSocket mutations, and fails closed on a missing production/strict secret.
The focused HTTP/WebSocket suite passed all 36 tests. Caller Graphile presets are
now denied by default in production; the focused composition/contract suites
passed all 21 tests.

The root lint command is not a usable acceptance gate on current `origin/main`
because ESLint 9 cannot find a flat `eslint.config.*`; this predates the spike
and was not papered over locally.

The lockfile contains only the changed `pg-introspection` patch hash and the new cperf workspace importer with its TypeScript toolchain snapshot. No unrelated lockfile normalization from the old PR stack was replayed.

## Historical results are not current evidence

#1335 documents approximately 14.7 MiB retained heap per instance, 417 ms cold builds, a 17 MiB PostgreSQL spike, an 87× reduction, and high same-blueprint tenant density. Those numbers were collected with the rejected SQL-rewrite/blueprint-pooling system and are not reproduced here. Its five-hour soak also recorded one inconclusive isolation canary; the refreshed gate requires zero inconclusive checks, so that run would not qualify under this spike's rules.

The safe dedicated-instance candidate now beats the old retained-heap and cold
build targets on the production-shaped single-surface fixture: 6.55 MiB and
130.34 ms. That does not reproduce the old blueprint density claim because the
accepted design intentionally keeps tenant/API instances separate. Complete
customers per GiB still requires the multi-surface ramp and soak.

## Gates still open

- Introduce an atomic `TenantSecurityContractV1` revision spanning route,
  exposure, role, feature, and auth policy. Carry it through runtime/build and
  WebSocket contracts, reject mismatches, retire resident generations, and close
  stale subscriptions. The present multi-statement reads allow bounded stale
  HTTP access and potentially unbounded stale WebSocket authorization after a
  handover/revocation.
- Prove the intended RLS/FORCE-RLS policy manifest, request roles, runtime login,
  and dependency-schema object allowlist against disposable copies of the real
  production tenant schemas. Add an authoritative per-API `authRequired`
  contract so missing auth metadata cannot silently become anonymous access.
- Run the four fresh-process arms at 1/2/4 GiB, every ramp point, three repetitions, 15 minutes each, then the two-hour maximum-density churn soak. A candidate passes only if every heap/repetition ramp adds at least one complete tenant and median maximum density improves at least 15%.
- Obtain Graphile maintainer review of the source-level introspection API and dependency closure; remove the temporary package dist patches before production.
- Re-run throughput and p99 on the final security code; authoritative metadata
  and role admission add real PostgreSQL work per request and may not be removed
  to improve the benchmark. Complete multipart storage byte roundtrips and the
  intended provider gates.
- Feed the governor a conservative validated instance-cost value from the final
  complete-customer runs. The 6.55 MiB single-surface result is not automatically
  a safe production capacity setting.

## Reviewer checklist

1. Can any routing label, hostname, or service key affect cache isolation? It should not; only the exact build contract hash can.
2. What happens when scoped introspection misses a configured schema? The build fails; it never retries stock.
3. Does RLS make a wrong physical schema safe? No; the design avoids rewrite routing and tests non-row objects separately.
4. Can a resident tenant count after an eviction, rebuild, build refusal, missing telemetry, or inconclusive canary? No.
5. Are the old 87× and 14.7 MiB figures current evidence? No. The current clean
   result is 68.60× retained-heap improvement and 6.55 MiB for one dedicated
   production-shaped surface; complete-customer density is still pending.
6. Can a committed handover/revocation invalidate every in-flight HTTP and
   WebSocket operation? Not yet; this is the production-blocking revision gap.
