# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.5.0](https://github.com/constructive-io/constructive/compare/pgpm@2.4.1...pgpm@2.5.0) (2025-12-27)

### Features

- **pgpm:** add -w alias for --workspace flag and migrate to genomic ([d402038](https://github.com/constructive-io/constructive/commit/d402038f5791dcc3ec17003f956aae8057119294))

## [2.4.1](https://github.com/constructive-io/constructive/compare/pgpm@2.4.0...pgpm@2.4.1) (2025-12-27)

**Note:** Version bump only for package pgpm

# [2.4.0](https://github.com/constructive-io/constructive/compare/pgpm@2.3.0...pgpm@2.4.0) (2025-12-27)

### Features

- **pgpm:** add interactive prompts for export flow ([68d69a3](https://github.com/constructive-io/constructive/commit/68d69a3e68c343db76beca8539a4238f1f657f74))
- **pgpm:** improve export command UX with smart defaults ([da34db0](https://github.com/constructive-io/constructive/commit/da34db00b021d0b6806d5e4c7c079ebf99bd5a02))

# [2.3.0](https://github.com/constructive-io/constructive/compare/pgpm@2.2.1...pgpm@2.3.0) (2025-12-27)

### Bug Fixes

- **tests:** normalize package.json dependency versions in snapshot tests ([66792d3](https://github.com/constructive-io/constructive/commit/66792d3555bdba536544e7e29e52bd735958a333))

### Features

- **pgpm:** prompt to create workspace when running pgpm init outside workspace ([cc292ed](https://github.com/constructive-io/constructive/commit/cc292eda1a5c38fdea87c1588f46c8f6c25b4123))

## [2.2.1](https://github.com/constructive-io/constructive/compare/pgpm@2.2.0...pgpm@2.2.1) (2025-12-26)

**Note:** Version bump only for package pgpm

# [2.2.0](https://github.com/constructive-io/constructive/compare/pgpm@2.1.2...pgpm@2.2.0) (2025-12-26)

### Features

- **pgpm:** make getAvailableModules and getAvailableExtensions async ([b6c8dbc](https://github.com/constructive-io/constructive/commit/b6c8dbcaeee751d6f120996cdc32dd9332f13298))
- **pgpm:** update core extensions and add architecture comment ([e19ee03](https://github.com/constructive-io/constructive/commit/e19ee03f1d99ed867eff95f27abcaa4bc8bb9570))

## [2.1.2](https://github.com/constructive-io/constructive/compare/pgpm@2.1.1...pgpm@2.1.2) (2025-12-26)

### Bug Fixes

- pass prompter through export flow to avoid double Inquirerer instances ([90c93e7](https://github.com/constructive-io/constructive/commit/90c93e786e6c0d1bc34a522a1ab2a8924973bc20))
- **pgpm/cli:** use database name instead of UUID for default extension name ([87f1f72](https://github.com/constructive-io/constructive/commit/87f1f7208566ff0548d44f89040a8c90f32a4b01))

## [2.1.1](https://github.com/constructive-io/constructive/compare/pgpm@2.1.0...pgpm@2.1.1) (2025-12-26)

**Note:** Version bump only for package pgpm

# [2.1.0](https://github.com/constructive-io/constructive/compare/pgpm@2.0.0...pgpm@2.1.0) (2025-12-26)

### Bug Fixes

- **pgpm:** --dir bypasses .boilerplates.json resolution ([47aa24e](https://github.com/constructive-io/constructive/commit/47aa24e5dc5fdc33ca765659f6dd286c488149cc))
- **pgpm:** address feedback on --boilerplate implementation ([0b3493d](https://github.com/constructive-io/constructive/commit/0b3493dd708111164fa82f9320328ec291108fe7))
- **pgpm:** use autocomplete instead of list for boilerplate selection ([eef53bd](https://github.com/constructive-io/constructive/commit/eef53bd455e8dda8ca5eb6ef72f0d02231896093))

### Features

- **pgpm:** add --boilerplate flag to prompt for boilerplate selection ([c478018](https://github.com/constructive-io/constructive/commit/c478018e83d76f35046e59ce7ccba5d266479d50))

# [2.0.0](https://github.com/constructive-io/constructive/compare/pgpm@1.4.2...pgpm@2.0.0) (2025-12-25)

### Bug Fixes

- **pgpm:** update help text to use <variant> and move inquirerer to devDependencies ([b925480](https://github.com/constructive-io/constructive/commit/b92548012273ef831e649c5200bf86e1eb182131))

### Features

- **pgpm:** implement metadata-driven single entry point for init ([b57fe8f](https://github.com/constructive-io/constructive/commit/b57fe8f15970bcc0521625b84f0e4305391cbc65))

### BREAKING CHANGES

- **pgpm:** scaffoldTemplate() now uses fromPath instead of type parameter

## [1.4.2](https://github.com/constructive-io/constructive/compare/pgpm@1.4.1...pgpm@1.4.2) (2025-12-25)

**Note:** Version bump only for package pgpm

## [1.4.1](https://github.com/constructive-io/constructive/compare/pgpm@1.4.0...pgpm@1.4.1) (2025-12-25)

**Note:** Version bump only for package pgpm

# [1.4.0](https://github.com/constructive-io/constructive/compare/pgpm@1.3.0...pgpm@1.4.0) (2025-12-25)

### Bug Fixes

- **pgpm:** add missing commands to help output ([fb21c52](https://github.com/constructive-io/constructive/commit/fb21c52ea973c11bb928b7c997c5fba654cd81b3))

### Features

- add .motd support and ASCII art after module scaffolding ([1b1d5b3](https://github.com/constructive-io/constructive/commit/1b1d5b3a9f6782187473aafcbf1daa4a2821b54c))
- add .motd support and default ASCII art after workspace scaffolding ([c0ae6ab](https://github.com/constructive-io/constructive/commit/c0ae6abf99198a83824019c097bfeed7a3d9c6b8))

# [1.3.0](https://github.com/constructive-io/constructive/compare/pgpm@1.2.2...pgpm@1.3.0) (2025-12-25)

### Features

- **pgpm:** add --workspace flag to upgrade-modules command ([cbff1f6](https://github.com/constructive-io/constructive/commit/cbff1f6274b7e2b29c2682c41bf2572d9dd90ace))

## [1.2.2](https://github.com/constructive-io/constructive/compare/pgpm@1.2.1...pgpm@1.2.2) (2025-12-24)

**Note:** Version bump only for package pgpm

## [1.2.1](https://github.com/constructive-io/constructive/compare/pgpm@1.2.0...pgpm@1.2.1) (2025-12-24)

**Note:** Version bump only for package pgpm

# [1.2.0](https://github.com/constructive-io/constructive/compare/pgpm@1.1.5...pgpm@1.2.0) (2025-12-24)

### Features

- **pgpm:** add test-packages command for integration testing ([3c13ab9](https://github.com/constructive-io/constructive/commit/3c13ab98ddbb1a6ee214f1a472b2c02860edbe56)), closes [constructive-io/projects-issues#375](https://github.com/constructive-io/projects-issues/issues/375)

## [1.1.5](https://github.com/constructive-io/constructive/compare/pgpm@1.1.4...pgpm@1.1.5) (2025-12-24)

**Note:** Version bump only for package pgpm

## [1.1.4](https://github.com/constructive-io/constructive/compare/pgpm@1.1.3...pgpm@1.1.4) (2025-12-23)

**Note:** Version bump only for package pgpm

## [1.1.3](https://github.com/constructive-io/constructive/compare/pgpm@1.1.2...pgpm@1.1.3) (2025-12-22)

**Note:** Version bump only for package pgpm

## [1.1.2](https://github.com/constructive-io/constructive/compare/pgpm@1.1.1...pgpm@1.1.2) (2025-12-22)

**Note:** Version bump only for package pgpm

## [1.1.1](https://github.com/constructive-io/constructive/compare/pgpm@1.1.0...pgpm@1.1.1) (2025-12-21)

**Note:** Version bump only for package pgpm

# [1.1.0](https://github.com/constructive-io/constructive/compare/pgpm@1.0.6...pgpm@1.1.0) (2025-12-21)

### Features

- **pgpm:** add workspace.dirname resolver for boilerplate templates ([e42ee61](https://github.com/constructive-io/constructive/commit/e42ee611d2a62d0ce911b1820ccea0011ef50e75))

## [1.0.6](https://github.com/constructive-io/constructive/compare/pgpm@1.0.5...pgpm@1.0.6) (2025-12-21)

**Note:** Version bump only for package pgpm

## [1.0.5](https://github.com/constructive-io/constructive/compare/pgpm@1.0.4...pgpm@1.0.5) (2025-12-21)

**Note:** Version bump only for package pgpm

## [1.0.4](https://github.com/constructive-io/constructive/compare/pgpm@1.0.3...pgpm@1.0.4) (2025-12-19)

**Note:** Version bump only for package pgpm

## [1.0.3](https://github.com/constructive-io/constructive/compare/pgpm@1.0.2...pgpm@1.0.3) (2025-12-18)

**Note:** Version bump only for package pgpm

## [1.0.2](https://github.com/constructive-io/constructive/compare/pgpm@1.0.1...pgpm@1.0.2) (2025-12-17)

**Note:** Version bump only for package pgpm
