# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.8.1](https://github.com/constructive-io/constructive/compare/@constructive-io/express-context@0.8.0...@constructive-io/express-context@0.8.1) (2026-07-08)

**Note:** Version bump only for package @constructive-io/express-context

# [0.8.0](https://github.com/constructive-io/constructive/compare/@constructive-io/express-context@0.7.0...@constructive-io/express-context@0.8.0) (2026-06-28)

**Note:** Version bump only for package @constructive-io/express-context

# [0.7.0](https://github.com/constructive-io/constructive/compare/@constructive-io/express-context@0.6.1...@constructive-io/express-context@0.7.0) (2026-06-27)

### Features

- propagate principal_id through Express middleware and PostGraphile pgSettings ([59e2eda](https://github.com/constructive-io/constructive/commit/59e2edae80134b8f5275ed699ba1eb57a199676d)), closes [constructive-planning#1074](https://github.com/constructive-planning/issues/1074)

## [0.6.1](https://github.com/constructive-io/constructive/compare/@constructive-io/express-context@0.6.0...@constructive-io/express-context@0.6.1) (2026-06-22)

**Note:** Version bump only for package @constructive-io/express-context

# [0.6.0](https://github.com/constructive-io/constructive/compare/@constructive-io/express-context@0.5.0...@constructive-io/express-context@0.6.0) (2026-06-14)

### Features

- **express-context, agentic-server, graphile-llm:** centralize LLM provider config via express-context loaders ([534b05d](https://github.com/constructive-io/constructive/commit/534b05d507f358fa7b462993f70fec466d8a89f0))
- **express-context:** add shared BillingClient abstraction ([7f3a1cb](https://github.com/constructive-io/constructive/commit/7f3a1cbf71e2b14017661e48168082863df2f75d)), closes [constructive-io/constructive-planning#1054](https://github.com/constructive-io/constructive-planning/issues/1054)

# [0.5.0](https://github.com/constructive-io/constructive/compare/@constructive-io/express-context@0.4.0...@constructive-io/express-context@0.5.0) (2026-05-31)

### Features

- wire enableI18n through DatabaseSettings, loader, and ConstructivePreset ([7b709b9](https://github.com/constructive-io/constructive/commit/7b709b9069e462da77e5d1cda9e7c1df9d8569ea))

# [0.4.0](https://github.com/constructive-io/constructive/compare/@constructive-io/express-context@0.3.1...@constructive-io/express-context@0.4.0) (2026-05-30)

**Note:** Version bump only for package @constructive-io/express-context

## [0.3.1](https://github.com/constructive-io/constructive/compare/@constructive-io/express-context@0.3.0...@constructive-io/express-context@0.3.1) (2026-05-29)

**Note:** Version bump only for package @constructive-io/express-context

# [0.3.0](https://github.com/constructive-io/constructive/compare/@constructive-io/express-context@0.2.1...@constructive-io/express-context@0.3.0) (2026-05-24)

### Features

- add billing/inferenceLog/agentChat module loaders + wire into agentic-server ([03394bd](https://github.com/constructive-io/constructive/commit/03394bdcb121de00c84618b3f09b5309536417f5))

## [0.2.1](https://github.com/constructive-io/constructive/compare/@constructive-io/express-context@0.2.0...@constructive-io/express-context@0.2.1) (2026-05-23)

### Bug Fixes

- **loaders:** use composite cache key (databaseId:apiId) ([9649164](https://github.com/constructive-io/constructive/commit/96491643e58e341626c5dafe845009663642ad3e))

# 0.2.0 (2026-05-23)

### Bug Fixes

- add back Express.Request properties that express-context reads ([35af13a](https://github.com/constructive-io/constructive/commit/35af13a33e7d0bb5a087584a8f8a3fdd94ada17d))
- restore original server types, remove re-exports from express-context ([f4e7624](https://github.com/constructive-io/constructive/commit/f4e7624a36145b01f5d438a6177bf389cba80ae6))

### Features

- add @constructive-io/express-context package + wire into server ([2d46e0b](https://github.com/constructive-io/constructive/commit/2d46e0b419654c161ae90140b47515df16897ae4)), closes [constructive-io/constructive-planning#917](https://github.com/constructive-io/constructive-planning/issues/917)
- **express-context:** add modular per-database cached lookup system ([1356633](https://github.com/constructive-io/constructive/commit/135663385951e72da5a8d0644122f21e4650c228))
- **pg-query-context:** add callback-based withPgClient API ([8f13b6d](https://github.com/constructive-io/constructive/commit/8f13b6d620ffdb001c017798c7deed6c8776bee0))
