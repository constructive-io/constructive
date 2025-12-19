# Diff — `M` `FOOTER.md`

## Navigation
- Prev: [M_db8d645b2a0e.md](M_db8d645b2a0e.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_bf0858a90f30.md](M_bf0858a90f30.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `ROOT`
- Numstat: `+17/-17`
- Reproduce: `git diff main...HEAD -- FOOTER.md`

## Changes (line-aligned)
- `* [pgsql-test](https://github.com/constructive-io/constructive/tree/main/postgres/pgsql-test): **📊 Isolated testing environments** with per-test transaction rollbacks—ideal for integration tests, com…`
  - `packages` → `postgres`
- `* [supabase-test](https://github.com/constructive-io/constructive/tree/main/postgres/supabase-test): **🧪 Supabase-native test harness** preconfigured for the local Supabase stack—per-test rollbacks, …`
  - `packages` → `postgres`
- `* [graphile-test](https://github.com/constructive-io/constructive/tree/main/graphile/graphile-test): **🔐 Authentication mocking** for Graphile-focused test helpers and emulating row-level security co…`
  - `packages` → `graphile`
- ``* [pg-query-context](https://github.com/constructive-io/constructive/tree/main/postgres/pg-query-context): **🔒 Session context injection** to add session-local context (e.g., `SET LOCAL`) into querie…``
  - `packages` → `postgres`
- `* [@constructive-io/graphql-server](https://github.com/constructive-io/constructive/tree/main/graphql/server): **⚡ Express-based API server** powered by PostGraphile to expose a secure, scalable Grap…`
  - `* [launchql` → `* [@constructive-io`
  - `` → `graphql-`
  - `packages` → `graphql`
- `* [@constructive-io/graphql-explorer](https://github.com/constructive-io/constructive/tree/main/graphql/explorer): **🔎 Visual API explorer** with GraphiQL for browsing across all databases and schema…`
  - `* [launchql` → `* [@constructive-io`
  - `` → `graphql-`
  - `packages` → `graphql`
- `* [etag-hash](https://github.com/constructive-io/constructive/tree/main/streaming/etag-hash): **🏷️ S3-compatible ETags** created by streaming and hashing file uploads in chunks.`
  - `packages` → `streaming`
- `* [etag-stream](https://github.com/constructive-io/constructive/tree/main/streaming/etag-stream): **🔄 ETag computation** via Node stream transformer during upload or transfer.`
  - `packages` → `streaming`
- `* [uuid-hash](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-hash): **🆔 Deterministic UUIDs** generated from hashed content, great for deduplication and asset referencing.`
  - `packages` → `streaming`
- `* [uuid-stream](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-stream): **🌊 Streaming UUID generation** based on piped file content—ideal for upload pipelines.`
  - `packages` → `streaming`
- `* [@constructive-io/s3-streamer](https://github.com/constructive-io/constructive/tree/main/streaming/s3-streamer): **📤 Direct S3 streaming** for large files with support for metadata injection and co…`
  - `* [launchql` → `* [@constructive-io`
  - `packages` → `streaming`
- `* [@constructive-io/upload-names](https://github.com/constructive-io/constructive/tree/main/streaming/upload-names): **📂 Collision-resistant filenames** utility for structured and unique file names f…`
  - `* [launchql` → `* [@constructive-io`
  - `packages` → `streaming`
- `* [pgpm](https://github.com/constructive-io/constructive/tree/main/pgpm/pgpm): **🖥️ PostgreSQL Package Manager** for modular Postgres development. Works with database workspaces, scaffolding, migrati…`
  - `packages` → `pgpm`
- `* [@constructive-io/cli](https://github.com/constructive-io/constructive/tree/main/packages/cli): **🖥️ Command-line toolkit** for managing Constructive projects—supports database scaffolding, migrati…`
  - `launchql` → `constructive-io`
  - `LaunchQL` → `Constructive`
- `* [@constructive-io/graphql-codegen](https://github.com/constructive-io/constructive/tree/main/graphql/codegen): **✨ GraphQL code generation** (types, operations, SDK) from schema/endpoint introspect…`
  - `* [launchql` → `* [@constructive`
  - `gen` → `io/graphql-codegen`
  - `packages` → `graphql`
  - `launchql-gen` → `codegen`
  - `Auto-generated` → `GraphQL`
  - `GraphQL** mutations` → `code`
- `* [@constructive-io/query-builder](https://github.com/constructive-io/constructive/tree/main/packages/query-builder): **🏗️ SQL constructor** providing a robust TypeScript-based query builder for dyna…`
  - `launchql` → `constructive-io`
- `* [@constructive-io/graphql-query](https://github.com/constructive-io/constructive/tree/main/graphql/query): **🧩 Fluent GraphQL builder** for PostGraphile schemas. ⚡ Schema-aware via introspection, 🧩…`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
  - `packages` → `graphql`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
* [pgsql-test](https://github.com/constructive-io/constructive/tree/main/packages/pgsql-test): **📊 Isolated testin |	* [pgsql-test](https://github.com/constructive-io/constructive/tree/main/postgres/pgsql-test): **📊 Isolated testin
* [supabase-test](https://github.com/constructive-io/constructive/tree/main/packages/supabase-test): **🧪 Supabase- |	* [supabase-test](https://github.com/constructive-io/constructive/tree/main/postgres/supabase-test): **🧪 Supabase-
* [graphile-test](https://github.com/constructive-io/constructive/tree/main/packages/graphile-test): **🔐 Authentic |	* [graphile-test](https://github.com/constructive-io/constructive/tree/main/graphile/graphile-test): **🔐 Authentic
* [pg-query-context](https://github.com/constructive-io/constructive/tree/main/packages/pg-query-context): **🔒 Ses |	* [pg-query-context](https://github.com/constructive-io/constructive/tree/main/postgres/pg-query-context): **🔒 Ses
* [launchql/server](https://github.com/constructive-io/constructive/tree/main/packages/server): **⚡ Express-based A |	* [@constructive-io/graphql-server](https://github.com/constructive-io/constructive/tree/main/graphql/server): **⚡ 
* [launchql/explorer](https://github.com/constructive-io/constructive/tree/main/packages/explorer): **🔎 Visual API |	* [@constructive-io/graphql-explorer](https://github.com/constructive-io/constructive/tree/main/graphql/explorer): **
* [etag-hash](https://github.com/constructive-io/constructive/tree/main/packages/etag-hash): **🏷️ S3-compatible  |	* [etag-hash](https://github.com/constructive-io/constructive/tree/main/streaming/etag-hash): **🏷️ S3-compatible
* [etag-stream](https://github.com/constructive-io/constructive/tree/main/packages/etag-stream): **🔄 ETag computat |	* [etag-stream](https://github.com/constructive-io/constructive/tree/main/streaming/etag-stream): **🔄 ETag computa
* [uuid-hash](https://github.com/constructive-io/constructive/tree/main/packages/uuid-hash): **🆔 Deterministic UUI |	* [uuid-hash](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-hash): **🆔 Deterministic UU
* [uuid-stream](https://github.com/constructive-io/constructive/tree/main/packages/uuid-stream): **🌊 Streaming UUI |	* [uuid-stream](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-stream): **🌊 Streaming UU
* [launchql/s3-streamer](https://github.com/constructive-io/constructive/tree/main/packages/s3-streamer): **📤 Dire |	* [@constructive-io/s3-streamer](https://github.com/constructive-io/constructive/tree/main/streaming/s3-streamer): **
* [launchql/upload-names](https://github.com/constructive-io/constructive/tree/main/packages/upload-names): **📂 Co |	* [@constructive-io/upload-names](https://github.com/constructive-io/constructive/tree/main/streaming/upload-names): 
* [pgpm](https://github.com/constructive-io/constructive/tree/main/packages/pgpm): **🖥️ PostgreSQL Package Manag |	* [pgpm](https://github.com/constructive-io/constructive/tree/main/pgpm/pgpm): **🖥️ PostgreSQL Package Manager**
* [@launchql/cli](https://github.com/constructive-io/constructive/tree/main/packages/cli): **🖥️ Command-line too |	* [@constructive-io/cli](https://github.com/constructive-io/constructive/tree/main/packages/cli): **🖥️ Command-l
* [launchql-gen](https://github.com/constructive-io/constructive/tree/main/packages/launchql-gen): **✨ Auto-generat |	* [@constructive-io/graphql-codegen](https://github.com/constructive-io/constructive/tree/main/graphql/codegen): **�
* [@launchql/query-builder](https://github.com/constructive-io/constructive/tree/main/packages/query-builder): **🏗 |	* [@constructive-io/query-builder](https://github.com/constructive-io/constructive/tree/main/packages/query-builder):
* [@launchql/query](https://github.com/constructive-io/constructive/tree/main/packages/query): **🧩 Fluent GraphQL  |	* [@constructive-io/graphql-query](https://github.com/constructive-io/constructive/tree/main/graphql/query): **🧩 F
```

</details>

## Navigation
- Prev: [M_db8d645b2a0e.md](M_db8d645b2a0e.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_bf0858a90f30.md](M_bf0858a90f30.md)
