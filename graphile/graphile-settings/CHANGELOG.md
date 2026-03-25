# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [4.13.3](https://github.com/constructive-io/constructive/compare/graphile-settings@4.13.2...graphile-settings@4.13.3) (2026-03-25)

**Note:** Version bump only for package graphile-settings

## [4.13.2](https://github.com/constructive-io/constructive/compare/graphile-settings@4.13.1...graphile-settings@4.13.2) (2026-03-25)

**Note:** Version bump only for package graphile-settings

## [4.13.1](https://github.com/constructive-io/constructive/compare/graphile-settings@4.13.0...graphile-settings@4.13.1) (2026-03-24)

**Note:** Version bump only for package graphile-settings

# [4.13.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.12.2...graphile-settings@4.13.0) (2026-03-24)

**Note:** Version bump only for package graphile-settings

## [4.12.2](https://github.com/constructive-io/constructive/compare/graphile-settings@4.12.1...graphile-settings@4.12.2) (2026-03-21)

**Note:** Version bump only for package graphile-settings

## [4.12.1](https://github.com/constructive-io/constructive/compare/graphile-settings@4.12.0...graphile-settings@4.12.1) (2026-03-21)

**Note:** Version bump only for package graphile-settings

# [4.12.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.11.0...graphile-settings@4.12.0) (2026-03-20)

**Note:** Version bump only for package graphile-settings

# [4.11.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.10.3...graphile-settings@4.11.0) (2026-03-20)

### Bug Fixes

- keep legacy BlueprintTypesPlugin name for backward compatibility tests ([9fccba5](https://github.com/constructive-io/constructive/commit/9fccba5e3b96dca475d903de4e8725160e08e927))

### Features

- [@one](https://github.com/one)Of typed blueprint definitions with SuperCase node type keys ([3d040b1](https://github.com/constructive-io/constructive/commit/3d040b1506a1f831ca7c9c9de7b872a49e42c9f3))
- wire BlueprintTypesPlugin into production schema build ([7addba2](https://github.com/constructive-io/constructive/commit/7addba2168ff3b75ae54492f5c011aa3ca146d40)), closes [#857](https://github.com/constructive-io/constructive/issues/857)

## [4.10.3](https://github.com/constructive-io/constructive/compare/graphile-settings@4.10.2...graphile-settings@4.10.3) (2026-03-20)

**Note:** Version bump only for package graphile-settings

## [4.10.2](https://github.com/constructive-io/constructive/compare/graphile-settings@4.10.1...graphile-settings@4.10.2) (2026-03-19)

**Note:** Version bump only for package graphile-settings

## [4.10.1](https://github.com/constructive-io/constructive/compare/graphile-settings@4.10.0...graphile-settings@4.10.1) (2026-03-17)

**Note:** Version bump only for package graphile-settings

# [4.10.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.9.3...graphile-settings@4.10.0) (2026-03-17)

### Bug Fixes

- update dynamic import path in PublicKeySignature test ([b7465b0](https://github.com/constructive-io/constructive/commit/b7465b0a9bcc0d538808c9a87a918e98eee02250))

### Features

- consolidate graphile-misc-plugins into graphile-settings and add [@required](https://github.com/required)Input plugin ([77118e1](https://github.com/constructive-io/constructive/commit/77118e114e87bf96035ae3c5ff6b16a401ba800c))

## [4.9.3](https://github.com/constructive-io/constructive/compare/graphile-settings@4.9.2...graphile-settings@4.9.3) (2026-03-16)

**Note:** Version bump only for package graphile-settings

## [4.9.2](https://github.com/constructive-io/constructive/compare/graphile-settings@4.9.1...graphile-settings@4.9.2) (2026-03-15)

**Note:** Version bump only for package graphile-settings

## [4.9.1](https://github.com/constructive-io/constructive/compare/graphile-settings@4.9.0...graphile-settings@4.9.1) (2026-03-15)

### Bug Fixes

- align all graphile ecosystem deps to latest compatible pinned RC versions ([d3f7761](https://github.com/constructive-io/constructive/commit/d3f7761182e0470cf992028155d1a5fa00cf9211))

# [4.9.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.8.4...graphile-settings@4.9.0) (2026-03-14)

### Bug Fixes

- aggregate connectionFilterOperatorFactories in ConstructivePreset to fix array merging ([86ab1f6](https://github.com/constructive-io/constructive/commit/86ab1f635dd6c886c567245e747753c88a9f9402))
- update snapshots and test assertions for filter→where argument rename ([c3b4990](https://github.com/constructive-io/constructive/commit/c3b4990a02e7462e0421ca8635f6cfcd1e350670))
- update test references for unified search consolidation ([8fc3314](https://github.com/constructive-io/constructive/commit/8fc33147a5e803e366c4b3a513ea31918d072733))

### Features

- add graphile-pg-trgm-plugin for pg_trgm fuzzy text matching ([592a423](https://github.com/constructive-io/constructive/commit/592a42349c7b8c2243a091078740d8160d3d6c8a))
- add integration test suite for ConstructivePreset ([9a1ac81](https://github.com/constructive-io/constructive/commit/9a1ac8108020b35967fbd07bec3d094a042d240c))
- add mega-query test combining BM25 + tsvector + pgvector + relation filter + scalar in one query ([e14bd15](https://github.com/constructive-io/constructive/commit/e14bd15cf409ad8643cbc5a8054abbfd03184f0a))
- add PostGIS spatial filter (geom intersects bbox) to mega query test ([4093017](https://github.com/constructive-io/constructive/commit/4093017392adc285c94179dd9e9b3dd839bb9c60))
- add v5-native graphile-connection-filter plugin ([616dee9](https://github.com/constructive-io/constructive/commit/616dee9a42ac4730e3f9f59ad9612bc223770819))
- consolidate 4 search packages into unified graphile-search ([dafe915](https://github.com/constructive-io/constructive/commit/dafe915653309f4265d19c4bb90b841127e27f2c))
- consolidate graphile-plugin-connection-filter-postgis into graphile-postgis ([b59919a](https://github.com/constructive-io/constructive/commit/b59919a14b0330c3fdf0fbde10bad9e912e8ec8f))
- deprecate condition argument, move search + BM25 plugins to filter ([76f35f5](https://github.com/constructive-io/constructive/commit/76f35f53dfc3821ab81dcb6b3ef1fe944a2e8983))
- enable connectionFilterRelations in constructive preset ([28b23c4](https://github.com/constructive-io/constructive/commit/28b23c48dc3e7c9613fc1b38282256ac6e54f654))
- rename filter argument to where (configurable via connectionFilterArgumentName) ([10b4fc6](https://github.com/constructive-io/constructive/commit/10b4fc6360774cd79fa936d442dfef4fa9e5f252))
- rename generated fields to {column}{Algorithm}{Metric} with deduplication ([0f10c04](https://github.com/constructive-io/constructive/commit/0f10c04fe58b0e1f2627ff6e60b10092d462cfd0))

### BREAKING CHANGES

- The condition argument has been removed entirely.
  All filtering now uses the filter argument exclusively.

## [4.8.4](https://github.com/constructive-io/constructive/compare/graphile-settings@4.8.3...graphile-settings@4.8.4) (2026-03-13)

**Note:** Version bump only for package graphile-settings

## [4.8.3](https://github.com/constructive-io/constructive/compare/graphile-settings@4.8.2...graphile-settings@4.8.3) (2026-03-13)

**Note:** Version bump only for package graphile-settings

## [4.8.2](https://github.com/constructive-io/constructive/compare/graphile-settings@4.8.1...graphile-settings@4.8.2) (2026-03-12)

**Note:** Version bump only for package graphile-settings

## [4.8.1](https://github.com/constructive-io/constructive/compare/graphile-settings@4.7.0...graphile-settings@4.8.1) (2026-03-12)

**Note:** Version bump only for package graphile-settings

# [4.8.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.7.0...graphile-settings@4.8.0) (2026-03-12)

**Note:** Version bump only for package graphile-settings

# [4.7.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.6.4...graphile-settings@4.7.0) (2026-03-12)

**Note:** Version bump only for package graphile-settings

## [4.6.4](https://github.com/constructive-io/constructive/compare/graphile-settings@4.6.3...graphile-settings@4.6.4) (2026-03-12)

**Note:** Version bump only for package graphile-settings

## [4.6.3](https://github.com/constructive-io/constructive/compare/graphile-settings@4.6.2...graphile-settings@4.6.3) (2026-03-04)

**Note:** Version bump only for package graphile-settings

## [4.6.2](https://github.com/constructive-io/constructive/compare/graphile-settings@4.6.1...graphile-settings@4.6.2) (2026-03-04)

**Note:** Version bump only for package graphile-settings

## [4.6.1](https://github.com/constructive-io/constructive/compare/graphile-settings@4.6.0...graphile-settings@4.6.1) (2026-03-04)

**Note:** Version bump only for package graphile-settings

# [4.6.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.5.0...graphile-settings@4.6.0) (2026-03-03)

### Features

- **graphile-pg-textsearch-plugin:** auto-discover BM25 indexes with condition, score, orderBy, and filter ([aeacf87](https://github.com/constructive-io/constructive/commit/aeacf876b4457c4cb0aa206e3321447fc92f68f2))
- **graphile-pgvector-plugin:** auto-discover vector columns with condition, distance, orderBy, and filter ([c621427](https://github.com/constructive-io/constructive/commit/c6214276d1ef8f34afd451af2e90e1e7a3229600))

# [4.5.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.4.0...graphile-settings@4.5.0) (2026-03-01)

**Note:** Version bump only for package graphile-settings

# [4.4.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.3.4...graphile-settings@4.4.0) (2026-03-01)

### Features

- create graphile-pgvector-plugin package, replace postgraphile-plugin-pgvector ([c625b5d](https://github.com/constructive-io/constructive/commit/c625b5de34b86495d022daaa1fe30924335fb214))

## [4.3.4](https://github.com/constructive-io/constructive/compare/graphile-settings@4.3.3...graphile-settings@4.3.4) (2026-02-28)

**Note:** Version bump only for package graphile-settings

## [4.3.3](https://github.com/constructive-io/constructive/compare/graphile-settings@4.3.2...graphile-settings@4.3.3) (2026-02-28)

**Note:** Version bump only for package graphile-settings

## [4.3.2](https://github.com/constructive-io/constructive/compare/graphile-settings@4.3.1...graphile-settings@4.3.2) (2026-02-26)

**Note:** Version bump only for package graphile-settings

## [4.3.1](https://github.com/constructive-io/constructive/compare/graphile-settings@4.3.0...graphile-settings@4.3.1) (2026-02-25)

**Note:** Version bump only for package graphile-settings

# [4.3.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.2.0...graphile-settings@4.3.0) (2026-02-24)

**Note:** Version bump only for package graphile-settings

# [4.2.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.1.1...graphile-settings@4.2.0) (2026-02-24)

### Features

- **graphile-settings:** enable v5 postgis upload and sql presets ([68db553](https://github.com/constructive-io/constructive/commit/68db5535095d784cc8b2c690054977ebcb3e8f69))
- **upload:** add storage resolver and mime prechecks ([e4f95fd](https://github.com/constructive-io/constructive/commit/e4f95fd5c00b6059bd6eda7693ee59d5792a8bd5))

## [4.1.1](https://github.com/constructive-io/constructive/compare/graphile-settings@4.1.0...graphile-settings@4.1.1) (2026-02-19)

**Note:** Version bump only for package graphile-settings

# [4.1.0](https://github.com/constructive-io/constructive/compare/graphile-settings@4.0.1...graphile-settings@4.1.0) (2026-02-19)

**Note:** Version bump only for package graphile-settings

## [4.0.1](https://github.com/constructive-io/constructive/compare/graphile-settings@4.0.0...graphile-settings@4.0.1) (2026-02-15)

### Bug Fixes

- **codegen:** preserve db.pgpm when merging CLI args with file config ([a4d7028](https://github.com/constructive-io/constructive/commit/a4d7028be1b2ada6ce7a4e5adec4cfdd06a29441))
- remove functionResourceName override per user request - keep all names flat ([2b8f98d](https://github.com/constructive-io/constructive/commit/2b8f98dec014096a826cb234ebefa2b769cee122))

# [4.0.0](https://github.com/constructive-io/constructive/compare/graphile-settings@3.1.1...graphile-settings@4.0.0) (2026-02-13)

**Note:** Version bump only for package graphile-settings

## [3.1.1](https://github.com/constructive-io/constructive/compare/graphile-settings@3.1.0...graphile-settings@3.1.1) (2026-02-13)

**Note:** Version bump only for package graphile-settings

# [3.1.0](https://github.com/constructive-io/constructive/compare/graphile-settings@3.0.5...graphile-settings@3.1.0) (2026-02-09)

**Note:** Version bump only for package graphile-settings

## [3.0.5](https://github.com/constructive-io/constructive/compare/graphile-settings@3.0.4...graphile-settings@3.0.5) (2026-01-28)

**Note:** Version bump only for package graphile-settings

## [3.0.4](https://github.com/constructive-io/constructive/compare/graphile-settings@3.0.3...graphile-settings@3.0.4) (2026-01-27)

**Note:** Version bump only for package graphile-settings

## [3.0.3](https://github.com/constructive-io/constructive/compare/graphile-settings@3.0.2...graphile-settings@3.0.3) (2026-01-25)

**Note:** Version bump only for package graphile-settings

## [3.0.2](https://github.com/constructive-io/constructive/compare/graphile-settings@3.0.1...graphile-settings@3.0.2) (2026-01-24)

**Note:** Version bump only for package graphile-settings

## [3.0.1](https://github.com/constructive-io/constructive/compare/graphile-settings@3.0.0...graphile-settings@3.0.1) (2026-01-24)

**Note:** Version bump only for package graphile-settings

# [3.0.0](https://github.com/constructive-io/constructive/compare/graphile-settings@2.14.4...graphile-settings@3.0.0) (2026-01-24)

**Note:** Version bump only for package graphile-settings

## [2.14.4](https://github.com/constructive-io/constructive/compare/graphile-settings@2.14.3...graphile-settings@2.14.4) (2026-01-22)

**Note:** Version bump only for package graphile-settings

## [2.14.3](https://github.com/constructive-io/constructive/compare/graphile-settings@2.14.2...graphile-settings@2.14.3) (2026-01-22)

**Note:** Version bump only for package graphile-settings

## [2.14.2](https://github.com/constructive-io/constructive/compare/graphile-settings@2.14.1...graphile-settings@2.14.2) (2026-01-21)

**Note:** Version bump only for package graphile-settings

## [2.14.1](https://github.com/constructive-io/constructive/compare/graphile-settings@2.14.0...graphile-settings@2.14.1) (2026-01-21)

**Note:** Version bump only for package graphile-settings

# [2.14.0](https://github.com/constructive-io/constructive/compare/graphile-settings@2.13.1...graphile-settings@2.14.0) (2026-01-20)

**Note:** Version bump only for package graphile-settings

## [2.13.1](https://github.com/constructive-io/constructive/compare/graphile-settings@2.13.0...graphile-settings@2.13.1) (2026-01-19)

**Note:** Version bump only for package graphile-settings

# [2.13.0](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.18...graphile-settings@2.13.0) (2026-01-18)

**Note:** Version bump only for package graphile-settings

## [2.12.18](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.17...graphile-settings@2.12.18) (2026-01-18)

**Note:** Version bump only for package graphile-settings

## [2.12.17](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.16...graphile-settings@2.12.17) (2026-01-14)

**Note:** Version bump only for package graphile-settings

## [2.12.16](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.15...graphile-settings@2.12.16) (2026-01-14)

**Note:** Version bump only for package graphile-settings

## [2.12.15](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.14...graphile-settings@2.12.15) (2026-01-11)

**Note:** Version bump only for package graphile-settings

## [2.12.14](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.13...graphile-settings@2.12.14) (2026-01-10)

**Note:** Version bump only for package graphile-settings

## [2.12.13](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.12...graphile-settings@2.12.13) (2026-01-09)

**Note:** Version bump only for package graphile-settings

## [2.12.12](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.11...graphile-settings@2.12.12) (2026-01-08)

**Note:** Version bump only for package graphile-settings

## [2.12.11](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.10...graphile-settings@2.12.11) (2026-01-08)

**Note:** Version bump only for package graphile-settings

## [2.12.10](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.9...graphile-settings@2.12.10) (2026-01-08)

**Note:** Version bump only for package graphile-settings

## [2.12.9](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.8...graphile-settings@2.12.9) (2026-01-08)

**Note:** Version bump only for package graphile-settings

## [2.12.8](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.7...graphile-settings@2.12.8) (2026-01-08)

**Note:** Version bump only for package graphile-settings

## [2.12.7](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.6...graphile-settings@2.12.7) (2026-01-08)

**Note:** Version bump only for package graphile-settings

## [2.12.6](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.5...graphile-settings@2.12.6) (2026-01-08)

**Note:** Version bump only for package graphile-settings

## [2.12.5](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.4...graphile-settings@2.12.5) (2026-01-08)

**Note:** Version bump only for package graphile-settings

## [2.12.4](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.3...graphile-settings@2.12.4) (2026-01-07)

**Note:** Version bump only for package graphile-settings

## [2.12.3](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.2...graphile-settings@2.12.3) (2026-01-07)

**Note:** Version bump only for package graphile-settings

## [2.12.2](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.1...graphile-settings@2.12.2) (2026-01-07)

**Note:** Version bump only for package graphile-settings

## [2.12.1](https://github.com/constructive-io/constructive/compare/graphile-settings@2.12.0...graphile-settings@2.12.1) (2026-01-06)

**Note:** Version bump only for package graphile-settings

# [2.12.0](https://github.com/constructive-io/constructive/compare/graphile-settings@2.11.0...graphile-settings@2.12.0) (2026-01-05)

**Note:** Version bump only for package graphile-settings

# [2.11.0](https://github.com/constructive-io/constructive/compare/graphile-settings@2.10.6...graphile-settings@2.11.0) (2026-01-05)

**Note:** Version bump only for package graphile-settings

## [2.10.6](https://github.com/constructive-io/constructive/compare/graphile-settings@2.10.5...graphile-settings@2.10.6) (2026-01-05)

**Note:** Version bump only for package graphile-settings

## [2.10.5](https://github.com/constructive-io/constructive/compare/graphile-settings@2.10.4...graphile-settings@2.10.5) (2026-01-05)

**Note:** Version bump only for package graphile-settings

## [2.10.4](https://github.com/constructive-io/constructive/compare/graphile-settings@2.10.3...graphile-settings@2.10.4) (2026-01-03)

**Note:** Version bump only for package graphile-settings

## [2.10.3](https://github.com/constructive-io/constructive/compare/graphile-settings@2.10.2...graphile-settings@2.10.3) (2026-01-02)

**Note:** Version bump only for package graphile-settings

## [2.10.2](https://github.com/constructive-io/constructive/compare/graphile-settings@2.10.1...graphile-settings@2.10.2) (2026-01-02)

**Note:** Version bump only for package graphile-settings

## [2.10.1](https://github.com/constructive-io/constructive/compare/graphile-settings@2.10.0...graphile-settings@2.10.1) (2025-12-31)

**Note:** Version bump only for package graphile-settings

# [2.10.0](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.36...graphile-settings@2.10.0) (2025-12-31)

### Features

- **cdn:** add BUCKET_PROVIDER env var for explicit storage provider selection ([e305ba0](https://github.com/constructive-io/constructive/commit/e305ba06ef62406e60b83f5b5eb784ec9c20316a))

## [2.9.36](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.35...graphile-settings@2.9.36) (2025-12-31)

**Note:** Version bump only for package graphile-settings

## [2.9.35](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.34...graphile-settings@2.9.35) (2025-12-31)

**Note:** Version bump only for package graphile-settings

## [2.9.34](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.33...graphile-settings@2.9.34) (2025-12-31)

**Note:** Version bump only for package graphile-settings

## [2.9.33](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.32...graphile-settings@2.9.33) (2025-12-31)

**Note:** Version bump only for package graphile-settings

## [2.9.32](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.31...graphile-settings@2.9.32) (2025-12-31)

**Note:** Version bump only for package graphile-settings

## [2.9.31](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.30...graphile-settings@2.9.31) (2025-12-27)

**Note:** Version bump only for package graphile-settings

## [2.9.30](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.29...graphile-settings@2.9.30) (2025-12-27)

**Note:** Version bump only for package graphile-settings

## [2.9.29](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.28...graphile-settings@2.9.29) (2025-12-27)

**Note:** Version bump only for package graphile-settings

## [2.9.28](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.27...graphile-settings@2.9.28) (2025-12-27)

**Note:** Version bump only for package graphile-settings

## [2.9.27](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.26...graphile-settings@2.9.27) (2025-12-27)

**Note:** Version bump only for package graphile-settings

## [2.9.26](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.25...graphile-settings@2.9.26) (2025-12-27)

**Note:** Version bump only for package graphile-settings

## [2.9.25](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.24...graphile-settings@2.9.25) (2025-12-26)

**Note:** Version bump only for package graphile-settings

## [2.9.24](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.23...graphile-settings@2.9.24) (2025-12-26)

**Note:** Version bump only for package graphile-settings

## [2.9.23](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.22...graphile-settings@2.9.23) (2025-12-26)

**Note:** Version bump only for package graphile-settings

## [2.9.22](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.21...graphile-settings@2.9.22) (2025-12-26)

**Note:** Version bump only for package graphile-settings

## [2.9.21](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.20...graphile-settings@2.9.21) (2025-12-26)

**Note:** Version bump only for package graphile-settings

## [2.9.20](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.19...graphile-settings@2.9.20) (2025-12-25)

**Note:** Version bump only for package graphile-settings

## [2.9.19](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.18...graphile-settings@2.9.19) (2025-12-25)

**Note:** Version bump only for package graphile-settings

## [2.9.18](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.17...graphile-settings@2.9.18) (2025-12-25)

**Note:** Version bump only for package graphile-settings

## [2.9.17](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.16...graphile-settings@2.9.17) (2025-12-25)

**Note:** Version bump only for package graphile-settings

## [2.9.16](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.15...graphile-settings@2.9.16) (2025-12-24)

**Note:** Version bump only for package graphile-settings

## [2.9.15](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.14...graphile-settings@2.9.15) (2025-12-24)

**Note:** Version bump only for package graphile-settings

## [2.9.14](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.13...graphile-settings@2.9.14) (2025-12-24)

**Note:** Version bump only for package graphile-settings

## [2.9.13](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.12...graphile-settings@2.9.13) (2025-12-24)

**Note:** Version bump only for package graphile-settings

## [2.9.12](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.11...graphile-settings@2.9.12) (2025-12-24)

**Note:** Version bump only for package graphile-settings

## [2.9.11](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.10...graphile-settings@2.9.11) (2025-12-23)

**Note:** Version bump only for package graphile-settings

## [2.9.10](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.9...graphile-settings@2.9.10) (2025-12-22)

**Note:** Version bump only for package graphile-settings

## [2.9.9](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.8...graphile-settings@2.9.9) (2025-12-22)

**Note:** Version bump only for package graphile-settings

## [2.9.8](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.7...graphile-settings@2.9.8) (2025-12-21)

**Note:** Version bump only for package graphile-settings

## [2.9.7](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.6...graphile-settings@2.9.7) (2025-12-21)

**Note:** Version bump only for package graphile-settings

## [2.9.6](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.5...graphile-settings@2.9.6) (2025-12-21)

**Note:** Version bump only for package graphile-settings

## [2.9.5](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.4...graphile-settings@2.9.5) (2025-12-19)

**Note:** Version bump only for package graphile-settings

## [2.9.4](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.3...graphile-settings@2.9.4) (2025-12-18)

**Note:** Version bump only for package graphile-settings

## [2.9.3](https://github.com/constructive-io/constructive/compare/graphile-settings@2.9.2...graphile-settings@2.9.3) (2025-12-17)

**Note:** Version bump only for package graphile-settings
