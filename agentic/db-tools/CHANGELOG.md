# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.13.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.47...@agentic-kit/db-tools@0.13.0) (2026-11-28)

### Bug Fixes

- **agentic:** preserve approved table identity and blueprint access plans ([9e5253e](https://github.com/constructive-io/constructive/commit/9e5253ea3aca3041369b2833c5cc695560b0fb03))

- feat(agentic)!: the tools layer: plain words and closed schemas in the registry, one rule shape and one effect per tool ([ef140ab](https://github.com/constructive-io/constructive/commit/ef140ab545a0693079de7804e6601a745d004f61))

### Features

- **agentic:** a plan reads as one change list, and the tools print tables ([36ac3bb](https://github.com/constructive-io/constructive/commit/36ac3bbe8231da2d5791b066e0765303a7a11013))

### BREAKING CHANGES

- every Authz parameter_schema refuses a key it does not
  list, and the membership nodes require a team kind or a member list. In
  the generated types, AuthzCompositeParams has no BoolExpr (write AND, OR
  or NOT), membership_type is a number (name a team kind with entity_type),
  and AuthzValueExistsParams and AuthzValueMatchParams require join.

the blueprint exports leave @agentic-kit/harness.
Blueprint, BlueprintZod, FieldBlueprint, TableBlueprint,
expandBlueprintDefaults, fieldTypeToTypeName, toFieldType, toFieldDefault
and isInternalPolicy come from @agentic-kit/db-tools; BlueprintDefinition,
FieldType and FieldDefault come from node-type-registry; the policy
provisioning helpers (POLICY_PROVISIONING_CONFIG, buildNodeData and the
rest) and MUTATING_DB_TOOLS are removed.
GateHost.confirmTool(toolCallId, title, message, preview, target) takes
the preview and the target as required arguments. ConstructiveGateDeps is
{ effectOf, precondition }: precondition returns GateReadiness (blocked
with a failure, or ready with a target), in place of isProjectRunnable,
hasDataToken and gatedTools. GatePolicy.resolvePrompt returns a
GateDecision. GateResult may carry a failure. ConfirmPrompt has a
required target. A PlanRule has $type and policy_role. pi's
ConfirmGateDeps is Partial<ConstructiveGateResolvers>. run-log-gate's
gatePrompt is gatePrompt(title, message, target), and RunLogGateRequest
has a required target.
Stored rules are read in the write shape: describe_schema's policyRules
and every rule explain_access returns hold $type and policy_role and leave
out the readOnly keys (stored parse trees and resolved member lists
included).
Tools: manage_entity_types is replaced by list_entity_types,
create_entity_type and delete_entity_type; provision_database loses
reprovision (use replace_database); update_field loses new_type (use
retype_field); an add_policies rule is a BlueprintPolicy ($type,
privileges, permissive, policy_role, policy_name, data) in place of
policy_type, operations, role_name, is_permissive, data and node_data.

## [0.12.47](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.46...@agentic-kit/db-tools@0.12.47) (2026-11-26)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.46](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.45...@agentic-kit/db-tools@0.12.46) (2026-11-26)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.45](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.44...@agentic-kit/db-tools@0.12.45) (2026-11-26)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.44](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.43...@agentic-kit/db-tools@0.12.44) (2026-11-26)

### Bug Fixes

- **agentic:** agent CLI ships no backend URLs, keeps all five planes, never defaults to localhost ([#2077](https://github.com/constructive-io/constructive/issues/2077)) ([5bec015](https://github.com/constructive-io/constructive/commit/5bec015dabe0ade709e66d68c5c81d28b02ed1d9))
- **agentic:** make CLI tool support and approval limits explicit ([#2076](https://github.com/constructive-io/constructive/issues/2076)) ([3576a8b](https://github.com/constructive-io/constructive/commit/3576a8b03059b70348d50ea02a0a3e349229ea3c))
- **agentic:** never write the account bearer into the project .env ([#2075](https://github.com/constructive-io/constructive/issues/2075)) ([86cda2e](https://github.com/constructive-io/constructive/commit/86cda2ef91520c2adcc162cb913cfe74459f53b5))

## [0.12.43](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.42...@agentic-kit/db-tools@0.12.43) (2026-11-24)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.42](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.41...@agentic-kit/db-tools@0.12.42) (2026-11-23)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.41](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.40...@agentic-kit/db-tools@0.12.41) (2026-11-23)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.40](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.39...@agentic-kit/db-tools@0.12.40) (2026-11-23)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.39](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.38...@agentic-kit/db-tools@0.12.39) (2026-11-22)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.38](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.37...@agentic-kit/db-tools@0.12.38) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.37](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.36...@agentic-kit/db-tools@0.12.37) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.36](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.35...@agentic-kit/db-tools@0.12.36) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.35](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.34...@agentic-kit/db-tools@0.12.35) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.34](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.33...@agentic-kit/db-tools@0.12.34) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.33](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.32...@agentic-kit/db-tools@0.12.33) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.32](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.31...@agentic-kit/db-tools@0.12.32) (2026-11-19)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.31](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.30...@agentic-kit/db-tools@0.12.31) (2026-11-19)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.30](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.29...@agentic-kit/db-tools@0.12.30) (2026-11-18)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.29](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.28...@agentic-kit/db-tools@0.12.29) (2026-11-17)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.28](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.27...@agentic-kit/db-tools@0.12.28) (2026-11-17)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.27](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.26...@agentic-kit/db-tools@0.12.27) (2026-11-17)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.26](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.25...@agentic-kit/db-tools@0.12.26) (2026-11-17)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.25](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.24...@agentic-kit/db-tools@0.12.25) (2026-11-16)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.24](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.23...@agentic-kit/db-tools@0.12.24) (2026-11-16)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.23](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.22...@agentic-kit/db-tools@0.12.23) (2026-11-16)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.22](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.21...@agentic-kit/db-tools@0.12.22) (2026-11-14)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.21](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.20...@agentic-kit/db-tools@0.12.21) (2026-11-12)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.20](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.19...@agentic-kit/db-tools@0.12.20) (2026-11-11)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.19](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.18...@agentic-kit/db-tools@0.12.19) (2026-11-11)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.18](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.17...@agentic-kit/db-tools@0.12.18) (2026-11-11)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.17](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.16...@agentic-kit/db-tools@0.12.17) (2026-11-10)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.16](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.15...@agentic-kit/db-tools@0.12.16) (2026-11-09)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.15](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.14...@agentic-kit/db-tools@0.12.15) (2026-11-09)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.14](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.13...@agentic-kit/db-tools@0.12.14) (2026-11-08)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.13](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.12...@agentic-kit/db-tools@0.12.13) (2026-11-06)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.12](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.11...@agentic-kit/db-tools@0.12.12) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.11](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.10...@agentic-kit/db-tools@0.12.11) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.10](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.9...@agentic-kit/db-tools@0.12.10) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.9](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.8...@agentic-kit/db-tools@0.12.9) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.8](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.7...@agentic-kit/db-tools@0.12.8) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.7](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.6...@agentic-kit/db-tools@0.12.7) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.6](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.5...@agentic-kit/db-tools@0.12.6) (2026-11-04)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.4...@agentic-kit/db-tools@0.12.5) (2026-11-04)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.3...@agentic-kit/db-tools@0.12.4) (2026-11-04)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.2...@agentic-kit/db-tools@0.12.3) (2026-11-04)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.1...@agentic-kit/db-tools@0.12.2) (2026-11-01)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.12.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.12.0...@agentic-kit/db-tools@0.12.1) (2026-10-29)

**Note:** Version bump only for package @agentic-kit/db-tools

# [0.12.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.11.5...@agentic-kit/db-tools@0.12.0) (2026-10-29)

### Features

- **db-tools,graphile-meta:** composed-app codegen, resumable provisions and form metadata in _meta ([#1919](https://github.com/constructive-io/constructive/issues/1919)) ([37fb805](https://github.com/constructive-io/constructive/commit/37fb80597dddf8538699f59d74b66fe2e5c827b6)), closes [constructive-db#4156](https://github.com/constructive-db/issues/4156)

## [0.11.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.11.4...@agentic-kit/db-tools@0.11.5) (2026-10-28)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.11.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.11.3...@agentic-kit/db-tools@0.11.4) (2026-10-28)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.11.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.11.2...@agentic-kit/db-tools@0.11.3) (2026-10-27)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.11.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.11.1...@agentic-kit/db-tools@0.11.2) (2026-10-26)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.11.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.11.0...@agentic-kit/db-tools@0.11.1) (2026-10-26)

**Note:** Version bump only for package @agentic-kit/db-tools

# [0.11.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.10.8...@agentic-kit/db-tools@0.11.0) (2026-10-24)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.10.8](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.10.7...@agentic-kit/db-tools@0.10.8) (2026-10-23)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.10.7](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.10.6...@agentic-kit/db-tools@0.10.7) (2026-10-22)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.10.6](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.10.5...@agentic-kit/db-tools@0.10.6) (2026-10-19)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.10.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.10.4...@agentic-kit/db-tools@0.10.5) (2026-10-17)

### Bug Fixes

- **db-tools:** constructBlueprint raises on failure; drop NULL-return fallbacks ([abdfc6f](https://github.com/constructive-io/constructive/commit/abdfc6ffc493181b2ddb5027bc7a5c22f7eb5efa))

## [0.10.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.10.3...@agentic-kit/db-tools@0.10.4) (2026-10-16)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.10.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.10.2...@agentic-kit/db-tools@0.10.3) (2026-10-16)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.10.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.10.1...@agentic-kit/db-tools@0.10.2) (2026-10-15)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.10.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.10.0...@agentic-kit/db-tools@0.10.1) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/db-tools

# [0.10.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.12...@agentic-kit/db-tools@0.10.0) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.12](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.11...@agentic-kit/db-tools@0.9.12) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.11](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.10...@agentic-kit/db-tools@0.9.11) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.10](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.9...@agentic-kit/db-tools@0.9.10) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.9](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.8...@agentic-kit/db-tools@0.9.9) (2026-10-13)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.8](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.7...@agentic-kit/db-tools@0.9.8) (2026-10-13)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.7](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.6...@agentic-kit/db-tools@0.9.7) (2026-10-13)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.6](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.5...@agentic-kit/db-tools@0.9.6) (2026-10-13)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.4...@agentic-kit/db-tools@0.9.5) (2026-10-13)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.3...@agentic-kit/db-tools@0.9.4) (2026-10-12)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.2...@agentic-kit/db-tools@0.9.3) (2026-10-12)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.1...@agentic-kit/db-tools@0.9.2) (2026-10-07)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.9.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.9.0...@agentic-kit/db-tools@0.9.1) (2026-10-02)

**Note:** Version bump only for package @agentic-kit/db-tools

# [0.9.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.8.3...@agentic-kit/db-tools@0.9.0) (2026-09-30)

### Features

- **db-tools:** provision without direct Postgres; resolve app_public by logical name, fail hard ([2b80563](https://github.com/constructive-io/constructive/commit/2b80563f1bc9987c309d75b82a1262c12c90cf97))

## [0.8.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.8.2...@agentic-kit/db-tools@0.8.3) (2026-09-24)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.8.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.8.1...@agentic-kit/db-tools@0.8.2) (2026-09-19)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.8.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.8.0...@agentic-kit/db-tools@0.8.1) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/db-tools

# [0.8.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.7.1...@agentic-kit/db-tools@0.8.0) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.7.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.7.0...@agentic-kit/db-tools@0.7.1) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/db-tools

# [0.7.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.6.0...@agentic-kit/db-tools@0.7.0) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/db-tools

# [0.6.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.13...@agentic-kit/db-tools@0.6.0) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.13](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.12...@agentic-kit/db-tools@0.5.13) (2026-09-15)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.12](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.11...@agentic-kit/db-tools@0.5.12) (2026-09-08)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.11](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.10...@agentic-kit/db-tools@0.5.11) (2026-09-06)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.10](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.9...@agentic-kit/db-tools@0.5.10) (2026-09-05)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.9](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.8...@agentic-kit/db-tools@0.5.9) (2026-09-04)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.8](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.7...@agentic-kit/db-tools@0.5.8) (2026-09-03)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.7](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.6...@agentic-kit/db-tools@0.5.7) (2026-09-01)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.6](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.5...@agentic-kit/db-tools@0.5.6) (2026-09-01)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.4...@agentic-kit/db-tools@0.5.5) (2026-08-31)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.3...@agentic-kit/db-tools@0.5.4) (2026-08-28)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.2...@agentic-kit/db-tools@0.5.3) (2026-08-28)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.1...@agentic-kit/db-tools@0.5.2) (2026-08-28)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.5.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.5.0...@agentic-kit/db-tools@0.5.1) (2026-08-27)

**Note:** Version bump only for package @agentic-kit/db-tools

# [0.5.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.4.0...@agentic-kit/db-tools@0.5.0) (2026-08-25)

**Note:** Version bump only for package @agentic-kit/db-tools

# [0.4.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.3.1...@agentic-kit/db-tools@0.4.0) (2026-08-24)

**Note:** Version bump only for package @agentic-kit/db-tools

## [0.3.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.3.0...@agentic-kit/db-tools@0.3.1) (2026-08-19)

**Note:** Version bump only for package @agentic-kit/db-tools

# [0.3.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.2.1...@agentic-kit/db-tools@0.3.0) (2026-08-19)

### Features

- **agentic:** a dsh adapter beside the pi one ([0cdd6de](https://github.com/constructive-io/constructive/commit/0cdd6de3db842bff8e66c92b1daebc0fa15e70e6))

## [0.2.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/db-tools@0.2.0...@agentic-kit/db-tools@0.2.1) (2026-08-19)

**Note:** Version bump only for package @agentic-kit/db-tools

# 0.2.0 (2026-08-18)

### Features

- **agentic:** extract the db tools into @agentic-kit/db-tools ([62808de](https://github.com/constructive-io/constructive/commit/62808de88bdcafdf68d57c17561d5b04ee75dc65))
