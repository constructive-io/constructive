# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
