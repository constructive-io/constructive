# Implementation notes and unknowns ledger

## Map retained

- Optimize complete warm tenants per GiB, not isolated schema build size.
- Keep one PostGraphile instance per exact physical tenant/API build contract.
- Treat RLS as row-level defense in depth; do not use it to justify SQL schema rewriting.
- Keep work local, use a fresh `origin/main` worktree, and never modify `constructive-db`.

## Territory-driven deviations

- #1332's SQL-text substitution was replaced by a parameterized query generator and explicit Graphile service option.
- #1333/#1334 were not ported. Dedicated physical-schema instances make BM25 and other `regclass`-like values ordinary physical names and remove the rewrite coverage problem.
- #1335's blueprint-oriented result model was replaced. A run counts tenants only after every declared build contract is resident, every surface is warm, all required operations and canaries ran, and the 15-minute telemetry gates pass.
- Reverse inheritance closure was removed after a partition fixture showed it would traverse from a shared parent into unrelated tenant child schemas.
- The checked-in fleet is an intentionally failing template because real tokens, credentials, APIs, S3, realtime events, and hostile probes do not exist safely inside this repository alone.

## Unknowns ledger

| Type | Item | Resolution/status |
|---|---|---|
| Known known | SQL rewrite routes objects before RLS evaluates rows. | Rewrite pooling rejected. |
| Known known | `SET LOCAL` restores the prior session value at transaction end. | Checkout uses `DISCARD ALL`; each request seeds the full security-GUC set including empty claims, role, and read-only state. |
| Known known | Graphile/node-postgres retain client-side prepared-statement bookkeeping. | Both installed adaptor structures are cleared after `DISCARD ALL`; sanitation failure destroys the client. |
| Known known | Actual scoped retained heap and cold-build cost at 62,298 `pg_class`. | Clean three-repetition single-surface median: 6.55 MiB retained heap, 47.77 MiB final RSS delta, and 130.34 ms cold build. Stock was 449.42 MiB, 1,106.94 MiB, and 3,495.95 ms. Complete-customer density remains unmeasured. |
| Known unknown | Full least-privilege grants and RLS/FORCE-RLS behavior for deployed tenant schemas. | The disposable A/B/C production-shaped fixture passed all 56 hostile checks, but it cannot prove every real tenant table/policy. A production-schema policy manifest remains a blocker. |
| Unknown found | Parent→child inheritance closure can include unrelated tenant partitions. | Removed; small byte-equivalence regression passed. |
| Unknown found | Storage and public-key plugins had null-context/fallback paths. | Constructive now preloads an immutable exact-build storage snapshot, the generic fallback is exact/request-scoped/fail-closed, and public-key plans require request settings and the native Graphile transaction client. Remaining deliberate system/build lanes are recorded in `PLUGIN-SQL-AUDIT.md`. |
| Unknown found | Schema-level checks did not catch a runtime/request role that owns an individual table and therefore bypasses RLS. | Top-of-stack safety query now rejects relation, sequence, view, function, and type ownership in exposed schemas. |
| Unknown found | Cache instance samples are supported but not automatically measured by the server. | Operators must feed a benchmarked `GRAPHILE_CACHE_INSTANCE_HEAP_BYTES`; automatic self-tuning is not claimed safe. |
| Unknown found | Docker memory telemetry cannot attribute a sub-second spike to one PostgreSQL backend. | Harness records a coarse dedicated-container delta and labels it accordingly. |
| Unknown found | Capability labels cannot prove semantic coverage by themselves. | The completed fleet and hostile query definitions require human review; the placeholder fails validation rather than producing a score. |
| Unknown found | Legacy Node module resolution in `@constructive-io/graphql-query` loses the PostGraphile adaptor augmentation after the scoped service wrapper is emitted. | The package now uses the same NodeNext/bundler split as the newer Graphile query package; CJS, ESM, tests, and the monorepo build pass without a service-type cast. |
| Unknown found | Route and security settings are fresh but are read by independent statements with no common revision. | Exact identities prevent arbitrary A/B pool aliasing, but handover/revocation can leave one stale HTTP request and an accepted WebSocket can retain stale authorization indefinitely. An atomic `TenantSecurityContractV1` plus socket/generation retirement is a production blocker. |
| Unknown found | Graphile caller plugins are unrestricted in-process code; a fingerprint is not a sandbox or code signature. | Production now rejects non-empty caller presets/plugins by default. Any explicit trust opt-in requires pinned code review and full requalification; built-ins and the runtime credential resolver remain TCB. |
| Unknown found | CAPTCHA admission trusted a client-controlled operation label and did not cover every transport/body shape. | Admission now classifies root mutation fields from the selected AST, parses supported HTTP bodies first, rejects ambiguous/unclassifiable inputs, blocks protected WebSocket mutations, and fails closed on a missing production/strict secret. The protected-field allowlist and Google hostname/action/timeout policy still need release ownership. |

## Conservative continuation policy

Do not enable `scoped-required` in production until upstream review, the atomic
security-contract gap, production-schema policy proof, and the full fixture
matrix pass. Do not configure the governor directly from the 6.55 MiB
single-surface result. Any failed or missing telemetry, semantic capability,
surface canary, resident instance, or paired matrix point remains a failed run.
