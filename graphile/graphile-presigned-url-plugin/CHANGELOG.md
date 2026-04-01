# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 0.2.0 (2026-04-01)

### Bug Fixes

- add explicit transaction management (BEGIN/COMMIT/ROLLBACK) + sanitize filename in Content-Disposition ([a17dec9](https://github.com/constructive-io/constructive/commit/a17dec99130b8bcfb2f7b945f1c9387c8d18fdac))
- replace duck-typing with [@storage](https://github.com/storage)Files smart tag for downloadUrl detection ([b677569](https://github.com/constructive-io/constructive/commit/b6775696914a78646813c7a3a65b169e06e6779f))
- Use jwt_private.current_database_id() instead of querying metaschema_public.database ([ebea118](https://github.com/constructive-io/constructive/commit/ebea1183c5061235b5c58293fa1b365b5d3fcb6c))

### Features

- add LRU bucket metadata cache to presigned-url-plugin ([c015745](https://github.com/constructive-io/constructive/commit/c015745a92439206e348517d9fe941ea7c7a7833))
- graphile-presigned-url-plugin — requestUploadUrl, confirmUpload mutations + downloadUrl field ([7276344](https://github.com/constructive-io/constructive/commit/7276344a85273d7c99a92fc8addfcb782b76237d))
