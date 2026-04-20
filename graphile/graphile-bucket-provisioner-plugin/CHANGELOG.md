# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.4.0](https://github.com/constructive-io/constructive/compare/graphile-bucket-provisioner-plugin@0.3.0...graphile-bucket-provisioner-plugin@0.4.0) (2026-04-19)

### Bug Fixes

- backward-compatible SQL queries for legacy schema (no membership_type column) ([348e408](https://github.com/constructive-io/constructive/commit/348e408ccac7444793dcd148a67b6490cf6dc9fd))
- use SAVEPOINT for schema probe queries to avoid poisoning PG transactions ([3865697](https://github.com/constructive-io/constructive/commit/3865697ea7a0271f1e8a25963c071fb1ff3f9a92))

### Features

- multi-scope bucket resolution (Option C: bucketKey + ownerId) ([9968adf](https://github.com/constructive-io/constructive/commit/9968adf8dd53d41cca7875f4008b8992cc53cc82)), closes [#876](https://github.com/constructive-io/constructive/issues/876)

# [0.3.0](https://github.com/constructive-io/constructive/compare/graphile-bucket-provisioner-plugin@0.2.1...graphile-bucket-provisioner-plugin@0.3.0) (2026-04-18)

**Note:** Version bump only for package graphile-bucket-provisioner-plugin

## [0.2.1](https://github.com/constructive-io/constructive/compare/graphile-bucket-provisioner-plugin@0.2.0...graphile-bucket-provisioner-plugin@0.2.1) (2026-04-11)

**Note:** Version bump only for package graphile-bucket-provisioner-plugin

# 0.2.0 (2026-04-04)

### Features

- add CORS management to bucket provisioner plugin ([e310889](https://github.com/constructive-io/constructive/commit/e3108898c0d78ad100401d3f064161cc840dbcba))
- add graphile-bucket-provisioner-plugin — auto-provisions S3 buckets on bucket table mutations ([eb856fe](https://github.com/constructive-io/constructive/commit/eb856feabf666175f99b6e26a775ca77f07f1eed))
- wire BucketProvisionerPreset into ConstructivePreset via getEnvOptions ([d6c7685](https://github.com/constructive-io/constructive/commit/d6c7685feb6c4152e70161780ea8a058f077d58a))
