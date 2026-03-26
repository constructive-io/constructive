# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
