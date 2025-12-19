# Diff — `M` `FOOTER.md`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+17/-17`
- Reproduce: `git diff main...HEAD -- FOOTER.md`

## Guideline token summary
- Deltas: `launchql`: 9 → 0; `@constructive-io/`: 0 → 8; `constructive`: 43 → 51; `@launchql/`: 3 → 0; `Constructive`: 2 → 3; `LaunchQL`: 1 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

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
