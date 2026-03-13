# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.7.0](https://github.com/constructive-io/constructive/compare/graphile-pgvector-plugin@1.6.2...graphile-pgvector-plugin@1.7.0) (2026-03-13)

### Features

- **pgvector:** move vector search from condition to filter argument ([413171e](https://github.com/constructive-io/constructive/commit/413171ea5f86d5d0463c436f89cb4fc6f4fda47b))

## [1.6.2](https://github.com/constructive-io/constructive/compare/graphile-pgvector-plugin@1.6.1...graphile-pgvector-plugin@1.6.2) (2026-03-12)

**Note:** Version bump only for package graphile-pgvector-plugin

## [1.6.1](https://github.com/constructive-io/constructive/compare/graphile-pgvector-plugin@1.5.0...graphile-pgvector-plugin@1.6.1) (2026-03-12)

**Note:** Version bump only for package graphile-pgvector-plugin

# [1.6.0](https://github.com/constructive-io/constructive/compare/graphile-pgvector-plugin@1.5.0...graphile-pgvector-plugin@1.6.0) (2026-03-12)

**Note:** Version bump only for package graphile-pgvector-plugin

# [1.5.0](https://github.com/constructive-io/constructive/compare/graphile-pgvector-plugin@1.4.1...graphile-pgvector-plugin@1.5.0) (2026-03-12)

**Note:** Version bump only for package graphile-pgvector-plugin

## [1.4.1](https://github.com/constructive-io/constructive/compare/graphile-pgvector-plugin@1.4.0...graphile-pgvector-plugin@1.4.1) (2026-03-12)

**Note:** Version bump only for package graphile-pgvector-plugin

# [1.4.0](https://github.com/constructive-io/constructive/compare/graphile-pgvector-plugin@1.3.0...graphile-pgvector-plugin@1.4.0) (2026-03-04)

### Bug Fixes

- re-apply 6 architectural improvements with stable enum naming ([13675e1](https://github.com/constructive-io/constructive/commit/13675e1dc5fd1cdb8d9baa3a4345aa709d3b2b8a))
- remove qb.mode check from ORDER BY section (only needed for SELECT injection) ([8378371](https://github.com/constructive-io/constructive/commit/8378371f9ede585256e1c862ac138b63fb866cba))

### Features

- add Benjie's plugin patterns to all search plugins ([bdb0657](https://github.com/constructive-io/constructive/commit/bdb06579f04afc8cbaacd2ea79d5b561ed63a21a))

# [1.3.0](https://github.com/constructive-io/constructive/compare/graphile-pgvector-plugin@1.2.0...graphile-pgvector-plugin@1.3.0) (2026-03-03)

### Bug Fixes

- resolve duplicate VectorMetric enum type and remove global closeTo filter operator ([7c76a19](https://github.com/constructive-io/constructive/commit/7c76a1932e28c3a331b5e460d854ad12f18ba45d))
- **vector-search:** fix composability test to use distance threshold instead of content condition ([dc48e4c](https://github.com/constructive-io/constructive/commit/dc48e4cbf791a48110150a8fe7baeca904f38bfa))

### Features

- **graphile-pgvector-plugin:** auto-discover vector columns with condition, distance, orderBy, and filter ([c621427](https://github.com/constructive-io/constructive/commit/c6214276d1ef8f34afd451af2e90e1e7a3229600))

# [1.2.0](https://github.com/constructive-io/constructive/compare/graphile-pgvector-plugin@1.1.0...graphile-pgvector-plugin@1.2.0) (2026-03-01)

**Note:** Version bump only for package graphile-pgvector-plugin

# 1.1.0 (2026-03-01)

### Bug Fixes

- correct GraphQL field names in integration tests (allDocuments, rowId, searchDocuments, createDocument) ([e522509](https://github.com/constructive-io/constructive/commit/e5225095bc90d5cc39845d34b261e2ada49ba41b))
- exclude test files from build tsconfig to avoid circular dep ([97ecf7b](https://github.com/constructive-io/constructive/commit/97ecf7be9393920e5a026bf5be63e77b0d2cb565))
- remove circular dependency between graphile-pgvector-plugin and graphile-settings ([ee97c6d](https://github.com/constructive-io/constructive/commit/ee97c6d15bd7a899d27afdf1e28607ef01c2d901))

### Features

- create graphile-pgvector-plugin package, replace postgraphile-plugin-pgvector ([c625b5d](https://github.com/constructive-io/constructive/commit/c625b5de34b86495d022daaa1fe30924335fb214))
