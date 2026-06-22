# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.17.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.17.0...graphile-search@1.17.1) (2026-06-22)

**Note:** Version bump only for package graphile-search

# [1.17.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.16.0...graphile-search@1.17.0) (2026-06-14)

### Bug Fixes

- **graphile-llm:** fix all failing tests — RAG chunk discovery, mutation input detection, text-search scope ([49ead07](https://github.com/constructive-io/constructive/commit/49ead07fe1d863ea1c18bf4cb9446b031bd63188))
- **graphile-search:** replace mock LLM plugin tests with Grafast-compatible integration tests ([53f2199](https://github.com/constructive-io/constructive/commit/53f21998fa854da19b031315846f4c9d4633ea71))

### Features

- **graphile-llm:** auto-embed unifiedSearch text for hybrid vector+keyword search ([dc4a5c1](https://github.com/constructive-io/constructive/commit/dc4a5c1befec668f93586fb94d02303b219e427c)), closes [#1054](https://github.com/constructive-io/constructive/issues/1054)

# [1.16.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.15.4...graphile-search@1.16.0) (2026-06-12)

### Bug Fixes

- remove unnecessary ROW_NUMBER() from per-adapter individual filter path ([a3909a8](https://github.com/constructive-io/constructive/commit/a3909a834891e8709ab2b3c4c7d69c7ca40c0d80))
- restore ROW_NUMBER() for per-adapter RRF + VACUUM BM25 index in seed ([589ec10](https://github.com/constructive-io/constructive/commit/589ec10cb2d7ae281ab011eb99eb38548dd069c6))

### Features

- **graphile-search:** replace sigmoid weighted-average with Reciprocal Rank Fusion (RRF) ([2c61257](https://github.com/constructive-io/constructive/commit/2c6125749d6b5f37a17ddbdefc3c0475bdfecdcf)), closes [constructive-io/constructive-planning#1047](https://github.com/constructive-io/constructive-planning/issues/1047)

## [1.15.4](https://github.com/constructive-io/constructive/compare/graphile-search@1.15.3...graphile-search@1.15.4) (2026-06-07)

**Note:** Version bump only for package graphile-search

## [1.15.3](https://github.com/constructive-io/constructive/compare/graphile-search@1.15.2...graphile-search@1.15.3) (2026-06-06)

**Note:** Version bump only for package graphile-search

## [1.15.2](https://github.com/constructive-io/constructive/compare/graphile-search@1.15.1...graphile-search@1.15.2) (2026-06-06)

**Note:** Version bump only for package graphile-search

## [1.15.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.15.0...graphile-search@1.15.1) (2026-06-05)

**Note:** Version bump only for package graphile-search

# [1.15.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.14.2...graphile-search@1.15.0) (2026-05-30)

**Note:** Version bump only for package graphile-search

## [1.14.2](https://github.com/constructive-io/constructive/compare/graphile-search@1.14.1...graphile-search@1.14.2) (2026-05-29)

**Note:** Version bump only for package graphile-search

## [1.14.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.14.0...graphile-search@1.14.1) (2026-05-24)

**Note:** Version bump only for package graphile-search

# [1.14.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.13.2...graphile-search@1.14.0) (2026-05-23)

**Note:** Version bump only for package graphile-search

## [1.13.2](https://github.com/constructive-io/constructive/compare/graphile-search@1.13.1...graphile-search@1.13.2) (2026-05-21)

**Note:** Version bump only for package graphile-search

## [1.13.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.13.0...graphile-search@1.13.1) (2026-05-20)

**Note:** Version bump only for package graphile-search

# [1.13.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.12.1...graphile-search@1.13.0) (2026-05-19)

### Bug Fixes

- update unit tests for expanded ChunksInfo type ([a38b3ed](https://github.com/constructive-io/constructive/commit/a38b3ed2dd7d8706adb6d9051bbde9898749a411))

### Features

- chunk-aware text search in tsvector, BM25, and trgm adapters ([#854](https://github.com/constructive-io/constructive/issues/854)) ([0118610](https://github.com/constructive-io/constructive/commit/0118610e7bdc38287522e99bf38c46e48123e69c))

## [1.12.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.12.0...graphile-search@1.12.1) (2026-05-17)

**Note:** Version bump only for package graphile-search

# [1.12.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.11.2...graphile-search@1.12.0) (2026-05-14)

**Note:** Version bump only for package graphile-search

## [1.11.2](https://github.com/constructive-io/constructive/compare/graphile-search@1.11.1...graphile-search@1.11.2) (2026-05-12)

**Note:** Version bump only for package graphile-search

## [1.11.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.11.0...graphile-search@1.11.1) (2026-05-11)

**Note:** Version bump only for package graphile-search

# [1.11.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.10.2...graphile-search@1.11.0) (2026-05-11)

**Note:** Version bump only for package graphile-search

## [1.10.2](https://github.com/constructive-io/constructive/compare/graphile-search@1.10.1...graphile-search@1.10.2) (2026-05-10)

**Note:** Version bump only for package graphile-search

## [1.10.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.10.0...graphile-search@1.10.1) (2026-05-09)

**Note:** Version bump only for package graphile-search

# [1.10.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.9.0...graphile-search@1.10.0) (2026-05-08)

**Note:** Version bump only for package graphile-search

# [1.9.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.8.0...graphile-search@1.9.0) (2026-05-08)

**Note:** Version bump only for package graphile-search

# [1.8.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.7.6...graphile-search@1.8.0) (2026-05-06)

**Note:** Version bump only for package graphile-search

## [1.7.6](https://github.com/constructive-io/constructive/compare/graphile-search@1.7.5...graphile-search@1.7.6) (2026-05-05)

**Note:** Version bump only for package graphile-search

## [1.7.5](https://github.com/constructive-io/constructive/compare/graphile-search@1.7.4...graphile-search@1.7.5) (2026-04-27)

**Note:** Version bump only for package graphile-search

## [1.7.4](https://github.com/constructive-io/constructive/compare/graphile-search@1.7.3...graphile-search@1.7.4) (2026-04-20)

**Note:** Version bump only for package graphile-search

## [1.7.3](https://github.com/constructive-io/constructive/compare/graphile-search@1.7.2...graphile-search@1.7.3) (2026-04-20)

**Note:** Version bump only for package graphile-search

## [1.7.2](https://github.com/constructive-io/constructive/compare/graphile-search@1.7.1...graphile-search@1.7.2) (2026-04-19)

**Note:** Version bump only for package graphile-search

## [1.7.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.7.0...graphile-search@1.7.1) (2026-04-18)

**Note:** Version bump only for package graphile-search

# [1.7.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.6.1...graphile-search@1.7.0) (2026-04-18)

**Note:** Version bump only for package graphile-search

## [1.6.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.6.0...graphile-search@1.6.1) (2026-04-11)

**Note:** Version bump only for package graphile-search

# [1.6.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.5.10...graphile-search@1.6.0) (2026-04-09)

**Note:** Version bump only for package graphile-search

## [1.5.10](https://github.com/constructive-io/constructive/compare/graphile-search@1.5.9...graphile-search@1.5.10) (2026-04-04)

**Note:** Version bump only for package graphile-search

## [1.5.9](https://github.com/constructive-io/constructive/compare/graphile-search@1.5.8...graphile-search@1.5.9) (2026-04-02)

**Note:** Version bump only for package graphile-search

## [1.5.8](https://github.com/constructive-io/constructive/compare/graphile-search@1.5.7...graphile-search@1.5.8) (2026-04-02)

**Note:** Version bump only for package graphile-search

## [1.5.7](https://github.com/constructive-io/constructive/compare/graphile-search@1.5.6...graphile-search@1.5.7) (2026-04-01)

### Bug Fixes

- correct search ordering for pgvector, BM25, and trgm with LIMIT ([096f74c](https://github.com/constructive-io/constructive/commit/096f74ccad282e7aba6e2d05ce7e95c5e3ca9fd0))

## [1.5.6](https://github.com/constructive-io/constructive/compare/graphile-search@1.5.5...graphile-search@1.5.6) (2026-03-31)

**Note:** Version bump only for package graphile-search

## [1.5.5](https://github.com/constructive-io/constructive/compare/graphile-search@1.5.4...graphile-search@1.5.5) (2026-03-31)

**Note:** Version bump only for package graphile-search

## [1.5.4](https://github.com/constructive-io/constructive/compare/graphile-search@1.5.3...graphile-search@1.5.4) (2026-03-28)

**Note:** Version bump only for package graphile-search

## [1.5.3](https://github.com/constructive-io/constructive/compare/graphile-search@1.5.2...graphile-search@1.5.3) (2026-03-27)

### Bug Fixes

- eliminate sql.raw usage in pgvector and postgis plugins ([330a680](https://github.com/constructive-io/constructive/commit/330a6800e225d21f0c2378c0d29bdb816d72bcd1))

## [1.5.2](https://github.com/constructive-io/constructive/compare/graphile-search@1.5.1...graphile-search@1.5.2) (2026-03-27)

**Note:** Version bump only for package graphile-search

## [1.5.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.5.0...graphile-search@1.5.1) (2026-03-26)

**Note:** Version bump only for package graphile-search

# [1.5.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.4.3...graphile-search@1.5.0) (2026-03-26)

**Note:** Version bump only for package graphile-search

## [1.4.3](https://github.com/constructive-io/constructive/compare/graphile-search@1.4.2...graphile-search@1.4.3) (2026-03-25)

**Note:** Version bump only for package graphile-search

## [1.4.2](https://github.com/constructive-io/constructive/compare/graphile-search@1.4.1...graphile-search@1.4.2) (2026-03-25)

**Note:** Version bump only for package graphile-search

## [1.4.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.4.0...graphile-search@1.4.1) (2026-03-24)

**Note:** Version bump only for package graphile-search

# [1.4.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.3.3...graphile-search@1.4.0) (2026-03-24)

**Note:** Version bump only for package graphile-search

## [1.3.3](https://github.com/constructive-io/constructive/compare/graphile-search@1.3.2...graphile-search@1.3.3) (2026-03-21)

**Note:** Version bump only for package graphile-search

## [1.3.2](https://github.com/constructive-io/constructive/compare/graphile-search@1.3.1...graphile-search@1.3.2) (2026-03-21)

**Note:** Version bump only for package graphile-search

## [1.3.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.3.0...graphile-search@1.3.1) (2026-03-20)

**Note:** Version bump only for package graphile-search

# [1.3.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.2.1...graphile-search@1.3.0) (2026-03-19)

### Bug Fixes

- address review feedback - sql ref, schema qualification, PK field, recency boost ([6b13584](https://github.com/constructive-io/constructive/commit/6b135847bcdbdda7589c07223ed0cba70af4751e))

### Features

- **graphile-search:** per-table [@search](https://github.com/search)Config smart tag & transparent chunk querying ([44fac9b](https://github.com/constructive-io/constructive/commit/44fac9b064932d8df18b5569d1bdb8d8aa065241))
- schema-time validation, integration tests, chunk-aware codegen docs (Phases I+J+H) ([49f0e33](https://github.com/constructive-io/constructive/commit/49f0e333bff3f6805f3a0321efd68431246f8272))

## [1.2.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.2.0...graphile-search@1.2.1) (2026-03-17)

**Note:** Version bump only for package graphile-search

# [1.2.0](https://github.com/constructive-io/constructive/compare/graphile-search@1.1.3...graphile-search@1.2.0) (2026-03-17)

### Features

- scope trgm operators to tables with intentional search ([af00b1e](https://github.com/constructive-io/constructive/commit/af00b1eb99a5888924c5d51b736eef9f142f1ebf))

## [1.1.3](https://github.com/constructive-io/constructive/compare/graphile-search@1.1.2...graphile-search@1.1.3) (2026-03-16)

**Note:** Version bump only for package graphile-search

## [1.1.2](https://github.com/constructive-io/constructive/compare/graphile-search@1.1.1...graphile-search@1.1.2) (2026-03-15)

### Bug Fixes

- make trgm adapter supplementary and filter search fields from codegen docs ([4393bf8](https://github.com/constructive-io/constructive/commit/4393bf8e93f8bde912250d95ab5c95b4e91716d4))
- pgvector should not trigger supplementary adapters like trgm ([c749764](https://github.com/constructive-io/constructive/commit/c74976461d70b7a40c37618e9625756892738fe7))

## [1.1.1](https://github.com/constructive-io/constructive/compare/graphile-search@1.1.0...graphile-search@1.1.1) (2026-03-15)

### Bug Fixes

- align all graphile ecosystem deps to latest compatible pinned RC versions ([d3f7761](https://github.com/constructive-io/constructive/commit/d3f7761182e0470cf992028155d1a5fa00cf9211))
- update tsvector detection for graphile-build-pg rc.8 built-in codec support ([875366a](https://github.com/constructive-io/constructive/commit/875366a17cdd13b05535001613c93a0dd1a8c69c))

# 1.1.0 (2026-03-14)

### Bug Fixes

- add --forceExit and testTimeout to graphile-search jest config to prevent CI hang ([11ca5ba](https://github.com/constructive-io/constructive/commit/11ca5ba8bbff1024db494e7bc1ce6870bb8071cd))
- BM25 adapter falls back to module-level index store, move disabled test to separate suite ([2e1056b](https://github.com/constructive-io/constructive/commit/2e1056b42905c17a1e6aadaaf7ffaef9603415a4))
- resolve CI failures in graphile-search tests ([8155fa8](https://github.com/constructive-io/constructive/commit/8155fa8b99765e4208cfbce26f6d62d4b82401ca))
- use correct imports in fullTextSearch disabled test (getConnections, ConnectionFilterPreset) ([b10082e](https://github.com/constructive-io/constructive/commit/b10082e9576a2e9b18d360b1e46f5f8ce099d136))
- use introspection to verify fullTextSearch disabled (Grafast ignores unknown input fields) ([9f7dcbc](https://github.com/constructive-io/constructive/commit/9f7dcbc9faa82a4a058197120d50c4b89076b63d))

### Features

- add unified graphile-search plugin with adapter pattern ([cef6a12](https://github.com/constructive-io/constructive/commit/cef6a123d245d9d8b5d8b60b385999462678108f))
- consolidate 4 search packages into unified graphile-search ([dafe915](https://github.com/constructive-io/constructive/commit/dafe915653309f4265d19c4bb90b841127e27f2c))
- rename filter argument to where (configurable via connectionFilterArgumentName) ([10b4fc6](https://github.com/constructive-io/constructive/commit/10b4fc6360774cd79fa936d442dfef4fa9e5f252))
- rename tsvector filterPrefix to 'tsv', add fullTextSearch composite filter ([97d9290](https://github.com/constructive-io/constructive/commit/97d929037a28e5e3c6944af565fa4f3b0d772a84))
