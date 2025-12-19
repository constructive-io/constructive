# Branch review checklists — `refactor/ensure-new-name-mappings` vs `main`

## Context
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Merge base (`main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Stats (merge-base diff): 1291 files changed, 15663 insertions(+), 10668 deletions(-)

## High-priority
- [ ] [Snapshot checklist](SNAPSHOTS.md) (10 content changes)
- [ ] [Diffs index](diffs/README.md) (325 diffs; matches Prev/Next)

## How to review
- Start from `SNAPSHOTS.md`, then open `diffs/README.md` and use Prev/Next navigation inside diff docs.
- Full diff (merge-base): `git diff -M main...HEAD`

## Modules
- [ ] [`packages/cli`](packages/cli.md) (M:27, D:1)
- [ ] [`packages/client`](packages/client.md) (M:3)
- [ ] [`packages/content-type-stream` → `streaming/content-type-stream`](packages/content-type-stream.md) (R:11)
- [ ] [`packages/core` → `pgpm/core`](packages/core.md) (R:135, A:2, D:2)
- [ ] [`packages/drizzle-orm-test` → `postgres/drizzle-orm-test`](packages/drizzle-orm-test.md) (R:11)
- [ ] [`packages/env` → `pgpm/env`](packages/env.md) (R:10)
- [ ] [`packages/etag-hash` → `streaming/etag-hash`](packages/etag-hash.md) (R:9)
- [ ] [`packages/etag-stream` → `streaming/etag-stream`](packages/etag-stream.md) (R:13)
- [ ] [`packages/explorer` → `graphql/explorer`](packages/explorer.md) (R:10, A:2, D:2)
- [ ] [`packages/gql-ast` → `graphql/gql-ast`](packages/gql-ast.md) (R:7)
- [ ] [`packages/introspectron` → `postgres/introspectron`](packages/introspectron.md) (R:24)
- [ ] [`packages/launchql-env` → `graphql/env`](packages/launchql-env.md) (R:6, A:2, D:2)
- [ ] [`packages/launchql-gen` → `graphql/codegen`](packages/launchql-gen.md) (R:27, A:1, D:1)
- [ ] [`packages/launchql-test` → `graphql/test`](packages/launchql-test.md) (R:31, A:1, D:1)
- [ ] [`packages/launchql-types` → `graphql/types`](packages/launchql-types.md) (R:7, A:1, D:1)
- [ ] [`packages/logger` → `pgpm/logger`](packages/logger.md) (R:8)
- [ ] [`packages/mime-bytes` → `streaming/mime-bytes`](packages/mime-bytes.md) (R:24)
- [ ] [`packages/orm`](packages/orm.md) (M:3)
- [ ] [`packages/pg-ast` → `postgres/pg-ast`](packages/pg-ast.md) (R:13)
- [ ] [`packages/pg-cache` → `postgres/pg-cache`](packages/pg-cache.md) (R:9)
- [ ] [`packages/pg-codegen` → `postgres/pg-codegen`](packages/pg-codegen.md) (R:15)
- [ ] [`packages/pg-env` → `postgres/pg-env`](packages/pg-env.md) (R:8)
- [ ] [`packages/pg-query-context` → `postgres/pg-query-context`](packages/pg-query-context.md) (R:7)
- [ ] [`packages/pgpm` → `pgpm/pgpm`](packages/pgpm.md) (R:54)
- [ ] [`packages/pgsql-test` → `postgres/pgsql-test`](packages/pgsql-test.md) (R:45, A:1, D:1)
- [ ] [`packages/query` → `graphql/query`](packages/query.md) (R:21)
- [ ] [`packages/query-builder`](packages/query-builder.md) (M:3)
- [ ] [`packages/react` → `graphql/react`](packages/react.md) (R:14, A:1, D:1)
- [ ] [`packages/s3-streamer` → `streaming/s3-streamer`](packages/s3-streamer.md) (R:11, A:1, D:1)
- [ ] [`packages/s3-utils` → `streaming/s3-utils`](packages/s3-utils.md) (R:9)
- [ ] [`packages/server` → `graphql/server`](packages/server.md) (R:24, A:1, D:1)
- [ ] [`packages/server-utils`](packages/server-utils.md) (M:2)
- [ ] [`packages/stream-to-etag` → `streaming/stream-to-etag`](packages/stream-to-etag.md) (R:13)
- [ ] [`packages/supabase-test` → `postgres/supabase-test`](packages/supabase-test.md) (R:10)
- [ ] [`packages/types` → `pgpm/types`](packages/types.md) (R:12)
- [ ] [`packages/upload-names` → `streaming/upload-names`](packages/upload-names.md) (R:10)
- [ ] [`packages/url-domains`](packages/url-domains.md) (M:3)
- [ ] [`packages/uuid-hash` → `streaming/uuid-hash`](packages/uuid-hash.md) (R:9)
- [ ] [`packages/uuid-stream` → `streaming/uuid-stream`](packages/uuid-stream.md) (R:9)
- [ ] [`.github/workflows`](github-workflows.md) (R:1, M:1)
- [ ] [`ROOT`](ROOT.md) (M:12)
- [ ] [`__fixtures__`](fixtures.md) (R:111, M:25)
- [ ] [`docker`](docker.md) (M:3)
- [ ] [`extensions`](extensions.md) (M:21)
- [ ] [`functions`](functions.md) (M:8)
- [ ] [`graphile`](graphile.md) (M:23)
- [ ] [`jobs`](jobs.md) (M:19)
- [ ] [`sandbox`](sandbox.md) (M:11)
