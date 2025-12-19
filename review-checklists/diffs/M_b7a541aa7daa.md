# Diff — `M` `README.md`

## Navigation
- Prev: [M_60bc799fc10f.md](M_60bc799fc10f.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_66aa1acffcff.md](M_66aa1acffcff.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `ROOT`
- Numstat: `+37/-37`
- Reproduce: `git diff main...HEAD -- README.md`

## Changes (line-aligned)
- `**Learn more:** [pgpm documentation](https://github.com/constructive-io/constructive/tree/main/pgpm/pgpm)`
  - `packages` → `pgpm`
- `### 🖥️ Constructive CLI`
  - `LaunchQL` → `Constructive`
- `**Learn more:** [@constructive-io/cli documentation](https://github.com/constructive-io/constructive/tree/main/packages/cli)`
  - `launchql` → `constructive-io`
- `**Learn more:** [@constructive-io/graphql-server documentation](https://github.com/constructive-io/constructive/tree/main/graphql/server)`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
  - `packages` → `graphql`
- `- **[pgsql-test](https://github.com/constructive-io/constructive/tree/main/postgres/pgsql-test)** - Isolated PostgreSQL test environments with per-test transaction rollbacks`
  - `packages` → `postgres`
- `- **[graphile-test](https://github.com/constructive-io/constructive/tree/main/graphile/graphile-test)** - GraphQL testing utilities for PostGraphile projects`
  - `packages` → `graphile`
- `- **[supabase-test](https://github.com/constructive-io/constructive/tree/main/postgres/supabase-test)** - Supabase-optimized test harness with JWT helpers`
  - `packages` → `postgres`
- `- **[introspectron](https://github.com/constructive-io/constructive/tree/main/postgres/introspectron)** - PostgreSQL schema introspection`
  - `packages` → `postgres`
- `- **[@constructive-io/graphql-codegen](https://github.com/constructive-io/constructive/tree/main/graphql/codegen)** - GraphQL code generation (types, operations, SDK)`
  - `- **[launchql` → `- **[@constructive`
  - `gen` → `io/graphql-codegen`
  - `packages` → `graphql`
  - `launchql-gen` → `codegen`
  - `Auto-generated` → ``
  - `mutations` → `code`
- `- **[pg-codegen](https://github.com/constructive-io/constructive/tree/main/postgres/pg-codegen)** - TypeScript interfaces and classes from database tables`
  - `packages` → `postgres`
- `- **[@constructive-io/graphql-query](https://github.com/constructive-io/constructive/tree/main/graphql/query)** - Fluent GraphQL query builder for PostGraphile`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
  - `packages` → `graphql`
- `- **[@constructive-io/query-builder](https://github.com/constructive-io/constructive/tree/main/packages/query-builder)** - TypeScript SQL query builder`
  - `launchql` → `constructive-io`
- `- **[@constructive-io/s3-streamer](https://github.com/constructive-io/constructive/tree/main/streaming/s3-streamer)** - Direct S3 streaming with metadata injection`
  - `launchql` → `constructive-io`
  - `packages` → `streaming`
- `- **[etag-hash](https://github.com/constructive-io/constructive/tree/main/streaming/etag-hash)** - S3-compatible ETag computation`
  - `packages` → `streaming`
- `- **[uuid-hash](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-hash)** - Deterministic UUIDs from content hashing`
  - `packages` → `streaming`
- `- **[pg-ast](https://github.com/constructive-io/constructive/tree/main/postgres/pg-ast)** - AST construction and transformation utilities`
  - `packages` → `postgres`
- `- **[pgpm](https://github.com/constructive-io/constructive/tree/main/pgpm/pgpm)** - PostgreSQL Package Manager for modular database development with npm-style dependency management`
  - `packages` → `pgpm`
- `- **[@constructive-io/cli](https://github.com/constructive-io/constructive/tree/main/packages/cli)** - Full-featured command-line toolkit for Constructive projects with scaffolding, migrations, and d…`
  - `launchql` → `constructive-io`
- `- **[@pgpmjs/core](https://github.com/constructive-io/constructive/tree/main/pgpm/core)** - Core migration engine with module orchestration and dependency resolution`
  - `packages` → `pgpm`
- `- **[@constructive-io/graphql-server](https://github.com/constructive-io/constructive/tree/main/graphql/server)** - Express-based API server powered by PostGraphile with RLS integration and JWT authe…`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
  - `packages` → `graphql`
- `- **[@constructive-io/graphql-explorer](https://github.com/constructive-io/constructive/tree/main/graphql/explorer)** - GraphiQL interface for exploring your auto-generated GraphQL API`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
  - `packages` → `graphql`
- `- **[pgsql-test](https://github.com/constructive-io/constructive/tree/main/postgres/pgsql-test)** - Isolated PostgreSQL test environments with per-test transaction rollbacks and RLS simulation`
  - `packages` → `postgres`
- `- **[graphile-test](https://github.com/constructive-io/constructive/tree/main/graphile/graphile-test)** - GraphQL testing utilities for PostGraphile projects with snapshot support`
  - `packages` → `graphile`
- `- **[supabase-test](https://github.com/constructive-io/constructive/tree/main/postgres/supabase-test)** - Supabase-optimized test harness with JWT helpers and local stack integration`
  - `packages` → `postgres`
- `- **[pg-query-context](https://github.com/constructive-io/constructive/tree/main/postgres/pg-query-context)** - Session context injection for setting role, JWT claims, and session variables`
  - `packages` → `postgres`
- `- **[introspectron](https://github.com/constructive-io/constructive/tree/main/postgres/introspectron)** - PostgreSQL schema introspection for generating SDKs and metadata`
  - `packages` → `postgres`
- `- **[@constructive-io/graphql-codegen](https://github.com/constructive-io/constructive/tree/main/graphql/codegen)** - GraphQL code generation (types, operations, SDK) from schema/endpoint`
  - `- **[launchql` → `- **[@constructive`
  - `gen` → `io/graphql-codegen`
  - `packages` → `graphql`
  - `launchql-gen` → `codegen`
  - `Auto-generated` → ``
  - `mutations` → `code`
- `- **[pg-codegen](https://github.com/constructive-io/constructive/tree/main/postgres/pg-codegen)** - TypeScript interfaces and classes generated from PostgreSQL tables`
  - `packages` → `postgres`
- `- **[@constructive-io/graphql-query](https://github.com/constructive-io/constructive/tree/main/graphql/query)** - Fluent GraphQL query builder for PostGraphile schemas with schema-aware introspection`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
  - `packages` → `graphql`
- `- **[@constructive-io/query-builder](https://github.com/constructive-io/constructive/tree/main/packages/query-builder)** - TypeScript SQL query builder for SELECT, INSERT, UPDATE, DELETE with JOIN an…`
  - `launchql` → `constructive-io`
- `- **[@constructive-io/s3-streamer](https://github.com/constructive-io/constructive/tree/main/streaming/s3-streamer)** - Direct S3 streaming with automatic content-type detection and metadata extracti…`
  - `launchql` → `constructive-io`
  - `packages` → `streaming`
- `- **[etag-hash](https://github.com/constructive-io/constructive/tree/main/streaming/etag-hash)** - S3-compatible ETag computation for file integrity verification`
  - `packages` → `streaming`
- `- **[etag-stream](https://github.com/constructive-io/constructive/tree/main/streaming/etag-stream)** - Transform stream for computing ETags during upload`
  - `packages` → `streaming`
- `- **[uuid-hash](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-hash)** - Deterministic UUID generation from content hashing for deduplication`
  - `packages` → `streaming`
- `- **[uuid-stream](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-stream)** - Streaming UUID generation based on piped file content`
  - `packages` → `streaming`
- `- **[upload-names](https://github.com/constructive-io/constructive/tree/main/streaming/upload-names)** - Collision-resistant filename generation for structured uploads`
  - `packages` → `streaming`
- `- **[content-type-stream](https://github.com/constructive-io/constructive/tree/main/streaming/content-type-stream)** - MIME type detection via magic bytes during streaming`
  - `packages` → `streaming`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
**Learn more:** [pgpm documentation](https://github.com/constructive-io/constructive/tree/main/packages/pgpm)	      |	**Learn more:** [pgpm documentation](https://github.com/constructive-io/constructive/tree/main/pgpm/pgpm)
### 🖥️ LaunchQL CLI											      |	### 🖥️ Constructive CLI
**Learn more:** [@launchql/cli documentation](https://github.com/constructive-io/constructive/tree/main/packages/cli) |	**Learn more:** [@constructive-io/cli documentation](https://github.com/constructive-io/constructive/tree/main/packag
**Learn more:** [@launchql/server documentation](https://github.com/constructive-io/constructive/tree/main/packages/s |	**Learn more:** [@constructive-io/graphql-server documentation](https://github.com/constructive-io/constructive/tree/
- **[pgsql-test](https://github.com/constructive-io/constructive/tree/main/packages/pgsql-test)** - Isolated PostgreS |	- **[pgsql-test](https://github.com/constructive-io/constructive/tree/main/postgres/pgsql-test)** - Isolated PostgreS
- **[graphile-test](https://github.com/constructive-io/constructive/tree/main/packages/graphile-test)** - GraphQL tes |	- **[graphile-test](https://github.com/constructive-io/constructive/tree/main/graphile/graphile-test)** - GraphQL tes
- **[supabase-test](https://github.com/constructive-io/constructive/tree/main/packages/supabase-test)** - Supabase-op |	- **[supabase-test](https://github.com/constructive-io/constructive/tree/main/postgres/supabase-test)** - Supabase-op
- **[introspectron](https://github.com/constructive-io/constructive/tree/main/packages/introspectron)** - PostgreSQL  |	- **[introspectron](https://github.com/constructive-io/constructive/tree/main/postgres/introspectron)** - PostgreSQL 
- **[launchql-gen](https://github.com/constructive-io/constructive/tree/main/packages/launchql-gen)** - Auto-generate |	- **[@constructive-io/graphql-codegen](https://github.com/constructive-io/constructive/tree/main/graphql/codegen)** -
- **[pg-codegen](https://github.com/constructive-io/constructive/tree/main/packages/pg-codegen)** - TypeScript interf |	- **[pg-codegen](https://github.com/constructive-io/constructive/tree/main/postgres/pg-codegen)** - TypeScript interf
- **[@launchql/query](https://github.com/constructive-io/constructive/tree/main/packages/query)** - Fluent GraphQL qu |	- **[@constructive-io/graphql-query](https://github.com/constructive-io/constructive/tree/main/graphql/query)** - Flu
- **[@launchql/query-builder](https://github.com/constructive-io/constructive/tree/main/packages/query-builder)** - T |	- **[@constructive-io/query-builder](https://github.com/constructive-io/constructive/tree/main/packages/query-builder
- **[@launchql/s3-streamer](https://github.com/constructive-io/constructive/tree/main/packages/s3-streamer)** - Direc |	- **[@constructive-io/s3-streamer](https://github.com/constructive-io/constructive/tree/main/streaming/s3-streamer)**
- **[etag-hash](https://github.com/constructive-io/constructive/tree/main/packages/etag-hash)** - S3-compatible ETag  |	- **[etag-hash](https://github.com/constructive-io/constructive/tree/main/streaming/etag-hash)** - S3-compatible ETag
- **[uuid-hash](https://github.com/constructive-io/constructive/tree/main/packages/uuid-hash)** - Deterministic UUIDs |	- **[uuid-hash](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-hash)** - Deterministic UUID
- **[pg-ast](https://github.com/constructive-io/constructive/tree/main/packages/pg-ast)** - AST construction and tran |	- **[pg-ast](https://github.com/constructive-io/constructive/tree/main/postgres/pg-ast)** - AST construction and tran
- **[pgpm](https://github.com/constructive-io/constructive/tree/main/packages/pgpm)** - PostgreSQL Package Manager fo |	- **[pgpm](https://github.com/constructive-io/constructive/tree/main/pgpm/pgpm)** - PostgreSQL Package Manager for mo
- **[@launchql/cli](https://github.com/constructive-io/constructive/tree/main/packages/cli)** - Full-featured command |	- **[@constructive-io/cli](https://github.com/constructive-io/constructive/tree/main/packages/cli)** - Full-featured 
- **[@pgpmjs/core](https://github.com/constructive-io/constructive/tree/main/packages/core)** - Core migration engine |	- **[@pgpmjs/core](https://github.com/constructive-io/constructive/tree/main/pgpm/core)** - Core migration engine wit
- **[@launchql/server](https://github.com/constructive-io/constructive/tree/main/packages/server)** - Express-based A |	- **[@constructive-io/graphql-server](https://github.com/constructive-io/constructive/tree/main/graphql/server)** - E
- **[@launchql/explorer](https://github.com/constructive-io/constructive/tree/main/packages/explorer)** - GraphiQL in |	- **[@constructive-io/graphql-explorer](https://github.com/constructive-io/constructive/tree/main/graphql/explorer)**
- **[pgsql-test](https://github.com/constructive-io/constructive/tree/main/packages/pgsql-test)** - Isolated PostgreS |	- **[pgsql-test](https://github.com/constructive-io/constructive/tree/main/postgres/pgsql-test)** - Isolated PostgreS
- **[graphile-test](https://github.com/constructive-io/constructive/tree/main/packages/graphile-test)** - GraphQL tes |	- **[graphile-test](https://github.com/constructive-io/constructive/tree/main/graphile/graphile-test)** - GraphQL tes
- **[supabase-test](https://github.com/constructive-io/constructive/tree/main/packages/supabase-test)** - Supabase-op |	- **[supabase-test](https://github.com/constructive-io/constructive/tree/main/postgres/supabase-test)** - Supabase-op
- **[pg-query-context](https://github.com/constructive-io/constructive/tree/main/packages/pg-query-context)** - Sessi |	- **[pg-query-context](https://github.com/constructive-io/constructive/tree/main/postgres/pg-query-context)** - Sessi
- **[introspectron](https://github.com/constructive-io/constructive/tree/main/packages/introspectron)** - PostgreSQL  |	- **[introspectron](https://github.com/constructive-io/constructive/tree/main/postgres/introspectron)** - PostgreSQL 
- **[launchql-gen](https://github.com/constructive-io/constructive/tree/main/packages/launchql-gen)** - Auto-generate |	- **[@constructive-io/graphql-codegen](https://github.com/constructive-io/constructive/tree/main/graphql/codegen)** -
- **[pg-codegen](https://github.com/constructive-io/constructive/tree/main/packages/pg-codegen)** - TypeScript interf |	- **[pg-codegen](https://github.com/constructive-io/constructive/tree/main/postgres/pg-codegen)** - TypeScript interf
- **[@launchql/query](https://github.com/constructive-io/constructive/tree/main/packages/query)** - Fluent GraphQL qu |	- **[@constructive-io/graphql-query](https://github.com/constructive-io/constructive/tree/main/graphql/query)** - Flu
- **[@launchql/query-builder](https://github.com/constructive-io/constructive/tree/main/packages/query-builder)** - T |	- **[@constructive-io/query-builder](https://github.com/constructive-io/constructive/tree/main/packages/query-builder
- **[@launchql/s3-streamer](https://github.com/constructive-io/constructive/tree/main/packages/s3-streamer)** - Direc |	- **[@constructive-io/s3-streamer](https://github.com/constructive-io/constructive/tree/main/streaming/s3-streamer)**
- **[etag-hash](https://github.com/constructive-io/constructive/tree/main/packages/etag-hash)** - S3-compatible ETag  |	- **[etag-hash](https://github.com/constructive-io/constructive/tree/main/streaming/etag-hash)** - S3-compatible ETag
- **[etag-stream](https://github.com/constructive-io/constructive/tree/main/packages/etag-stream)** - Transform strea |	- **[etag-stream](https://github.com/constructive-io/constructive/tree/main/streaming/etag-stream)** - Transform stre
- **[uuid-hash](https://github.com/constructive-io/constructive/tree/main/packages/uuid-hash)** - Deterministic UUID  |	- **[uuid-hash](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-hash)** - Deterministic UUID
- **[uuid-stream](https://github.com/constructive-io/constructive/tree/main/packages/uuid-stream)** - Streaming UUID  |	- **[uuid-stream](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-stream)** - Streaming UUID
- **[upload-names](https://github.com/constructive-io/constructive/tree/main/packages/upload-names)** - Collision-res |	- **[upload-names](https://github.com/constructive-io/constructive/tree/main/streaming/upload-names)** - Collision-re
- **[content-type-stream](https://github.com/constructive-io/constructive/tree/main/packages/content-type-stream)** - |	- **[content-type-stream](https://github.com/constructive-io/constructive/tree/main/streaming/content-type-stream)**
```

</details>

## Navigation
- Prev: [M_60bc799fc10f.md](M_60bc799fc10f.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_66aa1acffcff.md](M_66aa1acffcff.md)
