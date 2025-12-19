# Diff — `M` `README.md`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+37/-37`
- Reproduce: `git diff main...HEAD -- README.md`

## Guideline token summary
- Deltas: `launchql`: 15 → 0; `@constructive-io/`: 0 → 13; `constructive`: 86 → 99; `@launchql/`: 11 → 0; `Constructive`: 12 → 13; `LaunchQL`: 1 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

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
