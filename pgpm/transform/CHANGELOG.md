# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.20.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.19.0...@pgpmjs/transform@0.20.0) (2026-08-01)

### Features

- **pgpm:** change granularity dial — one change per alteration (planning [#1342](https://github.com/constructive-io/constructive/issues/1342)) ([b671009](https://github.com/constructive-io/constructive/commit/b671009a7d58c6a8d76d847c5f9ce4facada5e07))
- **pgpm:** change-granularity 'single' level + pgpm-projections skill ([f53f61a](https://github.com/constructive-io/constructive/commit/f53f61ab0a2d7316704c59b72fd9aeb777711ac9))
- **pgpm:** pgpm diff --append-module — append the delta into an existing module ([4bfb5aa](https://github.com/constructive-io/constructive/commit/4bfb5aa1fbaaf1e9cf53f7f7d27584f503a0cd8a))
- **transform:** constraint-placement-invariant semantic diff (planning [#1341](https://github.com/constructive-io/constructive/issues/1341)) ([73d4888](https://github.com/constructive-io/constructive/commit/73d48882122fc883f8676a441b5bcb964c426ae9))

# [0.19.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.18.0...@pgpmjs/transform@0.19.0) (2026-08-01)

### Features

- **pgpm:** add pgpm diff — identity-keyed semantic diff + migration generation ([42a3612](https://github.com/constructive-io/constructive/commit/42a36127b6c3f95fd491db31be50761f41d0220a))

# [0.18.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.17.0...@pgpmjs/transform@0.18.0) (2026-07-31)

### Features

- **pgpm:** compose semantic-diff inverses/verifies at the AST level via @pgsql/scripts node API ([6bc851e](https://github.com/constructive-io/constructive/commit/6bc851e3eddc815f38fe8c0916e6932ffec3415a))

# [0.17.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.16.0...@pgpmjs/transform@0.17.0) (2026-07-31)

### Features

- **pgpm:** pgpm regen — generate revert/verify scripts from deploys ([81ed4e7](https://github.com/constructive-io/constructive/commit/81ed4e7d7a10401837b40481c0241d7a8e803b48))
- **transform:** emit deploy/revert/verify triples via @pgsql/scripts in semantic diff ([0db84a2](https://github.com/constructive-io/constructive/commit/0db84a2ea4141b6f0fabdfa02c1a35dae5c3dafa))
- **transform:** identity-keyed semantic diff — AST-level schema delta through the granularity pipeline ([ce88218](https://github.com/constructive-io/constructive/commit/ce88218147a044cf5debe7d5fcd3a64cb24178b2))

# [0.16.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.15.3...@pgpmjs/transform@0.16.0) (2026-07-31)

### Features

- **pgpm:** generate revert/verify scripts for restructured exports ([a604bcf](https://github.com/constructive-io/constructive/commit/a604bcfbdcdda0ab5018b53c64b4e66bd9250c07)), closes [constructive-planning#1329](https://github.com/constructive-planning/issues/1329)
- **transform:** derive change names from the naming spec — identityOf + pathFor ([7d0c9c6](https://github.com/constructive-io/constructive/commit/7d0c9c62eeb45897a316158b331426f097d7d642))
- **transform:** partition dial — project one deploy surface into pgpm packages ([4dda559](https://github.com/constructive-io/constructive/commit/4dda559b94e3ccd3809007c279d69833c841582e))

## [0.15.3](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.15.2...@pgpmjs/transform@0.15.3) (2026-07-31)

**Note:** Version bump only for package @pgpmjs/transform

## [0.15.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.15.1...@pgpmjs/transform@0.15.2) (2026-07-31)

**Note:** Version bump only for package @pgpmjs/transform

## [0.15.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.15.0...@pgpmjs/transform@0.15.1) (2026-07-31)

**Note:** Version bump only for package @pgpmjs/transform

# [0.15.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.14.0...@pgpmjs/transform@0.15.0) (2026-07-31)

### Features

- **transform:** granularity driver — restructure pgpm changes between atomic/object/consolidated ([6c39831](https://github.com/constructive-io/constructive/commit/6c398311f4540547d0e5f84f748b6d4dcbf727df))

# [0.14.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.13.1...@pgpmjs/transform@0.14.0) (2026-07-31)

**Note:** Version bump only for package @pgpmjs/transform

## [0.13.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.13.0...@pgpmjs/transform@0.13.1) (2026-07-31)

**Note:** Version bump only for package @pgpmjs/transform

# [0.13.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.12.2...@pgpmjs/transform@0.13.0) (2026-07-31)

### Features

- **transform:** SqlProgram — statement-level program AST with facts, spans, and dirty-aware verbatim/deparse emission ([f549dea](https://github.com/constructive-io/constructive/commit/f549dea6cfbc5e9af92606f5660ff00ed50055c8))

## [0.12.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.12.1...@pgpmjs/transform@0.12.2) (2026-07-30)

**Note:** Version bump only for package @pgpmjs/transform

## [0.12.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.12.0...@pgpmjs/transform@0.12.1) (2026-07-30)

**Note:** Version bump only for package @pgpmjs/transform

# [0.12.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.11.1...@pgpmjs/transform@0.12.0) (2026-07-30)

### Features

- **pgpm:** subsystem substitution in apply — exclude, rebind, cascade-safe materialization ([08c3063](https://github.com/constructive-io/constructive/commit/08c30635e2a1dbb9d8544d8b8fdb88be9e34669c))
- **slice:** subsystem exclusion with cascade safety + contract extraction ([a44f08a](https://github.com/constructive-io/constructive/commit/a44f08ac05aa0cc96d8f4215a64927fd8a1ac811))

## [0.11.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.11.0...@pgpmjs/transform@0.11.1) (2026-07-30)

**Note:** Version bump only for package @pgpmjs/transform

# [0.11.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.10.0...@pgpmjs/transform@0.11.0) (2026-07-30)

### Features

- **pgpm:** extension + role routing in apply (@pgsql/transform 18.6.0) ([aaae4d8](https://github.com/constructive-io/constructive/commit/aaae4d897379d5f6c51ef07c648c3d9ca44203ce))

# [0.10.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.9.0...@pgpmjs/transform@0.10.0) (2026-07-30)

### Features

- **pgpm:** apply modules — proxy packages that transpile another module into new schemas ([b56c189](https://github.com/constructive-io/constructive/commit/b56c18913a075b9b48abd98eff1210f5315028a5))
- **pgpm:** object-level apply routing (route table→schema B, function→schema C) ([6e8d284](https://github.com/constructive-io/constructive/commit/6e8d2842c915928e5239c882f6d508aeb2513e25))
- **slice:** bump @pgsql/transform to ^18.5.0 and cover LANGUAGE sql partition ([4c03ae9](https://github.com/constructive-io/constructive/commit/4c03ae94e1188023d98a4e9eedaa4db0fff7c767))

# [0.9.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.8.0...@pgpmjs/transform@0.9.0) (2026-07-29)

**Note:** Version bump only for package @pgpmjs/transform

# [0.8.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.7.1...@pgpmjs/transform@0.8.0) (2026-07-29)

**Note:** Version bump only for package @pgpmjs/transform

## [0.7.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.7.0...@pgpmjs/transform@0.7.1) (2026-07-29)

**Note:** Version bump only for package @pgpmjs/transform

# [0.7.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.6.0...@pgpmjs/transform@0.7.0) (2026-07-28)

**Note:** Version bump only for package @pgpmjs/transform

# [0.6.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.5.2...@pgpmjs/transform@0.6.0) (2026-07-28)

**Note:** Version bump only for package @pgpmjs/transform

## [0.5.2](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.5.1...@pgpmjs/transform@0.5.2) (2026-07-28)

**Note:** Version bump only for package @pgpmjs/transform

## [0.5.1](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.5.0...@pgpmjs/transform@0.5.1) (2026-07-28)

**Note:** Version bump only for package @pgpmjs/transform

# [0.5.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.4.0...@pgpmjs/transform@0.5.0) (2026-07-27)

**Note:** Version bump only for package @pgpmjs/transform

# [0.4.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.3.0...@pgpmjs/transform@0.4.0) (2026-07-27)

**Note:** Version bump only for package @pgpmjs/transform

# [0.3.0](https://github.com/constructive-io/constructive/compare/@pgpmjs/transform@0.2.0...@pgpmjs/transform@0.3.0) (2026-07-27)

**Note:** Version bump only for package @pgpmjs/transform

# 0.2.0 (2026-07-27)

### Features

- add @pgpmjs/slice — plan slicing moved out of core, with opt-in AST dependency closure ([b58b745](https://github.com/constructive-io/constructive/commit/b58b745b2fdc265de674a96f902f467d73a9987d))
- add @pgpmjs/transform (change-aware superset of @pgsql/transform) ([20e9bb0](https://github.com/constructive-io/constructive/commit/20e9bb0b459d99ee29292ee8f250e7cc2d399413))
