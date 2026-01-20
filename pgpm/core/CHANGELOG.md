# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.17.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.16.1...@pgpmjs/core@4.17.0) (2026-01-20)

**Note:** Version bump only for package @pgpmjs/core

## [4.16.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.16.0...@pgpmjs/core@4.16.1) (2026-01-19)

### Bug Fixes

- **export:** add missing is_public field to schema export config ([17a2d2a](https://github.com/constructive-io/constructive/commit/17a2d2aa443b63865e82ae174039801062ce2fae))

# [4.16.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.15.2...@pgpmjs/core@4.16.0) (2026-01-18)

**Note:** Version bump only for package @pgpmjs/core

## [4.15.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.15.1...@pgpmjs/core@4.15.2) (2026-01-18)

**Note:** Version bump only for package @pgpmjs/core

## [4.15.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.15.0...@pgpmjs/core@4.15.1) (2026-01-14)

**Note:** Version bump only for package @pgpmjs/core

# [4.15.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.14.0...@pgpmjs/core@4.15.0) (2026-01-14)

### Bug Fixes

- update export-meta.ts to use 'policy_type' instead of 'template' ([b30ddae](https://github.com/constructive-io/constructive/commit/b30ddae617228619b6500af304fa37a0c90ed436))

### Features

- update export flow for new metaschema tables and columns ([1de4ae5](https://github.com/constructive-io/constructive/commit/1de4ae52429391ac120d326d850cb273ee02fd55))

# [4.14.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.13.3...@pgpmjs/core@4.14.0) (2026-01-09)

### Bug Fixes

- update tests to match actual error output formatting behavior ([06fa326](https://github.com/constructive-io/constructive/commit/06fa3269c0b0cdbd3936ebc7da4101413959655d))

### Features

- **pgpm/core:** add smart error output collapsing and limiting ([ad02849](https://github.com/constructive-io/constructive/commit/ad02849f4482a0d409923b69d446f8daf06b04d0))

## [4.13.3](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.13.2...@pgpmjs/core@4.13.3) (2026-01-08)

### Bug Fixes

- **pgpm/core:** update export-meta.ts config to match actual metaschema table definitions ([e1addd0](https://github.com/constructive-io/constructive/commit/e1addd012d7d7ee755df6680b767e0e60542823a))

## [4.13.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.13.1...@pgpmjs/core@4.13.2) (2026-01-08)

### Bug Fixes

- **pgpm/core:** dynamically query table columns for export instead of hardcoded config ([e0c59b2](https://github.com/constructive-io/constructive/commit/e0c59b20130a9e6d4a8a5ebd0dff8fea703ed60f))

## [4.13.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.13.0...@pgpmjs/core@4.13.1) (2026-01-08)

**Note:** Version bump only for package @pgpmjs/core

# [4.13.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.12.2...@pgpmjs/core@4.13.0) (2026-01-08)

### Bug Fixes

- **export:** generate separate meta.sql files per table type ([10ba703](https://github.com/constructive-io/constructive/commit/10ba703f203a33c64b1f13c1bac9e73e14a8b029))

### Features

- **export:** generate separate meta.sql files for each schema type ([e3a65da](https://github.com/constructive-io/constructive/commit/e3a65dacb922a54f2b3747591d0ff3836c6717ff))

## [4.12.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.12.1...@pgpmjs/core@4.12.2) (2026-01-08)

### Bug Fixes

- remove extension table export (not scoped to database_id) ([3e80509](https://github.com/constructive-io/constructive/commit/3e805096794d108c4231b524de9cf03f1ab5fc07))

## [4.12.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.12.0...@pgpmjs/core@4.12.1) (2026-01-08)

### Bug Fixes

- scope extension export query by database_id via database_extension join ([e4ad67c](https://github.com/constructive-io/constructive/commit/e4ad67ce8c592536f804049876c8e5c78be636eb))
- use simple WHERE database_id clause for extension export ([295238e](https://github.com/constructive-io/constructive/commit/295238e7efad54801e4bb656f9748c7c44c0ec31))

# [4.12.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.11.0...@pgpmjs/core@4.12.0) (2026-01-08)

### Features

- **csv-to-pg:** add conflictDoNothing option for ON CONFLICT DO NOTHING ([735bfeb](https://github.com/constructive-io/constructive/commit/735bfebc5c4dfb2ee41460a920f2b0560b77a0c6))

# [4.11.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.10.1...@pgpmjs/core@4.11.0) (2026-01-08)

### Bug Fixes

- **core:** gracefully handle missing tables in exportMeta ([42cce5a](https://github.com/constructive-io/constructive/commit/42cce5adad29c5e45baa5bed7bcc0cc57fd87220))

### Features

- **core:** export all tables from metaschema_public, services_public, and metaschema_modules_public ([0fa6a1f](https://github.com/constructive-io/constructive/commit/0fa6a1f09766e4762f59a382e66efd32b59584e3))

## [4.10.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.10.0...@pgpmjs/core@4.10.1) (2026-01-07)

**Note:** Version bump only for package @pgpmjs/core

# [4.10.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.9.1...@pgpmjs/core@4.10.0) (2026-01-07)

### Features

- **pgpm:** support non-pgpm templates in init command ([1c8f8c6](https://github.com/constructive-io/constructive/commit/1c8f8c6b75db89687e3976aad00da1ddeded3ecc))

## [4.9.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.9.0...@pgpmjs/core@4.9.1) (2026-01-06)

**Note:** Version bump only for package @pgpmjs/core

# [4.9.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.8.0...@pgpmjs/core@4.9.0) (2026-01-05)

### Bug Fixes

- update outdated extension names from db-meta-_ to metaschema-_ ([a4961fd](https://github.com/constructive-io/constructive/commit/a4961fd09f3e92748c4c539d204c6df8cb21b436))

# [4.8.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.7.2...@pgpmjs/core@4.8.0) (2026-01-05)

### Bug Fixes

- **pgpm:** add database_id filter to sql_actions export query and skipSchemaRenaming option ([ef1860f](https://github.com/constructive-io/constructive/commit/ef1860f3946e8ba2f91ae90edaa6263a5666776d))

## [4.7.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.7.1...@pgpmjs/core@4.7.2) (2026-01-05)

### Bug Fixes

- rename collections_public -> metaschema_public, meta_public -> services_public in @pgpmjs/core ([85ed480](https://github.com/constructive-io/constructive/commit/85ed48016e0774f526e6f2fb10ab78fdc10736d0))
- update export-flow.test.ts to create metaschema_modules_public schema and tables ([757194c](https://github.com/constructive-io/constructive/commit/757194ce95a46a437a49040c39acdf8d865ca748))
- update export-meta.test.ts to use new schema names (metaschema_public, services_public) ([4b1ac0d](https://github.com/constructive-io/constructive/commit/4b1ac0da234e8e7255891e3b04d979c6354cf02a))
- update module tables to metaschema_modules_public schema ([9a9d58a](https://github.com/constructive-io/constructive/commit/9a9d58a6ee308e71efbf2a189df04c2cf123a524))
- update test fixtures to use new schema names (metaschema_public, services_public) ([4f0b7d8](https://github.com/constructive-io/constructive/commit/4f0b7d838e6b277352b55ceb430f16dabbffa441))

## [4.7.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.7.0...@pgpmjs/core@4.7.1) (2026-01-03)

### Bug Fixes

- **pgpm:** preserve original exception context in deploy/revert procedures ([07f17eb](https://github.com/constructive-io/constructive/commit/07f17eb415455896d21ff7440ee81e5927c1c63f))

# [4.7.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.6.3...@pgpmjs/core@4.7.0) (2026-01-02)

### Bug Fixes

- preserve PostgreSQL error diagnostics in pgpm_migrate stored procedures ([b54d144](https://github.com/constructive-io/constructive/commit/b54d14448ad83af614fea098e2971896d5a558f8))

### Features

- enhance PgpmMigrate thrown errors with extended PostgreSQL fields ([c3c2c33](https://github.com/constructive-io/constructive/commit/c3c2c333b7ad8737d0798e9e31c1f3ceed4c1af5))
- improve PostgreSQL error messages with extended fields ([6d2ef31](https://github.com/constructive-io/constructive/commit/6d2ef3174daae4db36e2ed1c54eb070f0d143ffd))

## [4.6.3](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.6.2...@pgpmjs/core@4.6.3) (2026-01-02)

**Note:** Version bump only for package @pgpmjs/core

## [4.6.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.6.1...@pgpmjs/core@4.6.2) (2025-12-31)

**Note:** Version bump only for package @pgpmjs/core

## [4.6.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.6.0...@pgpmjs/core@4.6.1) (2025-12-31)

**Note:** Version bump only for package @pgpmjs/core

# [4.6.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.5.4...@pgpmjs/core@4.6.0) (2025-12-31)

### Features

- **pgpm:** add outputDir option to initModule for explicit module directory control ([a37bb91](https://github.com/constructive-io/constructive/commit/a37bb910554a89dcd11e1baf1f0b539e0a95bd8a))

## [4.5.4](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.5.3...@pgpmjs/core@4.5.4) (2025-12-31)

**Note:** Version bump only for package @pgpmjs/core

## [4.5.3](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.5.2...@pgpmjs/core@4.5.3) (2025-12-31)

**Note:** Version bump only for package @pgpmjs/core

## [4.5.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.5.1...@pgpmjs/core@4.5.2) (2025-12-31)

**Note:** Version bump only for package @pgpmjs/core

## [4.5.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.5.0...@pgpmjs/core@4.5.1) (2025-12-31)

### Bug Fixes

- **pgpm:** fix AST round-trip diff comparison bug and add --outputDiff flag ([02ed48e](https://github.com/constructive-io/constructive/commit/02ed48e7649458fc1ade9397c5aba9d7a4eea722))

# [4.5.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.4.0...@pgpmjs/core@4.5.0) (2025-12-27)

### Features

- **pgpm:** use new upgradePrompt UI for interactive mode ([237f6e0](https://github.com/constructive-io/constructive/commit/237f6e01a849910a84adb69bb1df7396aeeaa0ce))

# [4.4.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.3.0...@pgpmjs/core@4.4.0) (2025-12-27)

### Bug Fixes

- **pgpm:** remove schema shims from pets fixture - use pgpm modules instead ([fa6ba66](https://github.com/constructive-io/constructive/commit/fa6ba66e35c1dcd49b32aa574913cc37ab897737))

### Features

- **extensions:** add vector (pgvector) to available extensions list ([e7136e0](https://github.com/constructive-io/constructive/commit/e7136e0440fbdaea91bad122679a406493211a00))

# [4.3.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.2.1...@pgpmjs/core@4.3.0) (2025-12-27)

### Features

- **pgpm:** add -w alias for --workspace flag and migrate to genomic ([d402038](https://github.com/constructive-io/constructive/commit/d402038f5791dcc3ec17003f956aae8057119294))

## [4.2.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.2.0...@pgpmjs/core@4.2.1) (2025-12-27)

### Bug Fixes

- **pgpm:** use workspace-level module detection for export flow ([2b02711](https://github.com/constructive-io/constructive/commit/2b0271160944c28bb08058474d4436da5b49c563))

# [4.2.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.1.2...@pgpmjs/core@4.2.0) (2025-12-27)

### Bug Fixes

- **pgpm:** change default access from 'public' to 'restricted' ([3a0ba34](https://github.com/constructive-io/constructive/commit/3a0ba347a092869b718c120c4888a9fe5474a287))
- **pgpm:** remove packageIdentifier from answers (no longer required) ([ad96963](https://github.com/constructive-io/constructive/commit/ad96963d265a3e4385b65289bbe910c99375c9c3))

### Features

- **pgpm:** add CLOSED license, comment out security-related dbname updates, rename sqitchDir to pgpmDir ([89d9156](https://github.com/constructive-io/constructive/commit/89d9156b741ac6bc4ff5c696b28fd7bf45b99043))
- **pgpm:** add interactive prompts for export flow ([68d69a3](https://github.com/constructive-io/constructive/commit/68d69a3e68c343db76beca8539a4238f1f657f74))
- **pgpm:** improve export command UX with smart defaults ([da34db0](https://github.com/constructive-io/constructive/commit/da34db00b021d0b6806d5e4c7c079ebf99bd5a02))

## [4.1.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.1.1...@pgpmjs/core@4.1.2) (2025-12-27)

### Bug Fixes

- update README badge paths and rename streaming/ to uploads/ ([63ff1b6](https://github.com/constructive-io/constructive/commit/63ff1b622f63289a41ff0e0dd80a01e6e7241be1))

## [4.1.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.1.0...@pgpmjs/core@4.1.1) (2025-12-26)

**Note:** Version bump only for package @pgpmjs/core

# [4.1.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/core@4.0.3...@pgpmjs/core@4.1.0) (2025-12-26)

### Features

- **pgpm:** make getAvailableModules and getAvailableExtensions async ([b6c8dbc](https://github.com/constructive-io/constructive/commit/b6c8dbcaeee751d6f120996cdc32dd9332f13298))
- **pgpm:** update core extensions and add architecture comment ([e19ee03](https://github.com/constructive-io/constructive/commit/e19ee03f1d99ed867eff95f27abcaa4bc8bb9570))

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
