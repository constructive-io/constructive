# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
