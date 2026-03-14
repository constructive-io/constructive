# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 1.1.0 (2026-03-14)

### Bug Fixes

- add CREATE SCHEMA to seed SQL, make logical operators check runtime option ([5e8da67](https://github.com/constructive-io/constructive/commit/5e8da6706563044d98c4f5789fcd84f5a9e039ce))
- always include relation plugins, check connectionFilterRelations at runtime ([b4ff740](https://github.com/constructive-io/constructive/commit/b4ff740642a90a342fe4f06476ef9828c84dcf38))
- correct assertion for multiple operators on same field test (49.99 < 50) ([9691fa5](https://github.com/constructive-io/constructive/commit/9691fa5d62d1ea4f9779d8c5d70950cdaf99baca))
- migrate remaining condition queries to filter, register filterBy behavior for pgCodecRelation, update schema snapshot with relation filter types ([5207254](https://github.com/constructive-io/constructive/commit/5207254ad96ec30100e93f6268137eaede1e4387))
- remove connectionFilterAllowEmptyObjectInput option, handle empty filter at applyPlan level ([f21d0f0](https://github.com/constructive-io/constructive/commit/f21d0f0d536f1c7aefaed177820368d8b4b9e35c))
- update test imports and description quotes for graphile-connection-filter ([b2e07e9](https://github.com/constructive-io/constructive/commit/b2e07e9d972e76ce442ee01c223f48d777124d24))
- use filterFieldType instead of filterType in addConnectionFilterOperator ([eac0208](https://github.com/constructive-io/constructive/commit/eac02082d64f8bf10f65bdf892e3983ca7bff7e1))

### Features

- add ConnectionFilterComputedAttributesPlugin for feature parity ([b1ca75d](https://github.com/constructive-io/constructive/commit/b1ca75d65fd4dc2d201f57ad48e47e1ac95fb203))
- add connectionFilterRelationsRequireIndex option ([58c638a](https://github.com/constructive-io/constructive/commit/58c638aeab0d4e30a450d1a3149a61ab0d258c7b))
- add dedicated test suite for graphile-connection-filter ([d5e48ee](https://github.com/constructive-io/constructive/commit/d5e48eebf722edadb4faebdc30b46c6d4c45127e))
- add optional relation filter plugins (forward + backward) with toggle ([e8af929](https://github.com/constructive-io/constructive/commit/e8af929b2e9c636758710213c958c2f336154c7b))
- add runtime tests for array filters, declarative operator factory, negation string ops, and edge cases ([bb57932](https://github.com/constructive-io/constructive/commit/bb5793283a95525b6deca7a6a5d8ce9afd0edca5))
- add v5-native graphile-connection-filter plugin ([616dee9](https://github.com/constructive-io/constructive/commit/616dee9a42ac4730e3f9f59ad9612bc223770819))
- rename filter argument to where (configurable via connectionFilterArgumentName) ([10b4fc6](https://github.com/constructive-io/constructive/commit/10b4fc6360774cd79fa936d442dfef4fa9e5f252))
- replace imperative addConnectionFilterOperator with declarative connectionFilterOperatorFactories ([bc8fda5](https://github.com/constructive-io/constructive/commit/bc8fda5cafb6a778f4e2e62082d03a97c688afb6))
- tighten TypeScript types in satellite filter plugins ([72ac8fe](https://github.com/constructive-io/constructive/commit/72ac8fe65a9e6462f40e342eb88d0147c6ffe775))
