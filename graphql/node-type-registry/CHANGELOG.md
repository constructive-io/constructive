# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.9.0](https://github.com/constructive-io/constructive/compare/node-type-registry@0.8.0...node-type-registry@0.9.0) (2026-04-01)

### Features

- update RelationManyToMany types - replace node_type/node_data with nodes[] array ([a2d9075](https://github.com/constructive-io/constructive/commit/a2d907584d677c9f6114f093e02e44b08163863e)), closes [#723](https://github.com/constructive-io/constructive/issues/723)

# [0.8.0](https://github.com/constructive-io/constructive/compare/node-type-registry@0.7.1...node-type-registry@0.8.0) (2026-03-31)

### Bug Fixes

- change BlueprintPolicy.policy_type to $type to match SQL convention ([ff94a16](https://github.com/constructive-io/constructive/commit/ff94a162fe7c94d3e823dbc45d7a5651478c997a))

### Features

- add table-level BlueprintTableIndex, BlueprintTableFullTextSearch, BlueprintTableUniqueConstraint types ([142443f](https://github.com/constructive-io/constructive/commit/142443febe5cbb888362435bb4f320f2ac4621dd))
- move node-type-registry to graphql/ and update for blueprint redesign ([7e17fae](https://github.com/constructive-io/constructive/commit/7e17faeb4b5f97868e5f50ebb9f09bdafa4e8081)), closes [#721](https://github.com/constructive-io/constructive/issues/721)

## [0.7.1](https://github.com/constructive-io/constructive/compare/node-type-registry@0.7.0...node-type-registry@0.7.1) (2026-03-31)

**Note:** Version bump only for package node-type-registry

# [0.7.0](https://github.com/constructive-io/constructive/compare/node-type-registry@0.6.2...node-type-registry@0.7.0) (2026-03-30)

### Features

- **node-type-registry:** add chunks property to DataEmbedding and DataSearch embedding params ([b1e3bce](https://github.com/constructive-io/constructive/commit/b1e3bce678714975e6c4487f99d7258c8a6ff7a3))

## [0.6.2](https://github.com/constructive-io/constructive/compare/node-type-registry@0.6.1...node-type-registry@0.6.2) (2026-03-30)

**Note:** Version bump only for package node-type-registry

## [0.6.1](https://github.com/constructive-io/constructive/compare/node-type-registry@0.6.0...node-type-registry@0.6.1) (2026-03-28)

### Bug Fixes

- **node-type-registry:** grant_privileges type is string[][] not string[] ([c749f96](https://github.com/constructive-io/constructive/commit/c749f961a11dbc2d8d39befdbe457f1b0ef2ace6))

# [0.6.0](https://github.com/constructive-io/constructive/compare/node-type-registry@0.5.1...node-type-registry@0.6.0) (2026-03-27)

### Bug Fixes

- avoid variable shadow in findTable (t -> tbl) ([f06802f](https://github.com/constructive-io/constructive/commit/f06802f11f8461d003f4c9690939e33f422f274b))

### Features

- **node-type-registry:** derive structural types from introspection JSON ([8231dc9](https://github.com/constructive-io/constructive/commit/8231dc905a1be1da1eb3c06ab4c7b349d9630523))

## [0.5.1](https://github.com/constructive-io/constructive/compare/node-type-registry@0.5.0...node-type-registry@0.5.1) (2026-03-27)

### Bug Fixes

- **node-type-registry:** BlueprintField uses is_required, not is_not_null ([8d000bf](https://github.com/constructive-io/constructive/commit/8d000bfba83495bfc481f061b34af16b1d1a5048))

# [0.5.0](https://github.com/constructive-io/constructive/compare/node-type-registry@0.4.0...node-type-registry@0.5.0) (2026-03-26)

### Bug Fixes

- delete preset.ts and remove unused graphile-settings/graphile-config deps from node-type-registry ([88d507d](https://github.com/constructive-io/constructive/commit/88d507d8084c992443d7afd46d478dd627f108e5))

### Features

- **node-type-registry:** add blueprint type codegen — generates TS types from node type definitions ([6490291](https://github.com/constructive-io/constructive/commit/649029106322baeedda4ce33ed195d0c3029d252))

# [0.4.0](https://github.com/constructive-io/constructive/compare/node-type-registry@0.3.1...node-type-registry@0.4.0) (2026-03-26)

### Bug Fixes

- **node-type-registry:** remove tx wrappers, add generated-file header with regen command ([e1dce46](https://github.com/constructive-io/constructive/commit/e1dce4662c26f13588eaf9a82edf17d6db8b8d5e))

### Features

- **node-type-registry:** extend generate-seed.ts to emit pgpm deploy/revert/verify files ([fee1211](https://github.com/constructive-io/constructive/commit/fee1211f32d5ae7225f1ab2e8397c4b42c0c4b04))

## [0.3.1](https://github.com/constructive-io/constructive/compare/node-type-registry@0.3.0...node-type-registry@0.3.1) (2026-03-26)

**Note:** Version bump only for package node-type-registry

# [0.3.0](https://github.com/constructive-io/constructive/compare/node-type-registry@0.2.2...node-type-registry@0.3.0) (2026-03-26)

### Features

- **node-type-registry:** add DataInheritFromParent, DataForceCurrentUser, DataImmutableFields ([066ff6d](https://github.com/constructive-io/constructive/commit/066ff6d09085c0dd562de8e3e8adf60d18442404))
- **node-type-registry:** sync with latest seed.sql — Field* removed, new Data* types added ([59a3439](https://github.com/constructive-io/constructive/commit/59a34396f3f547f28b9c2b53a7d61604b1777d0e))

## [0.2.2](https://github.com/constructive-io/constructive/compare/node-type-registry@0.2.1...node-type-registry@0.2.2) (2026-03-26)

**Note:** Version bump only for package node-type-registry

## [0.2.1](https://github.com/constructive-io/constructive/compare/node-type-registry@0.2.0...node-type-registry@0.2.1) (2026-03-26)

**Note:** Version bump only for package node-type-registry

# 0.2.0 (2026-03-25)

### Features

- add node-type-registry package — single source of truth for all 50 blueprint node types ([3fd4aa2](https://github.com/constructive-io/constructive/commit/3fd4aa28b3406eab3b7c810a4a7493ea45e269cb))
