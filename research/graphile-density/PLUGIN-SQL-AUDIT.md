# Graphile plugin SQL and request-scope audit

This audit covers product packages under `graphile/*/src`, excluding test helpers. Its security model is the refreshed one: each tenant/API build uses its physical schemas and its own exact pool/build identity, so there is no SQL schema rewrite to make plugin SQL “poolable.” Identifiers still need correct quoting, values need binds, and runtime SQL needs the complete request settings.

Graphile plugins are unrestricted Node.js code, not declarative SQL fragments.
They can use the configured runtime service for raw SQL, open their own
connections, or access process I/O. Production therefore rejects every non-empty
caller `extends`/`preset` by default with
`GRAPHILE_CALLER_PRESET_NOT_TRUSTED`. An explicit
`trustCallerPresetsInProduction: true` opt-in admits that code into the trusted
computing base; the exact build fingerprint separates its cache identity but
does not sandbox it, sign it, or attest mutable closure state.

| Package/path family | SQL path | Result |
|---|---|---|
| `graphile-i18n` | Raw runtime translation query | Fixed: schema/table/type/column identifiers use `@pgsql/quotes`; values are bound; execution uses request `pgSettings`; locale type state is per build. |
| `graphile-llm` agent discovery | Raw control-metadata query and cache | Fixed: database ID is required, query-filtered, and part of the cache key. Missing identity fails closed. |
| `graphile-llm` RAG/metering | Raw chunk search and usage SQL | Fixed/retained: chunk relations are schema-qualified with quoted identifiers; vector and limits are values; runtime calls carry request `pgSettings`. |
| `graphile-search` BM25 | `pg-sql2` expressions with index-name bind values | Fixed: `to_bm25query` receives the physical schema-qualified index name. BM25 remains enabled because no tenant-schema rewrite occurs. |
| `graphile-search` tsvector/trigram/vector | `pg-sql2` expressions | Acceptable by construction: catalog-derived relation/column/type names use `sql.identifier`; request terms, vectors, limits, and thresholds use values. Must still run in the capability fixture. |
| `graphile-ltree`, `graphile-postgis`, `graphile-connection-filter`, `graphile-pg-aggregates` | Generated `pg-sql2` fragments | Acceptable by construction: dynamic identifiers use `sql.identifier`, while user inputs use `sql.value`. Must still run against quoted physical schemas. |
| `graphile-bulk-mutations` | Generated mutation plans and relation fragments | No tenant routing substitution exists; identifiers come from the introspected build. Full insert/update/upsert/delete behavior remains an integration gate. |
| `graphile-history` | Raw SELECT/UPDATE/INSERT SQL | Request-scoped and parameterized; schema/table/columns are quoted from the current build's codec/tag metadata. Integration coverage remains required. |
| `graphile-function-bindings` | QueryBuilder insert into configured invocation relation | Runtime inserts are request-scoped; schema/table and columns originate in the database-scoped compute-module configuration and values are bound. The optional generic gather fallback has one build-lane `withPgClientFromPgService(pgService, null, ...)` call against the exact build service, but Constructive supplies an authoritative control-plane binding snapshot and does not enter that branch. Integration coverage remains required. |
| `graphile-bucket-provisioner-plugin` | Raw storage metadata and bucket SQL | Metadata and bucket authorization run with request settings and are database-ID filtered; table identifiers are qualified with `@pgsql/quotes`. One request-triggered system-lane call records `physical_name` after the request-scoped lookup and S3 provision: the exact qualified table, authorized bucket UUID, physical pool, and `physical_name IS NULL` guard bound the write, while the baseline role supplies the deliberate bookkeeping privilege. S3 side effects and those grants remain an explicit integration gate. |
| `graphile-presigned-url-plugin` | Raw metadata, bucket, and file SQL | Fixed: Constructive supplies an immutable exact-build control-plane snapshot, including an authoritative empty list when storage is absent. The generic package fallback now carries the exact request `pgSettings`; missing context/settings, database identity, module metadata, bucket visibility, and lookup errors all fail before signing, and a metadata failure cannot select process-global S3 configuration. Global S3 values may fill nullable fields only after a tenant module and persisted physical bucket coordinate have resolved. One deliberate system-lane call remains to record a newly provisioned bucket's `physical_name`, with the same exact-table/UUID/null-guard constraints as the provisioner plugin. Hostile A/B/C storage and S3-side-effect tests remain a production gate. |
| `graphile-settings/PublicKeySignature` | Three raw auth-function paths | Fixed: every plan reads Grafast `pgSettings`, copies the complete request GUC map, explicitly overrides only `role` to `anonymous`, and fails closed if either request settings or `withPgClient` is absent. Queries now use the native Graphile client API inside the transaction established by `withPgClient`, so there is no nested manual transaction or null-context checkout. Identifier validation and qualification remain in place; real auth-function/RLS integration is still required. |
| `graphile-meta` | Build-time Graphile metadata collection | Current `main` already replaced the old module-global table array with schema/build-local state during extraction to `graphile-meta`; no additional port was needed. |

The post-fix null-context inventory is three deliberate product-source lanes:

- `graphile-presigned-url-plugin` performs one request-triggered system write that records an already-authorized bucket's persisted physical coordinate.
- `graphile-bucket-provisioner-plugin` uses the same system write pattern for explicit and automatic provisioning.
- `graphile-function-bindings` has one schema-gather fallback against the exact build's PostgreSQL service; Constructive's preloaded control-plane snapshot bypasses it.

No request metadata, file/bucket authorization, signing, public-key auth, history, search, i18n, LLM/RAG, realtime visibility, or function-invocation path uses a null context. Test utilities use null or synthetic settings by design and are outside the product-source inventory.

Prepared-statement sanitation was checked against the installed `@dataplan/pg` adaptor: it stores its LRU at `connection._graphilePreparedStatementCache` and node-postgres stores names at `connection.parsedStatements`, which are the two client-side structures cleared after `DISCARD ALL`. The performance cost of discarding prepared plans on every checkout remains a benchmark question, not a claimed free safety measure.
