# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.18.2](https://github.com/constructive-io/constructive/compare/graphile-llm@0.18.1...graphile-llm@0.18.2) (2026-07-17)

**Note:** Version bump only for package graphile-llm

## [0.18.1](https://github.com/constructive-io/constructive/compare/graphile-llm@0.18.0...graphile-llm@0.18.1) (2026-07-15)

**Note:** Version bump only for package graphile-llm

# [0.18.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.17.3...graphile-llm@0.18.0) (2026-07-14)

**Note:** Version bump only for package graphile-llm

## [0.17.3](https://github.com/constructive-io/constructive/compare/graphile-llm@0.17.2...graphile-llm@0.17.3) (2026-07-14)

**Note:** Version bump only for package graphile-llm

## [0.17.2](https://github.com/constructive-io/constructive/compare/graphile-llm@0.17.1...graphile-llm@0.17.2) (2026-07-13)

**Note:** Version bump only for package graphile-llm

## [0.17.1](https://github.com/constructive-io/constructive/compare/graphile-llm@0.17.0...graphile-llm@0.17.1) (2026-07-13)

**Note:** Version bump only for package graphile-llm

# [0.17.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.16.8...graphile-llm@0.17.0) (2026-07-12)

**Note:** Version bump only for package graphile-llm

## [0.16.8](https://github.com/constructive-io/constructive/compare/graphile-llm@0.16.7...graphile-llm@0.16.8) (2026-07-12)

**Note:** Version bump only for package graphile-llm

## [0.16.7](https://github.com/constructive-io/constructive/compare/graphile-llm@0.16.6...graphile-llm@0.16.7) (2026-07-12)

**Note:** Version bump only for package graphile-llm

## [0.16.6](https://github.com/constructive-io/constructive/compare/graphile-llm@0.16.5...graphile-llm@0.16.6) (2026-07-11)

**Note:** Version bump only for package graphile-llm

## [0.16.5](https://github.com/constructive-io/constructive/compare/graphile-llm@0.16.4...graphile-llm@0.16.5) (2026-07-11)

**Note:** Version bump only for package graphile-llm

## [0.16.4](https://github.com/constructive-io/constructive/compare/graphile-llm@0.16.3...graphile-llm@0.16.4) (2026-07-10)

**Note:** Version bump only for package graphile-llm

## [0.16.3](https://github.com/constructive-io/constructive/compare/graphile-llm@0.16.2...graphile-llm@0.16.3) (2026-07-10)

**Note:** Version bump only for package graphile-llm

## [0.16.2](https://github.com/constructive-io/constructive/compare/graphile-llm@0.16.1...graphile-llm@0.16.2) (2026-07-08)

**Note:** Version bump only for package graphile-llm

## [0.16.1](https://github.com/constructive-io/constructive/compare/graphile-llm@0.16.0...graphile-llm@0.16.1) (2026-06-28)

**Note:** Version bump only for package graphile-llm

# [0.16.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.15.0...graphile-llm@0.16.0) (2026-06-28)

### Bug Fixes

- replace workspace:^ in peerDependencies with real version ranges ([17951e1](https://github.com/constructive-io/constructive/commit/17951e1c233eabe984dba28392f6eba13597d9ab))

# [0.15.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.14.0...graphile-llm@0.15.0) (2026-06-28)

**Note:** Version bump only for package graphile-llm

# [0.14.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.13.0...graphile-llm@0.14.0) (2026-06-27)

**Note:** Version bump only for package graphile-llm

# [0.13.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.12.2...graphile-llm@0.13.0) (2026-06-27)

**Note:** Version bump only for package graphile-llm

## [0.12.2](https://github.com/constructive-io/constructive/compare/graphile-llm@0.12.1...graphile-llm@0.12.2) (2026-06-22)

**Note:** Version bump only for package graphile-llm

## [0.12.1](https://github.com/constructive-io/constructive/compare/graphile-llm@0.12.0...graphile-llm@0.12.1) (2026-06-14)

**Note:** Version bump only for package graphile-llm

# [0.12.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.11.5...graphile-llm@0.12.0) (2026-06-14)

### Bug Fixes

- **graphile-llm:** fix all failing tests — RAG chunk discovery, mutation input detection, text-search scope ([49ead07](https://github.com/constructive-io/constructive/commit/49ead07fe1d863ea1c18bf4cb9446b031bd63188))
- **graphile-llm:** per-DB config uses same embedder via AsyncLocalStorage — no separate pipeline ([5b7ae42](https://github.com/constructive-io/constructive/commit/5b7ae42d67e56a4b66953b764bb2be212f0930d9))

### Features

- **express-context, agentic-server, graphile-llm:** centralize LLM provider config via express-context loaders ([534b05d](https://github.com/constructive-io/constructive/commit/534b05d507f358fa7b462993f70fec466d8a89f0))
- **express-context:** add shared BillingClient abstraction ([7f3a1cb](https://github.com/constructive-io/constructive/commit/7f3a1cbf71e2b14017661e48168082863df2f75d)), closes [constructive-io/constructive-planning#1054](https://github.com/constructive-io/constructive-planning/issues/1054)
- **graphile-llm:** add onQuotaExceeded option to control embedding failure behavior ([a59b08f](https://github.com/constructive-io/constructive/commit/a59b08fd2cae1ce90d783ce277b366e08290294e))
- **graphile-llm:** auto-embed unifiedSearch text for hybrid vector+keyword search ([dc4a5c1](https://github.com/constructive-io/constructive/commit/dc4a5c1befec668f93586fb94d02303b219e427c)), closes [#1054](https://github.com/constructive-io/constructive/issues/1054)
- **graphile-settings:** wire GraphileLlmPreset into createConstructivePreset ([517ce84](https://github.com/constructive-io/constructive/commit/517ce845b2363bbdd3b3c8a18792d58117ab2c7c))

## [0.11.5](https://github.com/constructive-io/constructive/compare/graphile-llm@0.11.4...graphile-llm@0.11.5) (2026-06-12)

**Note:** Version bump only for package graphile-llm

## [0.11.4](https://github.com/constructive-io/constructive/compare/graphile-llm@0.11.3...graphile-llm@0.11.4) (2026-06-07)

**Note:** Version bump only for package graphile-llm

## [0.11.3](https://github.com/constructive-io/constructive/compare/graphile-llm@0.11.2...graphile-llm@0.11.3) (2026-06-06)

**Note:** Version bump only for package graphile-llm

## [0.11.2](https://github.com/constructive-io/constructive/compare/graphile-llm@0.11.1...graphile-llm@0.11.2) (2026-06-06)

**Note:** Version bump only for package graphile-llm

## [0.11.1](https://github.com/constructive-io/constructive/compare/graphile-llm@0.11.0...graphile-llm@0.11.1) (2026-06-05)

**Note:** Version bump only for package graphile-llm

# [0.11.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.10.2...graphile-llm@0.11.0) (2026-05-30)

**Note:** Version bump only for package graphile-llm

## [0.10.2](https://github.com/constructive-io/constructive/compare/graphile-llm@0.10.1...graphile-llm@0.10.2) (2026-05-29)

**Note:** Version bump only for package graphile-llm

## [0.10.1](https://github.com/constructive-io/constructive/compare/graphile-llm@0.10.0...graphile-llm@0.10.1) (2026-05-24)

**Note:** Version bump only for package graphile-llm

# [0.10.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.9.0...graphile-llm@0.10.0) (2026-05-23)

**Note:** Version bump only for package graphile-llm

# [0.9.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.8.0...graphile-llm@0.9.0) (2026-05-21)

### Features

- replace placeholder token estimates with real counts from agentic-kit v1.2.1 ([d61e92b](https://github.com/constructive-io/constructive/commit/d61e92bf4345e887e326a4625dafc6fb4474376b))
- use real embedding token counts from @agentic-kit/ollama@2.0.0 ([1e84f7f](https://github.com/constructive-io/constructive/commit/1e84f7f8d5ea4440174aefb565ddc385e0f7285f))

# [0.8.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.7.3...graphile-llm@0.8.0) (2026-05-21)

### Bug Fixes

- **graphile-llm:** add latency timing to search embed and unmetered embed paths ([e90630b](https://github.com/constructive-io/constructive/commit/e90630b3a19d4b7fe27c1efe0027ca14e3cdfc01))
- **graphile-llm:** remove estimatedEmbeddingTokens, estimate from text length ([95ce8fc](https://github.com/constructive-io/constructive/commit/95ce8fc3e2676bb0427c9ab01e8fe54e16065cea))
- **graphile-llm:** rename encrypted_secrets_module to config_secrets_user_module ([57adfb4](https://github.com/constructive-io/constructive/commit/57adfb43ab557701fe24a5d1cab27b8c7c37001b))
- **graphile-llm:** restore embed latency timing in text-mutation-plugin ([6dd823b](https://github.com/constructive-io/constructive/commit/6dd823b065ad178040bcac1469837b6b2d7e9a52))
- restore inline documentation comments removed in previous commits ([ac85f01](https://github.com/constructive-io/constructive/commit/ac85f014c915ee6ec2082343803b5d13711fe6d0))
- restore remaining inline comments (inject/remove, recurse, replace, where/filter) ([941d909](https://github.com/constructive-io/constructive/commit/941d909a23a9c63a3b42cd98bf58f31ca66f6812))

### Features

- **graphile-llm:** add agent discovery plugin and REST streaming endpoint ([47dab61](https://github.com/constructive-io/constructive/commit/47dab619a536c136b0f100e3f682c2f2a1c9ce56))
- **graphile-llm:** add inference usage logging to metering plugin ([d16e323](https://github.com/constructive-io/constructive/commit/d16e32385e056ce4bb8479a5380e78eadc0f82d3))
- **graphile-llm:** meter slug = model name, three-level waterfall ([b0c52d6](https://github.com/constructive-io/constructive/commit/b0c52d6b573ff9c26c5c2bb39bbd6898434e1f82))
- **graphile-llm:** wire billing metering into LLM plugins ([42fce32](https://github.com/constructive-io/constructive/commit/42fce32db500e13aa52f073ad4800014aa7da706))
- propagate request_id through pgSettings and metering context ([37c3cd1](https://github.com/constructive-io/constructive/commit/37c3cd186fc277776c196bcdf2bf1455f6954c2c))
- replace request_type with service + operation in inference log inserts ([01c98c7](https://github.com/constructive-io/constructive/commit/01c98c7d8882681a68f400556aa7d673d1cc2d47)), closes [#1281](https://github.com/constructive-io/constructive/issues/1281)

## [0.7.3](https://github.com/constructive-io/constructive/compare/graphile-llm@0.7.2...graphile-llm@0.7.3) (2026-05-20)

**Note:** Version bump only for package graphile-llm

## [0.7.2](https://github.com/constructive-io/constructive/compare/graphile-llm@0.7.1...graphile-llm@0.7.2) (2026-05-19)

**Note:** Version bump only for package graphile-llm

## [0.7.1](https://github.com/constructive-io/constructive/compare/graphile-llm@0.7.0...graphile-llm@0.7.1) (2026-05-17)

**Note:** Version bump only for package graphile-llm

# [0.7.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.6.2...graphile-llm@0.7.0) (2026-05-14)

**Note:** Version bump only for package graphile-llm

## [0.6.2](https://github.com/constructive-io/constructive/compare/graphile-llm@0.6.1...graphile-llm@0.6.2) (2026-05-12)

**Note:** Version bump only for package graphile-llm

## [0.6.1](https://github.com/constructive-io/constructive/compare/graphile-llm@0.6.0...graphile-llm@0.6.1) (2026-05-11)

**Note:** Version bump only for package graphile-llm

# [0.6.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.5.2...graphile-llm@0.6.0) (2026-05-11)

**Note:** Version bump only for package graphile-llm

## [0.5.2](https://github.com/constructive-io/constructive/compare/graphile-llm@0.5.1...graphile-llm@0.5.2) (2026-05-10)

**Note:** Version bump only for package graphile-llm

## [0.5.1](https://github.com/constructive-io/constructive/compare/graphile-llm@0.5.0...graphile-llm@0.5.1) (2026-05-09)

**Note:** Version bump only for package graphile-llm

# [0.5.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.4.0...graphile-llm@0.5.0) (2026-05-08)

**Note:** Version bump only for package graphile-llm

# [0.4.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.3.0...graphile-llm@0.4.0) (2026-05-08)

**Note:** Version bump only for package graphile-llm

# [0.3.0](https://github.com/constructive-io/constructive/compare/graphile-llm@0.2.5...graphile-llm@0.3.0) (2026-05-06)

**Note:** Version bump only for package graphile-llm

## [0.2.5](https://github.com/constructive-io/constructive/compare/graphile-llm@0.2.4...graphile-llm@0.2.5) (2026-05-05)

**Note:** Version bump only for package graphile-llm

## [0.2.4](https://github.com/constructive-io/constructive/compare/graphile-llm@0.2.3...graphile-llm@0.2.4) (2026-04-27)

**Note:** Version bump only for package graphile-llm

## [0.2.3](https://github.com/constructive-io/constructive/compare/graphile-llm@0.2.2...graphile-llm@0.2.3) (2026-04-20)

**Note:** Version bump only for package graphile-llm

## [0.2.2](https://github.com/constructive-io/constructive/compare/graphile-llm@0.2.1...graphile-llm@0.2.2) (2026-04-20)

**Note:** Version bump only for package graphile-llm

## [0.2.1](https://github.com/constructive-io/constructive/compare/graphile-llm@0.2.0...graphile-llm@0.2.1) (2026-04-19)

**Note:** Version bump only for package graphile-llm

# 0.2.0 (2026-04-19)

### Bug Fixes

- address Devin Review findings ([1be6d54](https://github.com/constructive-io/constructive/commit/1be6d54d1441371cbb5975f238b957afb061cb8b))

### Features

- add graphile-llm plugin — server-side text-to-vector embedding for PostGraphile ([976f626](https://github.com/constructive-io/constructive/commit/976f626b57ddf574feb7ce617a7c3b1ae51e6d55)), closes [constructive-io/constructive-planning#743](https://github.com/constructive-io/constructive-planning/issues/743)
- add RAG plugin, chat completion provider, and resolve-time embedding ([3224ff7](https://github.com/constructive-io/constructive/commit/3224ff790e272ac35fbd1b8e0aebdeca0f5a5ddb))
