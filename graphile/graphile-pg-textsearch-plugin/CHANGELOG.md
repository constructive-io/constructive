# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.5.1](https://github.com/constructive-io/constructive/compare/graphile-pg-textsearch-plugin@1.4.0...graphile-pg-textsearch-plugin@1.5.1) (2026-03-12)

**Note:** Version bump only for package graphile-pg-textsearch-plugin

# [1.5.0](https://github.com/constructive-io/constructive/compare/graphile-pg-textsearch-plugin@1.4.0...graphile-pg-textsearch-plugin@1.5.0) (2026-03-12)

**Note:** Version bump only for package graphile-pg-textsearch-plugin

# [1.4.0](https://github.com/constructive-io/constructive/compare/graphile-pg-textsearch-plugin@1.3.1...graphile-pg-textsearch-plugin@1.4.0) (2026-03-12)

**Note:** Version bump only for package graphile-pg-textsearch-plugin

## [1.3.1](https://github.com/constructive-io/constructive/compare/graphile-pg-textsearch-plugin@1.3.0...graphile-pg-textsearch-plugin@1.3.1) (2026-03-12)

**Note:** Version bump only for package graphile-pg-textsearch-plugin

# [1.3.0](https://github.com/constructive-io/constructive/compare/graphile-pg-textsearch-plugin@1.2.0...graphile-pg-textsearch-plugin@1.3.0) (2026-03-04)

### Bug Fixes

- re-apply 6 architectural improvements with stable enum naming ([13675e1](https://github.com/constructive-io/constructive/commit/13675e1dc5fd1cdb8d9baa3a4345aa709d3b2b8a))
- remove qb.mode check from ORDER BY section (only needed for SELECT injection) ([8378371](https://github.com/constructive-io/constructive/commit/8378371f9ede585256e1c862ac138b63fb866cba))

### Features

- add Benjie's plugin patterns to all search plugins ([bdb0657](https://github.com/constructive-io/constructive/commit/bdb06579f04afc8cbaacd2ea79d5b561ed63a21a))

# [1.2.0](https://github.com/constructive-io/constructive/compare/graphile-pg-textsearch-plugin@1.1.1...graphile-pg-textsearch-plugin@1.2.0) (2026-03-04)

### Features

- replace manual identifier quoting with @pgsql/quotes across all plugins ([8a42a33](https://github.com/constructive-io/constructive/commit/8a42a33ccfcdbba146f2136c70152fd300ee2876))

## [1.1.1](https://github.com/constructive-io/constructive/compare/graphile-pg-textsearch-plugin@1.1.0...graphile-pg-textsearch-plugin@1.1.1) (2026-03-04)

### Bug Fixes

- **graphile-pg-textsearch-plugin:** qualify index names with schema in BM25 queries ([3d85c65](https://github.com/constructive-io/constructive/commit/3d85c65436abeac6d2530daac6a9508cd01d243d))

# 1.1.0 (2026-03-03)

### Bug Fixes

- remove global bm25Matches filter operator on StringFilter to avoid snapshot breakage ([c0cc510](https://github.com/constructive-io/constructive/commit/c0cc510f88aca5d99f5278d9ea4f37f9979f24e6))

### Features

- **graphile-pg-textsearch-plugin:** auto-discover BM25 indexes with condition, score, orderBy, and filter ([aeacf87](https://github.com/constructive-io/constructive/commit/aeacf876b4457c4cb0aa206e3321447fc92f68f2))
