# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [4.1.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@4.1.0...@constructive-io/graphql-codegen@4.1.1) (2026-02-19)

**Note:** Version bump only for package @constructive-io/graphql-codegen

# [4.1.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@4.0.2...@constructive-io/graphql-codegen@4.1.0) (2026-02-19)

### Bug Fixes

- **codegen:** export generateMulti and fix multi-target executor import paths ([ef638ad](https://github.com/constructive-io/constructive/commit/ef638ade062520cd6ca9f9ffe11fd9196424536b))

### Features

- add graphile-schema package, README headers/footers, and --schema-only tests ([4587027](https://github.com/constructive-io/constructive/commit/458702780393dd4ca514e311d10f11143ee7a254))
- **codegen:** add CLI command generator from GraphQL schema ([be959f7](https://github.com/constructive-io/constructive/commit/be959f7388aae147369b3f080bd0bc0aa7aa4429))
- **codegen:** add configurable docs generation (README, AGENTS.md, MCP, Skills) ([1fe5255](https://github.com/constructive-io/constructive/commit/1fe5255398d7dda4ed5ead956b29717357a737fb))
- **codegen:** add docs generation for ORM, React Query, and multi-target support ([0fb16ea](https://github.com/constructive-io/constructive/commit/0fb16ea4187d9fb2d88fb80401908c211ffcdd9a))
- **codegen:** add multi-target CLI docs generation (README, AGENTS.md, MCP, skills) ([5288230](https://github.com/constructive-io/constructive/commit/5288230b2dc1ee05a486daabd08f179c5582325d))
- **codegen:** add schemaDir multi-target expansion, unit tests, unify cnc codegen as thin wrapper ([44097ee](https://github.com/constructive-io/constructive/commit/44097ee2fa72369eb12373f19429ed5f7ed4c859))
- **codegen:** add shared PGPM ephemeral DB, multi-target cnc codegen, and export-schema command ([d05e763](https://github.com/constructive-io/constructive/commit/d05e7632464ba6df3a5883127d3bae3eee0d388c))
- **codegen:** add unified multi-target CLI architecture ([0b15004](https://github.com/constructive-io/constructive/commit/0b1500404867136d7375b832a6c051ffc9aac85a))
- **codegen:** apiNames auto-expansion to multi-target, --schema-only flag, remove redundant commands ([b1396bc](https://github.com/constructive-io/constructive/commit/b1396bcf0d238ae425c3a771ab07e460833a8c2f))
- **codegen:** generate README.md and COMMANDS.md for CLI ([fde91f9](https://github.com/constructive-io/constructive/commit/fde91f9fc7e60f60688da7186faa69084650666e))

## [4.0.2](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@4.0.1...@constructive-io/graphql-codegen@4.0.2) (2026-02-15)

### Bug Fixes

- **codegen:** use deepmerge for CLI config merging ([5c6279f](https://github.com/constructive-io/constructive/commit/5c6279f2e5f5e9a35f7bedf44b401eb394cf6eca))

## [4.0.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@4.0.0...@constructive-io/graphql-codegen@4.0.1) (2026-02-15)

### Bug Fixes

- **codegen:** preserve db.pgpm when merging CLI args with file config ([a4d7028](https://github.com/constructive-io/constructive/commit/a4d7028be1b2ada6ce7a4e5adec4cfdd06a29441))

# [4.0.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.3.2...@constructive-io/graphql-codegen@4.0.0) (2026-02-13)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [3.3.2](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.3.1...@constructive-io/graphql-codegen@3.3.2) (2026-02-13)

### Bug Fixes

- **pgpm:** use clearUpdateCache from @inquirerer/utils and bump to 3.2.3 ([0704cbe](https://github.com/constructive-io/constructive/commit/0704cbea539f2d984f649c9fc38595044e54b1b1))

## [3.3.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.3.0...@constructive-io/graphql-codegen@3.3.1) (2026-02-13)

**Note:** Version bump only for package @constructive-io/graphql-codegen

# [3.3.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.2.1...@constructive-io/graphql-codegen@3.3.0) (2026-02-09)

### Bug Fixes

- **codegen-cli:** honor source flags and config overrides ([4fac2c1](https://github.com/constructive-io/constructive/commit/4fac2c18346c9cd24a6d6fb213b4ef29d21854e8))
- **codegen:** convert string concatenation to Babel AST and template-copy patterns ([d2e7480](https://github.com/constructive-io/constructive/commit/d2e748028fa4e1271cb35e1366a1018f1ad957b9))
- **codegen:** prune stale generated files ([1534338](https://github.com/constructive-io/constructive/commit/15343383668467b4461a86b183c527b7362973b2))

### Features

- **codegen:** add fire-and-forget overload for delete hooks (clientMutationId default) ([6cce350](https://github.com/constructive-io/constructive/commit/6cce350b4e8079e10de87751621c4a16561f41f9))
- **graphql-codegen:** unify ORM and RQ selection core ([b5eb861](https://github.com/constructive-io/constructive/commit/b5eb861201bca561c0604b6e3e74ee3689a25da7))

## [3.2.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.2.0...@constructive-io/graphql-codegen@3.2.1) (2026-02-02)

**Note:** Version bump only for package @constructive-io/graphql-codegen

# [3.2.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.1.4...@constructive-io/graphql-codegen@3.2.0) (2026-01-29)

### Features

- **codegen:** add getHeaders callback for dynamic request headers ([374a91d](https://github.com/constructive-io/constructive/commit/374a91d4b4413c290ee7cd9cb433f7f14d38e4be))

## [3.1.4](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.1.3...@constructive-io/graphql-codegen@3.1.4) (2026-01-28)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [3.1.3](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.1.2...@constructive-io/graphql-codegen@3.1.3) (2026-01-27)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [3.1.2](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.1.1...@constructive-io/graphql-codegen@3.1.2) (2026-01-27)

### Bug Fixes

- **graphql-codegen:** improve error messages and use programmatic oxfmt API ([6922023](https://github.com/constructive-io/constructive/commit/6922023e217d4244e767791ae2aac5426811c6e0))

## [3.1.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.1.0...@constructive-io/graphql-codegen@3.1.1) (2026-01-27)

**Note:** Version bump only for package @constructive-io/graphql-codegen

# [3.1.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.0.4...@constructive-io/graphql-codegen@3.1.0) (2026-01-27)

### Bug Fixes

- **graphql-codegen:** use undici fetch and fix DNS lookup callback ([05f76b2](https://github.com/constructive-io/constructive/commit/05f76b28cc45c6c1ae821d8c00e2a891dadbe0e9))

### Features

- **graphql-codegen:** add browserCompatible option for runtime fetch ([3d87204](https://github.com/constructive-io/constructive/commit/3d8720422f476edf6d4b92e6063675459a31c94b))

## [3.0.4](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.0.3...@constructive-io/graphql-codegen@3.0.4) (2026-01-26)

### Bug Fixes

- **graphql-codegen:** generate barrel file for ORM-only mode ([52508bd](https://github.com/constructive-io/constructive/commit/52508bd86076b2a76de5a26821f1aac357de02ad))

## [3.0.3](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.0.2...@constructive-io/graphql-codegen@3.0.3) (2026-01-25)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [3.0.2](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.0.1...@constructive-io/graphql-codegen@3.0.2) (2026-01-24)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [3.0.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@3.0.0...@constructive-io/graphql-codegen@3.0.1) (2026-01-24)

**Note:** Version bump only for package @constructive-io/graphql-codegen

# [3.0.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.32.0...@constructive-io/graphql-codegen@3.0.0) (2026-01-24)

### Bug Fixes

- **cli:** set reactQuery default to false to match agreed defaults ([e0f4571](https://github.com/constructive-io/constructive/commit/e0f45717261a63a7f559a19cdf557338d932c1bc))
- **graphql-codegen:** remove non-existent type exports from index.ts ([5b8ad1a](https://github.com/constructive-io/constructive/commit/5b8ad1ab8b7a84ebd5ef49ed36a54c92ad101330))

### Features

- **graphql-codegen:** add apiNames support for automatic schema discovery ([b925092](https://github.com/constructive-io/constructive/commit/b92509283038d945789fe0ddcf978c0e4c219b40))
- **graphql-codegen:** add localhost DNS resolution for \*.localhost endpoints during introspection ([6d9cd87](https://github.com/constructive-io/constructive/commit/6d9cd87ecd2e67e47d190faf44f270dbba333b93))
- **graphql-codegen:** add minimal multi-target support with named configs ([bbbd062](https://github.com/constructive-io/constructive/commit/bbbd062331e5afb6302d5d9e9224894cc3c92a11))
- **graphql-codegen:** add PGPM module schema source support ([d042f9c](https://github.com/constructive-io/constructive/commit/d042f9c8a68b3636c1f3d92ad01803c9246f05b3))
- **graphql-codegen:** add shared types pipeline and make generateReactQuery/generateOrm private ([b219348](https://github.com/constructive-io/constructive/commit/b219348cc15fdff8c30cd19f21054601e14b7acd))
- **graphql-codegen:** add single-step database generation support ([3130c67](https://github.com/constructive-io/constructive/commit/3130c67bc5b57ebe5beecca8128e92aad9daeaa6))
- **graphql-codegen:** add unified generate function with --reactquery and --orm flags ([5a66484](https://github.com/constructive-io/constructive/commit/5a664841cae12ffab7fd2a33fdb8d887e75ea885))

# [2.32.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.31.0...@constructive-io/graphql-codegen@2.32.0) (2026-01-22)

### Features

- **graphql-codegen:** add systemExclude field and clean up resolveConfig ([0dc623e](https://github.com/constructive-io/constructive/commit/0dc623e8bd538f6654b81fa290f7a9a9082b3307))

# [2.31.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.30.0...@constructive-io/graphql-codegen@2.31.0) (2026-01-22)

### Features

- **cli:** improve codegen command with ORM mode and config file support ([8726489](https://github.com/constructive-io/constructive/commit/872648970e0994a82b170b3f969cbcf365e65679))

### Performance Improvements

- **graphql-codegen:** use graphql.web for smaller ORM SDK bundle ([09a4d20](https://github.com/constructive-io/constructive/commit/09a4d2059a678686e7ae83e883e7a5acfa4f5b51))

# [2.30.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.29.0...@constructive-io/graphql-codegen@2.30.0) (2026-01-22)

### Features

- **graphql-types:** add GraphQLAdapter interface and types ([439696e](https://github.com/constructive-io/constructive/commit/439696e8c423bd2726a5a9e1d4a1362315d0313b))

# [2.29.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.28.5...@constructive-io/graphql-codegen@2.29.0) (2026-01-21)

### Features

- **codegen:** add pluggable GraphQL adapter pattern ([3b51bac](https://github.com/constructive-io/constructive/commit/3b51bac29d1c848af8e1d1bb60cd5b6887db230f))

## [2.28.5](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.28.4...@constructive-io/graphql-codegen@2.28.5) (2026-01-21)

### Bug Fixes

- **graphql-codegen:** re-export models and custom operations from index.ts ([e63af2e](https://github.com/constructive-io/constructive/commit/e63af2e8e9c91a15dae8ad20204d5dfafd732c32))

## [2.28.4](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.28.3...@constructive-io/graphql-codegen@2.28.4) (2026-01-21)

### Bug Fixes

- **graphql-codegen:** copy query-builder.ts to dist during build ([3bc5595](https://github.com/constructive-io/constructive/commit/3bc5595a48c93b3ed7542cd2fd50dc5184623034))

## [2.28.3](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.28.2...@constructive-io/graphql-codegen@2.28.3) (2026-01-21)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.28.2](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.28.1...@constructive-io/graphql-codegen@2.28.2) (2026-01-20)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.28.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.28.0...@constructive-io/graphql-codegen@2.28.1) (2026-01-20)

### Bug Fixes

- **codegen:** remove deleted{Entity}NodeId field from delete mutations ([63929a2](https://github.com/constructive-io/constructive/commit/63929a2421e6fcd68fb107ef4d45a30359e6af4f))
- **codegen:** use correct deleted{Entity}NodeId field in delete mutations ([6785de2](https://github.com/constructive-io/constructive/commit/6785de272bd55d489ab91a8d5fe630f274ce9b45))

# [2.28.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.27.3...@constructive-io/graphql-codegen@2.28.0) (2026-01-20)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.27.3](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.27.2...@constructive-io/graphql-codegen@2.27.3) (2026-01-20)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.27.2](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.27.1...@constructive-io/graphql-codegen@2.27.2) (2026-01-19)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.27.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.27.0...@constructive-io/graphql-codegen@2.27.1) (2026-01-18)

### Bug Fixes

- **codegen:** correct example script paths in package.json ([1eff799](https://github.com/constructive-io/constructive/commit/1eff7998c7b0f9f78f3e92a7769b9311f7db40e3))

# [2.27.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.26.0...@constructive-io/graphql-codegen@2.27.0) (2026-01-18)

**Note:** Version bump only for package @constructive-io/graphql-codegen

# [2.26.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.25.0...@constructive-io/graphql-codegen@2.26.0) (2026-01-18)

### Bug Fixes

- **codegen:** add DeepExact for strict select type validation ([11790c7](https://github.com/constructive-io/constructive/commit/11790c79c5ea5a7f6fd0c0a6219cffb58ac40a04))

### Features

- **codegen:** add command timing to CLI output ([6322af2](https://github.com/constructive-io/constructive/commit/6322af2c0f84decaf6dd0a9da1e6db181e24d29c))

# [2.25.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.24.1...@constructive-io/graphql-codegen@2.25.0) (2026-01-18)

### Features

- **codegen:** add multi-target config support ([5cd0ef3](https://github.com/constructive-io/constructive/commit/5cd0ef31207382763657203b638aa006b8785050))

## [2.24.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.24.0...@constructive-io/graphql-codegen@2.24.1) (2026-01-15)

### Bug Fixes

- **codegen:** add generic type params to execute() calls and import table types ([fde9c62](https://github.com/constructive-io/constructive/commit/fde9c6224c3f5791ddcb9f96bfee6fd23e04e006))
- **codegen:** add missing pagination variables and handle composite keys ([09523e9](https://github.com/constructive-io/constructive/commit/09523e9447c1d3bafd1dee6e6cc8d3e990a4d24b))

# [2.24.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.23.3...@constructive-io/graphql-codegen@2.24.0) (2026-01-14)

### Features

- **codegen:** add query keys factory pattern for codegen RQ mode ([f8c3cab](https://github.com/constructive-io/constructive/commit/f8c3cabfeb1b5c27ad5dd70393f19fed916b3ccc))

## [2.23.3](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.23.2...@constructive-io/graphql-codegen@2.23.3) (2026-01-09)

### Bug Fixes

- react query mode output should be default for generate ([#593](https://github.com/constructive-io/constructive/issues/593)) ([e63f839](https://github.com/constructive-io/constructive/commit/e63f8397b479daf2081e43ef9d160da66de794f0))

## [2.23.2](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.23.1...@constructive-io/graphql-codegen@2.23.2) (2026-01-07)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.23.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.23.0...@constructive-io/graphql-codegen@2.23.1) (2026-01-07)

**Note:** Version bump only for package @constructive-io/graphql-codegen

# [2.23.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.22.1...@constructive-io/graphql-codegen@2.23.0) (2026-01-07)

### Features

- codegen source modes ([922f943](https://github.com/constructive-io/constructive/commit/922f943d6bd45c5a6e0ea8192101b310241a7b36))

## [2.22.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.22.0...@constructive-io/graphql-codegen@2.22.1) (2026-01-07)

### Bug Fixes

- upgrade inflection to v3.0.2 and update imports to use named exports ([4e6bf94](https://github.com/constructive-io/constructive/commit/4e6bf94749437bb0594e83dfe30bd34a2d69bb97)), closes [#571](https://github.com/constructive-io/constructive/issues/571)

# [2.22.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.21.0...@constructive-io/graphql-codegen@2.22.0) (2026-01-07)

### Bug Fixes

- align @constructive-io/graphql-codegen to graphql@15.10.1 ([009a31b](https://github.com/constructive-io/constructive/commit/009a31ba76aa91c01f9df3e609d3eb3168588b97))
- headers set ([795be0f](https://github.com/constructive-io/constructive/commit/795be0f444b2f3da00de76c83b3fb79690f2d45a))

### Features

- improve the codegen logic to be more robust and fixes bugs ([e407e1d](https://github.com/constructive-io/constructive/commit/e407e1da6a16252c1b1a9962cc6c8180080340e4))

# [2.21.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.20.1...@constructive-io/graphql-codegen@2.21.0) (2026-01-07)

### Features

- **graphql-codegen:** make React Query optional with config flag ([07c5ccc](https://github.com/constructive-io/constructive/commit/07c5ccc404aec3c66fe5e6680d465a9fcbc26f68))

## [2.20.1](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.20.0...@constructive-io/graphql-codegen@2.20.1) (2026-01-06)

### Bug Fixes

- wrong bin entry ([f80ae2c](https://github.com/constructive-io/constructive/commit/f80ae2c0a4f096d382c28a2d0917acd2a1f563cf))

# [2.20.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.19.0...@constructive-io/graphql-codegen@2.20.0) (2026-01-06)

### Bug Fixes

- **graphql-codegen:** remove bin wrapper that imports from dist ([98061b5](https://github.com/constructive-io/constructive/commit/98061b58c508b98f326426448365660a2b5680d7))
- **graphql-codegen:** use publishConfig.directory pattern like pgpm/cnc ([2821ad9](https://github.com/constructive-io/constructive/commit/2821ad9901364ae0cbd94cc3f3b9fbcc5c7d5db4))

### Features

- upstream new codegen cli ([e30a7f9](https://github.com/constructive-io/constructive/commit/e30a7f9274db2b432d77111f07eede7318c1deed))

# [2.19.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.18.0...@constructive-io/graphql-codegen@2.19.0) (2026-01-05)

**Note:** Version bump only for package @constructive-io/graphql-codegen

# [2.18.0](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.50...@constructive-io/graphql-codegen@2.18.0) (2026-01-05)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.50](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.49...@constructive-io/graphql-codegen@2.17.50) (2026-01-05)

### BREAKING CHANGES

- **Complete package migration**: This package has been completely replaced with the code from `@constructive-io/graphql-sdk` (dashboard/packages/graphql-sdk)
- New CLI-based GraphQL SDK generator for PostGraphile endpoints with React Query hooks and Prisma-like ORM support
- Build system changed from `makage` to `tsup`
- Test framework changed from `jest` to `jest` (with ESM support)
- New CLI binary: `graphql-codegen`
- Added peer dependencies: `@tanstack/react-query`, `react`
- Uses workspace dependency for `gql-ast`

### Features

- CLI commands: `init`, `generate`, `generate-orm`
- React Query hooks generation
- Prisma-like ORM client generation
- Watch mode with schema change detection
- Full TypeScript support with type inference

---

## [2.17.49](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.49...@constructive-io/graphql-codegen@2.17.50) (2026-01-04)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.48](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.47...@constructive-io/graphql-codegen@2.17.48) (2026-01-03)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.47](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.46...@constructive-io/graphql-codegen@2.17.47) (2026-01-02)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.46](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.45...@constructive-io/graphql-codegen@2.17.46) (2026-01-02)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.45](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.44...@constructive-io/graphql-codegen@2.17.45) (2025-12-31)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.44](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.43...@constructive-io/graphql-codegen@2.17.44) (2025-12-31)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.43](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.42...@constructive-io/graphql-codegen@2.17.43) (2025-12-31)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.42](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.41...@constructive-io/graphql-codegen@2.17.42) (2025-12-31)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.41](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.40...@constructive-io/graphql-codegen@2.17.41) (2025-12-31)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.40](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.39...@constructive-io/graphql-codegen@2.17.40) (2025-12-31)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.39](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.38...@constructive-io/graphql-codegen@2.17.39) (2025-12-31)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.38](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.37...@constructive-io/graphql-codegen@2.17.38) (2025-12-27)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.37](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.36...@constructive-io/graphql-codegen@2.17.37) (2025-12-27)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.36](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.35...@constructive-io/graphql-codegen@2.17.36) (2025-12-27)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.35](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.34...@constructive-io/graphql-codegen@2.17.35) (2025-12-27)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.34](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.33...@constructive-io/graphql-codegen@2.17.34) (2025-12-27)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.33](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.32...@constructive-io/graphql-codegen@2.17.33) (2025-12-27)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.32](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.31...@constructive-io/graphql-codegen@2.17.32) (2025-12-26)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.31](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.30...@constructive-io/graphql-codegen@2.17.31) (2025-12-26)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.30](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.29...@constructive-io/graphql-codegen@2.17.30) (2025-12-26)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.29](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.28...@constructive-io/graphql-codegen@2.17.29) (2025-12-26)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.28](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.27...@constructive-io/graphql-codegen@2.17.28) (2025-12-26)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.27](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.26...@constructive-io/graphql-codegen@2.17.27) (2025-12-26)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.26](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.25...@constructive-io/graphql-codegen@2.17.26) (2025-12-25)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.25](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.24...@constructive-io/graphql-codegen@2.17.25) (2025-12-25)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.24](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.23...@constructive-io/graphql-codegen@2.17.24) (2025-12-25)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.23](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.22...@constructive-io/graphql-codegen@2.17.23) (2025-12-25)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.22](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.21...@constructive-io/graphql-codegen@2.17.22) (2025-12-24)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.21](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.20...@constructive-io/graphql-codegen@2.17.21) (2025-12-24)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.20](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.19...@constructive-io/graphql-codegen@2.17.20) (2025-12-24)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.19](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.18...@constructive-io/graphql-codegen@2.17.19) (2025-12-24)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.18](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.17...@constructive-io/graphql-codegen@2.17.18) (2025-12-24)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.17](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.16...@constructive-io/graphql-codegen@2.17.17) (2025-12-23)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.16](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.15...@constructive-io/graphql-codegen@2.17.16) (2025-12-22)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.15](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.14...@constructive-io/graphql-codegen@2.17.15) (2025-12-22)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.14](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.13...@constructive-io/graphql-codegen@2.17.14) (2025-12-21)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.13](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.12...@constructive-io/graphql-codegen@2.17.13) (2025-12-21)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.12](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.11...@constructive-io/graphql-codegen@2.17.12) (2025-12-21)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## 2.17.11 (2025-12-19)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.10](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.9...@constructive-io/graphql-codegen@2.17.10) (2025-12-18)

**Note:** Version bump only for package @constructive-io/graphql-codegen

## [2.17.9](https://github.com/constructive-io/constructive/compare/@constructive-io/graphql-codegen@2.17.8...@constructive-io/graphql-codegen@2.17.9) (2025-12-17)

**Note:** Version bump only for package @constructive-io/graphql-codegen
