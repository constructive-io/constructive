# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.7.0](https://github.com/constructive-io/constructive/compare/@constructive-sdk/cli@0.6.2...@constructive-sdk/cli@0.7.0) (2026-03-13)

### Features

- **codegen:** add optional condition generation toggle ([abe0e3e](https://github.com/constructive-io/constructive/commit/abe0e3efd00119ee9fb4265c6480799b4a5f62d4))

## [0.6.2](https://github.com/constructive-io/constructive/compare/@constructive-sdk/cli@0.6.1...@constructive-sdk/cli@0.6.2) (2026-03-12)

**Note:** Version bump only for package @constructive-sdk/cli

## [0.6.1](https://github.com/constructive-io/constructive/compare/@constructive-sdk/cli@0.5.0...@constructive-sdk/cli@0.6.1) (2026-03-12)

**Note:** Version bump only for package @constructive-sdk/cli

# [0.6.0](https://github.com/constructive-io/constructive/compare/@constructive-sdk/cli@0.5.0...@constructive-sdk/cli@0.6.0) (2026-03-12)

**Note:** Version bump only for package @constructive-sdk/cli

# [0.5.0](https://github.com/constructive-io/constructive/compare/@constructive-sdk/cli@0.4.0...@constructive-sdk/cli@0.5.0) (2026-03-12)

**Note:** Version bump only for package @constructive-sdk/cli

# [0.4.0](https://github.com/constructive-io/constructive/compare/@constructive-sdk/cli@0.3.0...@constructive-sdk/cli@0.4.0) (2026-03-12)

### Bug Fixes

- **codegen:** mark fields with backend defaults as optional in generated docs ([ac6d46e](https://github.com/constructive-io/constructive/commit/ac6d46e6db4a9ed2889d036009aa425e7bf07a9f))
- **codegen:** strip ConstructiveInternalType prefix from generated docs type names ([bc62778](https://github.com/constructive-io/constructive/commit/bc627789bbfd1bf20c1c42446895e38a9dafbfb7))

### Features

- **codegen:** semantic question types, INPUT_OBJECT dot-notation, --no-tty flag ([46156de](https://github.com/constructive-io/constructive/commit/46156deb156ed9d7adb14ab53b87b570cda072fc))
- **codegen:** update docs generators with INPUT_OBJECT dot-notation, TypeRegistry threading, and --no-tty docs ([e481604](https://github.com/constructive-io/constructive/commit/e481604c2e161d42b5b3eede54d164db55c5016e))
- regenerate CLI with inquirerer@4.7.0 (boolean/json types, dot-notation, --no-tty) ([6664ce5](https://github.com/constructive-io/constructive/commit/6664ce5a9fa989d1bcf62e7279b7c36e86aec27a))

### Reverts

- remove regenerated CLI code (needs inquirerer@4.7.0 with boolean/json types) ([bc830ef](https://github.com/constructive-io/constructive/commit/bc830efde66dbe1932e5ea221b31016d1d19d147))

# [0.3.0](https://github.com/constructive-io/constructive/compare/@constructive-sdk/cli@0.2.1...@constructive-sdk/cli@0.3.0) (2026-03-05)

### Bug Fixes

- add [@ts-nocheck](https://github.com/ts-nocheck) to generated CLI files until inquirerer skipPrompt is published ([ddd69cd](https://github.com/constructive-io/constructive/commit/ddd69cd9fe367ca9218ef56e392c994b65ffaabe)), closes [#68](https://github.com/constructive-io/constructive/issues/68)
- upgrade inquirerer to v4.6.0 and remove [@ts-nocheck](https://github.com/ts-nocheck) workaround ([c8316c5](https://github.com/constructive-io/constructive/commit/c8316c55acd4b5602840c1417d7c68de10693b76))

### Features

- **codegen:** emit skipPrompt: true for fields with backend-managed defaults ([9a8de1c](https://github.com/constructive-io/constructive/commit/9a8de1cebc2c44bcbdc91f2b3a3675d23f8532d7))

## [0.2.1](https://github.com/constructive-io/constructive/compare/@constructive-sdk/cli@0.2.0...@constructive-sdk/cli@0.2.1) (2026-03-05)

### Bug Fixes

- **codegen:** eliminate all CLI TypeScript compilation errors ([23e49e3](https://github.com/constructive-io/constructive/commit/23e49e3a4e7487be641cb0e585677e49dbba8e36))
- **codegen:** properly type CLI code - eliminate all TS errors ([5f07136](https://github.com/constructive-io/constructive/commit/5f07136e3f45e0066a3918ea30cfd732f444677a))
- **codegen:** restore handleGet for all tables with PKs, skip only for pure record types ([814e810](https://github.com/constructive-io/constructive/commit/814e81034e156a36d0b7e34855d9509468aef0b4))

# 0.2.0 (2026-03-05)

### Bug Fixes

- fix all codegen CLI template type errors, regenerate code, add skills ([746b6f7](https://github.com/constructive-io/constructive/commit/746b6f75cde69429e6380e861408e1a8a762c62f))
- regenerate CLI with csdk toolName, entryPoint, and ts-nocheck for generated code ([30c1384](https://github.com/constructive-io/constructive/commit/30c1384ce5f386de61ac69100bc93bc565d2182d))
- use shared schemaDir from constructive-sdk instead of copying schemas ([d447843](https://github.com/constructive-io/constructive/commit/d447843a5cb446c6afabd10fb9d648e7ab3fba09))

### Features

- add @constructive-io/cli SDK package ([7347388](https://github.com/constructive-io/constructive/commit/73473882d1957ccdfdf084bb10d21c08bb627872))
- add csdk CLI entry point with bin field ([1f4f38c](https://github.com/constructive-io/constructive/commit/1f4f38c390a92459533b1c5580d62968b3eba0c1))
- add schemaDir codegen infrastructure with GraphQL schemas and generate script ([c637590](https://github.com/constructive-io/constructive/commit/c6375901d2b6145e9fe011fff1c6ae7a5d9a6938))
