# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.21.1](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.21.0...graphile-presigned-url-plugin@0.21.1) (2026-07-11)

**Note:** Version bump only for package graphile-presigned-url-plugin

# [0.21.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.20.2...graphile-presigned-url-plugin@0.21.0) (2026-06-28)

**Note:** Version bump only for package graphile-presigned-url-plugin

## [0.20.2](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.20.1...graphile-presigned-url-plugin@0.20.2) (2026-06-22)

**Note:** Version bump only for package graphile-presigned-url-plugin

## [0.20.1](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.20.0...graphile-presigned-url-plugin@0.20.1) (2026-06-18)

**Note:** Version bump only for package graphile-presigned-url-plugin

# [0.20.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.19.2...graphile-presigned-url-plugin@0.20.0) (2026-05-30)

### Bug Fixes

- rename membershipType to scope in storage plugin interfaces ([f7ffb26](https://github.com/constructive-io/constructive/commit/f7ffb26dc1924514a59f7f41a4f56d64556d0dd6))
- update storage plugins to use scope instead of membership_type ([5c4cd30](https://github.com/constructive-io/constructive/commit/5c4cd30c08d541f3e9b0c22d31cf39a977599615))

## [0.19.2](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.19.1...graphile-presigned-url-plugin@0.19.2) (2026-05-29)

**Note:** Version bump only for package graphile-presigned-url-plugin

## [0.19.1](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.19.0...graphile-presigned-url-plugin@0.19.1) (2026-05-21)

**Note:** Version bump only for package graphile-presigned-url-plugin

# [0.19.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.18.0...graphile-presigned-url-plugin@0.19.0) (2026-05-14)

**Note:** Version bump only for package graphile-presigned-url-plugin

# [0.18.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.17.1...graphile-presigned-url-plugin@0.18.0) (2026-05-13)

### Bug Fixes

- scope BucketNameResolver to (databaseId, bucketKey) ([304d201](https://github.com/constructive-io/constructive/commit/304d201a03bd5fcc059566c373ccf6465b134489))

### BREAKING CHANGES

- custom resolveBucketName callbacks must now accept
  (databaseId: string, bucketKey: string) instead of (databaseId: string).

## [0.17.1](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.17.0...graphile-presigned-url-plugin@0.17.1) (2026-05-11)

**Note:** Version bump only for package graphile-presigned-url-plugin

# [0.17.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.16.1...graphile-presigned-url-plugin@0.17.0) (2026-05-11)

**Note:** Version bump only for package graphile-presigned-url-plugin

## [0.16.1](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.16.0...graphile-presigned-url-plugin@0.16.1) (2026-05-09)

**Note:** Version bump only for package graphile-presigned-url-plugin

# [0.16.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.15.1...graphile-presigned-url-plugin@0.16.0) (2026-05-09)

### Features

- **presigned-url:** enforce bulk upload limits (maxBulkFiles + maxBulkTotalSize) ([8c0be4a](https://github.com/constructive-io/constructive/commit/8c0be4a0651793eb119e7770fc5942a3bdd00dc9))

## [0.15.1](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.15.0...graphile-presigned-url-plugin@0.15.1) (2026-05-08)

**Note:** Version bump only for package graphile-presigned-url-plugin

# [0.15.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.14.1...graphile-presigned-url-plugin@0.15.0) (2026-05-08)

**Note:** Version bump only for package graphile-presigned-url-plugin

## [0.14.1](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.14.0...graphile-presigned-url-plugin@0.14.1) (2026-05-08)

### Bug Fixes

- **presigned-url:** match files→buckets by table name prefix instead of schema name ([7fd3cca](https://github.com/constructive-io/constructive/commit/7fd3ccac49f313a98e9fbe98850426888f658869))

# [0.14.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.13.0...graphile-presigned-url-plugin@0.14.0) (2026-05-08)

### Bug Fixes

- **presigned-url:** rename createFile -> uploadFile to avoid CRUD naming conflict ([9b8fb0a](https://github.com/constructive-io/constructive/commit/9b8fb0ad3c9971c2a71527f4e9f78a8bf232fdee))

### Features

- **presigned-url:** add createFile mutations alongside bucket entry points ([b22fc31](https://github.com/constructive-io/constructive/commit/b22fc3138b5dbb01b737adf319fafa8535364763))

# [0.13.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.12.2...graphile-presigned-url-plugin@0.13.0) (2026-05-08)

**Note:** Version bump only for package graphile-presigned-url-plugin

## [0.12.2](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.12.1...graphile-presigned-url-plugin@0.12.2) (2026-05-08)

### Bug Fixes

- **presigned-url:** use correct GraphQL type for ownerId argument ([22e5252](https://github.com/constructive-io/constructive/commit/22e52529a7c8d19d84f6b72866cafa09b7288fa5))
- **presigned-url:** use extensions.pg.name for codec table name matching ([b60a855](https://github.com/constructive-io/constructive/commit/b60a855c784809c564c62bc26823767cbeb792d2))

## [0.12.1](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.12.0...graphile-presigned-url-plugin@0.12.1) (2026-05-08)

### Bug Fixes

- **presigned-url:** return PgSelectSingleStep from mutation entry points ([c924768](https://github.com/constructive-io/constructive/commit/c924768d99fc413e8fcfbe9ae1a43a9aac60c4ff))

# [0.12.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.11.0...graphile-presigned-url-plugin@0.12.0) (2026-05-08)

### Features

- **presigned-url:** add per-bucket mutation entry points on root Mutation type ([a8811be](https://github.com/constructive-io/constructive/commit/a8811be6c48ba7008d78d2e3724df5000226db35))

# [0.11.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.10.0...graphile-presigned-url-plugin@0.11.0) (2026-05-07)

### Features

- per-table storage middleware — upload fields on bucket types, delete middleware on file tables ([5003dc5](https://github.com/constructive-io/constructive/commit/5003dc5d85d21d5042572071b22fad1654f36881))

# [0.10.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.9.0...graphile-presigned-url-plugin@0.10.0) (2026-05-06)

**Note:** Version bump only for package graphile-presigned-url-plugin

# [0.9.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.8.0...graphile-presigned-url-plugin@0.9.0) (2026-05-05)

### Features

- add allow_custom_keys support, requestBulkUploadUrls mutation, auto-path derivation ([3f2554e](https://github.com/constructive-io/constructive/commit/3f2554edccb12aee16eb7952a5928d1e7afac1cd))

# [0.8.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.7.0...graphile-presigned-url-plugin@0.8.0) (2026-05-03)

### Bug Fixes

- update snapshots, tests, and seeds for storage simplification ([9b1a48a](https://github.com/constructive-io/constructive/commit/9b1a48ae65add780c0d005f8912cf70a4d7af078))

### Features

- remove confirmUpload, upload_requests, files.status — simplify storage ([e3c516d](https://github.com/constructive-io/constructive/commit/e3c516d35fe05a35b5117c2756bd1363872eafe1))

# [0.7.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.6.5...graphile-presigned-url-plugin@0.7.0) (2026-04-29)

### Features

- add status field to RequestUploadUrlPayload ([c61b5e9](https://github.com/constructive-io/constructive/commit/c61b5e9eef9a4e2f86ab859bd7f599f4abf8264d))

## [0.6.5](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.6.4...graphile-presigned-url-plugin@0.6.5) (2026-04-28)

**Note:** Version bump only for package graphile-presigned-url-plugin

## [0.6.4](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.6.3...graphile-presigned-url-plugin@0.6.4) (2026-04-27)

**Note:** Version bump only for package graphile-presigned-url-plugin

## [0.6.3](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.6.2...graphile-presigned-url-plugin@0.6.3) (2026-04-20)

### Bug Fixes

- use Grafast plan() instead of resolve() for downloadUrl field ([b06932e](https://github.com/constructive-io/constructive/commit/b06932ecfc32426ceed822ced320728aed69eff0))

## [0.6.2](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.6.1...graphile-presigned-url-plugin@0.6.2) (2026-04-19)

### Bug Fixes

- also remove size from dedup upload_requests INSERT ([9e1579d](https://github.com/constructive-io/constructive/commit/9e1579ddc88272152185804b95bca971842d20c1))
- remove non-existent 'size' column from upload_requests INSERT ([da7d796](https://github.com/constructive-io/constructive/commit/da7d796be36a054864dc5bfa78c19f1c96e62dc2))

## [0.6.1](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.6.0...graphile-presigned-url-plugin@0.6.1) (2026-04-19)

### Bug Fixes

- align plugin SQL with actual DB schema (mime_type, no content_hash on files) ([7e9f539](https://github.com/constructive-io/constructive/commit/7e9f5391b801b46ee7c05ac5eaebe85806fa48c0))

# [0.6.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.5.0...graphile-presigned-url-plugin@0.6.0) (2026-04-19)

### Bug Fixes

- backward-compatible SQL queries for legacy schema (no membership_type column) ([348e408](https://github.com/constructive-io/constructive/commit/348e408ccac7444793dcd148a67b6490cf6dc9fd))
- use SAVEPOINT for schema probe queries to avoid poisoning PG transactions ([3865697](https://github.com/constructive-io/constructive/commit/3865697ea7a0271f1e8a25963c071fb1ff3f9a92))

### Features

- multi-scope bucket resolution (Option C: bucketKey + ownerId) ([9968adf](https://github.com/constructive-io/constructive/commit/9968adf8dd53d41cca7875f4008b8992cc53cc82)), closes [#876](https://github.com/constructive-io/constructive/issues/876)

# [0.5.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.4.1...graphile-presigned-url-plugin@0.5.0) (2026-04-18)

**Note:** Version bump only for package graphile-presigned-url-plugin

## [0.4.1](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.4.0...graphile-presigned-url-plugin@0.4.1) (2026-04-11)

### Bug Fixes

- use @dataplan/pg query object format and withTransaction for presigned URL plugin ([1a55e6a](https://github.com/constructive-io/constructive/commit/1a55e6aa0856c589c7d6e0ca8c8b339736e029da))

# [0.4.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.3.0...graphile-presigned-url-plugin@0.4.0) (2026-04-09)

### Bug Fixes

- wire per-database allowed_origins into lazy bucket provisioner ([eea70d2](https://github.com/constructive-io/constructive/commit/eea70d23c64a4ee063348700acaa5f5e4bbebb00))

### Features

- lazy S3 bucket provisioning on first upload ([a03ee0f](https://github.com/constructive-io/constructive/commit/a03ee0faa28d4dd63f3781e3e8c453d263ee8a1a))
- wire per-database S3 bucket name and publicUrlPrefix into presigned URL plugin ([526d676](https://github.com/constructive-io/constructive/commit/526d676a10b25b5bbdf653cd114fc31263435c3b))

# [0.3.0](https://github.com/constructive-io/constructive/compare/graphile-presigned-url-plugin@0.2.0...graphile-presigned-url-plugin@0.3.0) (2026-04-04)

### Bug Fixes

- make S3Config lazy — resolve on first use, not at import time ([4194c45](https://github.com/constructive-io/constructive/commit/4194c45d53c58a8f6a03637cce68e72c049cf430))
- remove --experimental-vm-modules, rely on @smithy/node-http-handler pin from PR [#951](https://github.com/constructive-io/constructive/issues/951) ([84daae9](https://github.com/constructive-io/constructive/commit/84daae924f6e18f3e1570dcfdde72086ba6073c1))

### Features

- read endpoint, public_url_prefix, provider from storage_module ([122eb8e](https://github.com/constructive-io/constructive/commit/122eb8e4ff0765c521395bc67634044805164e8e))

# 0.2.0 (2026-04-01)

### Bug Fixes

- add explicit transaction management (BEGIN/COMMIT/ROLLBACK) + sanitize filename in Content-Disposition ([a17dec9](https://github.com/constructive-io/constructive/commit/a17dec99130b8bcfb2f7b945f1c9387c8d18fdac))
- replace duck-typing with [@storage](https://github.com/storage)Files smart tag for downloadUrl detection ([b677569](https://github.com/constructive-io/constructive/commit/b6775696914a78646813c7a3a65b169e06e6779f))
- Use jwt_private.current_database_id() instead of querying metaschema_public.database ([ebea118](https://github.com/constructive-io/constructive/commit/ebea1183c5061235b5c58293fa1b365b5d3fcb6c))

### Features

- add LRU bucket metadata cache to presigned-url-plugin ([c015745](https://github.com/constructive-io/constructive/commit/c015745a92439206e348517d9fe941ea7c7a7833))
- graphile-presigned-url-plugin — requestUploadUrl, confirmUpload mutations + downloadUrl field ([7276344](https://github.com/constructive-io/constructive/commit/7276344a85273d7c99a92fc8addfcb782b76237d))
