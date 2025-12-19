# Snapshot checklist — `refactor/ensure-new-name-mappings` vs `main`

## Notes
- Jest snapshots are high-signal; review these carefully.
- Content changes link to `review-checklists/diffs/` files with Prev/Next navigation.

## Snapshot content changes (10)
- [ ] `M` `packages/cli/__tests__/__snapshots__/add.test.ts.snap` — diff: [M_d3c17cd8814b.md](diffs/M_d3c17cd8814b.md)
- [ ] `M` `packages/cli/__tests__/__snapshots__/init.install.test.ts.snap` — diff: [M_48805f780565.md](diffs/M_48805f780565.md)
- [ ] `A` `pgpm/core/__tests__/core/__snapshots__/plan-writing.test.ts.snap` — diff: [A_ba7ad044fe2c.md](diffs/A_ba7ad044fe2c.md)
- [ ] `D` `packages/core/__tests__/core/__snapshots__/plan-writing.test.ts.snap` — diff: [D_60d8d90811f6.md](diffs/D_60d8d90811f6.md)
- [ ] `R053` `packages/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap` → `pgpm/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap` — diff: [R053_dd6fedbb2e8a.md](diffs/R053_dd6fedbb2e8a.md)
- [ ] `R096` `packages/core/__tests__/core/__snapshots__/workspace-extensions-dependency-order.test.ts.snap` → `pgpm/core/__tests__/core/__snapshots__/workspace-extensions-dependency-order.test.ts.snap` — diff: [R096_0f47d0214543.md](diffs/R096_0f47d0214543.md)
- [ ] `R057` `packages/core/__tests__/files/plan/__snapshots__/module-plan-generation.test.ts.snap` → `pgpm/core/__tests__/files/plan/__snapshots__/module-plan-generation.test.ts.snap` — diff: [R057_329fe5d77d48.md](diffs/R057_329fe5d77d48.md)
- [ ] `R054` `packages/core/__tests__/files/plan/__snapshots__/stage-unique-names-plan.test.ts.snap` → `pgpm/core/__tests__/files/plan/__snapshots__/stage-unique-names-plan.test.ts.snap` — diff: [R054_c0b825129654.md](diffs/R054_c0b825129654.md)
- [ ] `R089` `packages/core/__tests__/modules/__snapshots__/module-installation.test.ts.snap` → `pgpm/core/__tests__/modules/__snapshots__/module-installation.test.ts.snap` — diff: [R089_f827260d9159.md](diffs/R089_f827260d9159.md)
- [ ] `R080` `packages/core/__tests__/resolution/__snapshots__/dependency-resolution-error-handling.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/dependency-resolution-error-handling.test.ts.snap` — diff: [R080_c09609f903d7.md](diffs/R080_c09609f903d7.md)

## Snapshot rename/move only (39)
<details>
<summary>Show 39 rename-only snapshot paths</summary>

- [ ] `R100` `packages/content-type-stream/__tests__/__snapshots__/mimetypes.test.ts.snap` → `streaming/content-type-stream/__tests__/__snapshots__/mimetypes.test.ts.snap` (module `packages/content-type-stream`)
- [ ] `R100` `packages/core/__tests__/core/__snapshots__/module-extensions.test.ts.snap` → `pgpm/core/__tests__/core/__snapshots__/module-extensions.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/core/__tests__/files/plan/__snapshots__/plan-parsing-invalid-fixtures.test.ts.snap` → `pgpm/core/__tests__/files/plan/__snapshots__/plan-parsing-invalid-fixtures.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/core/__tests__/modules/__snapshots__/module-packaging-tags.test.ts.snap` → `pgpm/core/__tests__/modules/__snapshots__/module-packaging-tags.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/core/__tests__/modules/__snapshots__/module-packaging.test.ts.snap` → `pgpm/core/__tests__/modules/__snapshots__/module-packaging.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/core/__tests__/modules/__snapshots__/module-publishing.test.ts.snap` → `pgpm/core/__tests__/modules/__snapshots__/module-publishing.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/core/__tests__/projects/__snapshots__/deploy-failure-scenarios.test.ts.snap` → `pgpm/core/__tests__/projects/__snapshots__/deploy-failure-scenarios.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/core/__tests__/resolution/__snapshots__/dependency-resolution-basic.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/dependency-resolution-basic.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/core/__tests__/resolution/__snapshots__/dependency-resolution-internal-tags.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/dependency-resolution-internal-tags.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/core/__tests__/resolution/__snapshots__/dependency-resolution-resolved-tags.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/dependency-resolution-resolved-tags.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/core/__tests__/resolution/__snapshots__/dependency-resolution-with-tags.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/dependency-resolution-with-tags.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/core/__tests__/resolution/__snapshots__/sql-script-resolution-cross-dependencies.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/sql-script-resolution-cross-dependencies.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/core/__tests__/workspace/__snapshots__/module-utilities.test.ts.snap` → `pgpm/core/__tests__/workspace/__snapshots__/module-utilities.test.ts.snap` (module `packages/core`)
- [ ] `R100` `packages/etag-hash/__tests__/__snapshots__/etag-hash.test.ts.snap` → `streaming/etag-hash/__tests__/__snapshots__/etag-hash.test.ts.snap` (module `packages/etag-hash`)
- [ ] `R100` `packages/etag-stream/__tests__/__snapshots__/etag-stream.test.ts.snap` → `streaming/etag-stream/__tests__/__snapshots__/etag-stream.test.ts.snap` (module `packages/etag-stream`)
- [ ] `R100` `packages/introspectron/__tests__/__snapshots__/gql.test.ts.snap` → `postgres/introspectron/__tests__/__snapshots__/gql.test.ts.snap` (module `packages/introspectron`)
- [ ] `R100` `packages/introspectron/__tests__/__snapshots__/introspect.test.ts.snap` → `postgres/introspectron/__tests__/__snapshots__/introspect.test.ts.snap` (module `packages/introspectron`)
- [ ] `R100` `packages/launchql-gen/__tests__/__snapshots__/codegen.fixtures.test.ts.snap` → `graphql/codegen/__tests__/__snapshots__/codegen.fixtures.test.ts.snap` (module `packages/launchql-gen`)
- [ ] `R100` `packages/launchql-gen/__tests__/__snapshots__/codegen.test.ts.snap` → `graphql/codegen/__tests__/__snapshots__/codegen.test.ts.snap` (module `packages/launchql-gen`)
- [ ] `R100` `packages/launchql-gen/__tests__/__snapshots__/granular.test.ts.snap` → `graphql/codegen/__tests__/__snapshots__/granular.test.ts.snap` (module `packages/launchql-gen`)
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.graphile-tx.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.graphile-tx.test.ts.snap` (module `packages/launchql-test`)
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.graphql.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.graphql.test.ts.snap` (module `packages/launchql-test`)
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.roles.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.roles.test.ts.snap` (module `packages/launchql-test`)
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.test.ts.snap` (module `packages/launchql-test`)
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.types.positional.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.types.positional.test.ts.snap` (module `packages/launchql-test`)
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.types.positional.unwrapped.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.types.positional.unwrapped.test.ts.snap` (module `packages/launchql-test`)
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.types.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.types.test.ts.snap` (module `packages/launchql-test`)
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.types.unwrapped.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.types.unwrapped.test.ts.snap` (module `packages/launchql-test`)
- [ ] `R100` `packages/mime-bytes/__tests__/fixtures/__snapshots__/kitchen-sink.test.ts.snap` → `streaming/mime-bytes/__tests__/fixtures/__snapshots__/kitchen-sink.test.ts.snap` (module `packages/mime-bytes`)
- [ ] `R100` `packages/mime-bytes/__tests__/fixtures/__snapshots__/malicious.test.ts.snap` → `streaming/mime-bytes/__tests__/fixtures/__snapshots__/malicious.test.ts.snap` (module `packages/mime-bytes`)
- [ ] `R100` `packages/pg-ast/__tests__/__snapshots__/pg-ast.test.ts.snap` → `postgres/pg-ast/__tests__/__snapshots__/pg-ast.test.ts.snap` (module `packages/pg-ast`)
- [ ] `R100` `packages/pg-codegen/__tests__/__snapshots__/codegen.test.ts.snap` → `postgres/pg-codegen/__tests__/__snapshots__/codegen.test.ts.snap` (module `packages/pg-codegen`)
- [ ] `R100` `packages/query/__tests__/__snapshots__/builder.test.ts.snap` → `graphql/query/__tests__/__snapshots__/builder.test.ts.snap` (module `packages/query`)
- [ ] `R100` `packages/query/__tests__/__snapshots__/meta-object.test.ts.snap` → `graphql/query/__tests__/__snapshots__/meta-object.test.ts.snap` (module `packages/query`)
- [ ] `R100` `packages/s3-streamer/__tests__/__snapshots__/uploads.test.ts.snap` → `streaming/s3-streamer/__tests__/__snapshots__/uploads.test.ts.snap` (module `packages/s3-streamer`)
- [ ] `R100` `packages/stream-to-etag/__tests__/__snapshots__/stream-to-etag.test.ts.snap` → `streaming/stream-to-etag/__tests__/__snapshots__/stream-to-etag.test.ts.snap` (module `packages/stream-to-etag`)
- [ ] `R100` `packages/upload-names/__tests__/__snapshots__/names.test.ts.snap` → `streaming/upload-names/__tests__/__snapshots__/names.test.ts.snap` (module `packages/upload-names`)
- [ ] `R100` `packages/uuid-hash/__tests__/__snapshots__/uuid-hash.test.ts.snap` → `streaming/uuid-hash/__tests__/__snapshots__/uuid-hash.test.ts.snap` (module `packages/uuid-hash`)
- [ ] `R100` `packages/uuid-stream/__tests__/__snapshots__/uuid-stream.test.ts.snap` → `streaming/uuid-stream/__tests__/__snapshots__/uuid-stream.test.ts.snap` (module `packages/uuid-stream`)

</details>
