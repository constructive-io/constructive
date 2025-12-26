# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [4.0.3](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.0.2...@pgpmjs/core@4.0.3) (2025-12-26)

**Note:** Version bump only for package @pgpmjs/core

## [4.0.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.0.1...@pgpmjs/core@4.0.2) (2025-12-26)

### Bug Fixes

- **pgpm/core:** use workspace csv-to-pg to fix ast.ResTarget error ([b521725](https://github.com/constructive-io/constructive/commit/b521725cc5fb32cfaeb075525c75ac00b38d65a5))

## [4.0.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.0.0...@pgpmjs/core@4.0.1) (2025-12-26)

### Bug Fixes

- **pgpm:** --dir bypasses .boilerplates.json resolution ([47aa24e](https://github.com/constructive-io/constructive/commit/47aa24e5dc5fdc33ca765659f6dd286c488149cc))
- **pgpm:** address feedback on --boilerplate implementation ([0b3493d](https://github.com/constructive-io/constructive/commit/0b3493dd708111164fa82f9320328ec291108fe7))

# [4.0.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.2.3...@pgpmjs/core@4.0.0) (2025-12-25)

### Bug Fixes

- **pgpm:** update help text to use <variant> and move inquirerer to devDependencies ([b925480](https://github.com/constructive-io/constructive/commit/b92548012273ef831e649c5200bf86e1eb182131))

### Features

- **pgpm:** implement metadata-driven single entry point for init ([b57fe8f](https://github.com/constructive-io/constructive/commit/b57fe8f15970bcc0521625b84f0e4305391cbc65))

### BREAKING CHANGES

- **pgpm:** scaffoldTemplate() now uses fromPath instead of type parameter

## [3.2.3](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.2.2...@pgpmjs/core@3.2.3) (2025-12-25)

**Note:** Version bump only for package @pgpmjs/core

## [3.2.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.2.1...@pgpmjs/core@3.2.2) (2025-12-25)

**Note:** Version bump only for package @pgpmjs/core

## [3.2.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.2.0...@pgpmjs/core@3.2.1) (2025-12-25)

**Note:** Version bump only for package @pgpmjs/core

# [3.2.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.1.4...@pgpmjs/core@3.2.0) (2025-12-24)

### Features

- **pgpm:** add modulesInstalled, getInstalledModules, and upgradeModules methods ([adefc84](https://github.com/constructive-io/constructive/commit/adefc84b126816ff498a56c35c51f9a9f3844516))

## [3.1.4](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.1.3...@pgpmjs/core@3.1.4) (2025-12-24)

**Note:** Version bump only for package @pgpmjs/core

## [3.1.3](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.1.2...@pgpmjs/core@3.1.3) (2025-12-24)

**Note:** Version bump only for package @pgpmjs/core

## [3.1.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.1.1...@pgpmjs/core@3.1.2) (2025-12-23)

**Note:** Version bump only for package @pgpmjs/core

## [3.1.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.1.0...@pgpmjs/core@3.1.1) (2025-12-22)

### Bug Fixes

- ensure roles and connections are always resolved from defaults in getConnEnvOptions ([f73c20a](https://github.com/constructive-io/constructive/commit/f73c20ae869d6a1c43b3ffbb796053e43cce0d10))

# [3.1.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.0.9...@pgpmjs/core@3.1.0) (2025-12-22)

### Bug Fixes

- use proper PL/pgSQL variable declarations for role names ([6fb1da2](https://github.com/constructive-io/constructive/commit/6fb1da25f4d25d899199ed2616290f9d42ecf0e5))

### Features

- make role/user creation & grants concurrency-safe with optional advisory locks ([2868769](https://github.com/constructive-io/constructive/commit/2868769bbd81248ea428c0a5c6cd780d9c220928))
- unify role management into single dynamic implementation with configurable role names ([faf7dba](https://github.com/constructive-io/constructive/commit/faf7dbae3c3970772c5783e8443d09f1ca806322))

## [3.0.9](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.0.8...@pgpmjs/core@3.0.9) (2025-12-21)

**Note:** Version bump only for package @pgpmjs/core

## [3.0.8](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.0.7...@pgpmjs/core@3.0.8) (2025-12-21)

**Note:** Version bump only for package @pgpmjs/core

## [3.0.7](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.0.6...@pgpmjs/core@3.0.7) (2025-12-21)

### Bug Fixes

- clean up peerDeps and remove duplicate deps ([d807614](https://github.com/constructive-io/constructive/commit/d807614bd273a7e219e1787d857acf03f60cc255))
- remove @pgsql/types from peerDeps (only needed for dev) ([d7b54ed](https://github.com/constructive-io/constructive/commit/d7b54ed409252f0c551148cbe327780c63951252))

## [3.0.6](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.0.5...@pgpmjs/core@3.0.6) (2025-12-19)

**Note:** Version bump only for package @pgpmjs/core

## [3.0.5](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.0.4...@pgpmjs/core@3.0.5) (2025-12-18)

**Note:** Version bump only for package @pgpmjs/core

## [3.0.4](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@3.0.3...@pgpmjs/core@3.0.4) (2025-12-17)

**Note:** Version bump only for package @pgpmjs/core
