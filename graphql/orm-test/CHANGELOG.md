# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.4.11](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.4.10...graphql-orm-test@0.4.11) (2026-03-30)

**Note:** Version bump only for package graphql-orm-test

## [0.4.10](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.4.9...graphql-orm-test@0.4.10) (2026-03-30)

**Note:** Version bump only for package graphql-orm-test

## [0.4.9](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.4.8...graphql-orm-test@0.4.9) (2026-03-30)

**Note:** Version bump only for package graphql-orm-test

## [0.4.8](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.4.7...graphql-orm-test@0.4.8) (2026-03-28)

**Note:** Version bump only for package graphql-orm-test

## [0.4.7](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.4.6...graphql-orm-test@0.4.7) (2026-03-27)

**Note:** Version bump only for package graphql-orm-test

## [0.4.6](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.4.5...graphql-orm-test@0.4.6) (2026-03-27)

**Note:** Version bump only for package graphql-orm-test

## [0.4.5](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.4.4...graphql-orm-test@0.4.5) (2026-03-27)

**Note:** Version bump only for package graphql-orm-test

## [0.4.4](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.4.3...graphql-orm-test@0.4.4) (2026-03-26)

**Note:** Version bump only for package graphql-orm-test

## [0.4.3](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.4.2...graphql-orm-test@0.4.3) (2026-03-26)

**Note:** Version bump only for package graphql-orm-test

## [0.4.2](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.4.1...graphql-orm-test@0.4.2) (2026-03-26)

**Note:** Version bump only for package graphql-orm-test

## [0.4.1](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.4.0...graphql-orm-test@0.4.1) (2026-03-26)

**Note:** Version bump only for package graphql-orm-test

# [0.4.0](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.3.8...graphql-orm-test@0.4.0) (2026-03-26)

**Note:** Version bump only for package graphql-orm-test

## [0.3.8](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.3.7...graphql-orm-test@0.3.8) (2026-03-26)

**Note:** Version bump only for package graphql-orm-test

## [0.3.7](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.3.6...graphql-orm-test@0.3.7) (2026-03-26)

**Note:** Version bump only for package graphql-orm-test

## [0.3.6](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.3.5...graphql-orm-test@0.3.6) (2026-03-25)

**Note:** Version bump only for package graphql-orm-test

## [0.3.5](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.3.4...graphql-orm-test@0.3.5) (2026-03-25)

**Note:** Version bump only for package graphql-orm-test

## [0.3.4](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.3.3...graphql-orm-test@0.3.4) (2026-03-25)

**Note:** Version bump only for package graphql-orm-test

## [0.3.3](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.3.2...graphql-orm-test@0.3.3) (2026-03-25)

**Note:** Version bump only for package graphql-orm-test

## [0.3.2](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.3.1...graphql-orm-test@0.3.2) (2026-03-25)

**Note:** Version bump only for package graphql-orm-test

## [0.3.1](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.3.0...graphql-orm-test@0.3.1) (2026-03-24)

**Note:** Version bump only for package graphql-orm-test

# [0.3.0](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.2.2...graphql-orm-test@0.3.0) (2026-03-24)

**Note:** Version bump only for package graphql-orm-test

## [0.2.2](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.2.1...graphql-orm-test@0.2.2) (2026-03-21)

**Note:** Version bump only for package graphql-orm-test

## [0.2.1](https://github.com/constructive-io/constructive/compare/graphql-orm-test@0.2.0...graphql-orm-test@0.2.1) (2026-03-21)

**Note:** Version bump only for package graphql-orm-test

# 0.2.0 (2026-03-21)

### Bug Fixes

- move CREATE EXTENSION from mega-seed.sql to db.extensions config (pgsql-test manages extensions) ([067c902](https://github.com/constructive-io/constructive/commit/067c9026002665e129c226afbcf20ade6cd8b633))
- remove unnecessary setup.sql, use gen_random_uuid(), grant PUBLIC (graphile-test handles roles/extensions) ([367d2c2](https://github.com/constructive-io/constructive/commit/367d2c2f2286085326641ed87190c0c1222ca3e5))
- switch orm-m2n tests to ConstructivePreset (clean M:N field names) ([e251073](https://github.com/constructive-io/constructive/commit/e251073dd81ee6bc959540c71779ed9572fe2b47))

### Features

- add mega query test — all 7 ConstructivePreset plugins + BM25 ([b0aba03](https://github.com/constructive-io/constructive/commit/b0aba03108320b464cb35b42d4cb298f6a6d9a8e))
- add orm-test package — M:N integration tests against real PostgreSQL ([e38e468](https://github.com/constructive-io/constructive/commit/e38e4686870683e73bb9631a793c03fef30578d5))
- composite PK delete support — junction tables use (post_id, tag_id) PK, ORM delete with composite keys, derive input types from actual mutation names ([01f22e3](https://github.com/constructive-io/constructive/commit/01f22e3b770b1604611211cbaaae156f1770dfba))
- improve mega-query test with concrete score assertions and better seed data ([2787eba](https://github.com/constructive-io/constructive/commit/2787ebaaee23f7f68766b72717e8adc48b0e6fd7))
- rewrite orm-test to use codegen pipeline + ORM models ([3be2036](https://github.com/constructive-io/constructive/commit/3be2036218c6bb6c025171a2aae90b4ab13ebf15))
