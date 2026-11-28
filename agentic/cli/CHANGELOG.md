# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.20.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.55...@agentic-kit/cli@0.20.0) (2026-11-28)

### Bug Fixes

- **deps:** bump inquirerer to 4.9.7 ([#2098](https://github.com/constructive-io/constructive/issues/2098)) ([ab0cd00](https://github.com/constructive-io/constructive/commit/ab0cd009d7fbae17da660ae0251474d1f449c2aa))

- feat(agentic)!: the tools layer: plain words and closed schemas in the registry, one rule shape and one effect per tool ([ef140ab](https://github.com/constructive-io/constructive/commit/ef140ab545a0693079de7804e6601a745d004f61))

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

## [0.19.55](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.54...@agentic-kit/cli@0.19.55) (2026-11-26)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.54](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.53...@agentic-kit/cli@0.19.54) (2026-11-26)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.53](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.52...@agentic-kit/cli@0.19.53) (2026-11-26)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.52](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.51...@agentic-kit/cli@0.19.52) (2026-11-26)

### Bug Fixes

- **agentic:** agent CLI ships no backend URLs, keeps all five planes, never defaults to localhost ([#2077](https://github.com/constructive-io/constructive/issues/2077)) ([5bec015](https://github.com/constructive-io/constructive/commit/5bec015dabe0ade709e66d68c5c81d28b02ed1d9))
- **agentic:** make CLI tool support and approval limits explicit ([#2076](https://github.com/constructive-io/constructive/issues/2076)) ([3576a8b](https://github.com/constructive-io/constructive/commit/3576a8b03059b70348d50ea02a0a3e349229ea3c))
- **agentic:** never write the account bearer into the project .env ([#2075](https://github.com/constructive-io/constructive/issues/2075)) ([86cda2e](https://github.com/constructive-io/constructive/commit/86cda2ef91520c2adcc162cb913cfe74459f53b5))

## [0.19.51](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.50...@agentic-kit/cli@0.19.51) (2026-11-24)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.50](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.49...@agentic-kit/cli@0.19.50) (2026-11-24)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.49](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.48...@agentic-kit/cli@0.19.49) (2026-11-23)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.48](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.47...@agentic-kit/cli@0.19.48) (2026-11-23)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.47](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.46...@agentic-kit/cli@0.19.47) (2026-11-23)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.46](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.45...@agentic-kit/cli@0.19.46) (2026-11-22)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.45](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.44...@agentic-kit/cli@0.19.45) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.44](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.43...@agentic-kit/cli@0.19.44) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.43](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.42...@agentic-kit/cli@0.19.43) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.42](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.41...@agentic-kit/cli@0.19.42) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.41](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.40...@agentic-kit/cli@0.19.41) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.40](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.39...@agentic-kit/cli@0.19.40) (2026-11-21)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.39](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.38...@agentic-kit/cli@0.19.39) (2026-11-19)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.38](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.37...@agentic-kit/cli@0.19.38) (2026-11-19)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.37](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.36...@agentic-kit/cli@0.19.37) (2026-11-18)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.36](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.35...@agentic-kit/cli@0.19.36) (2026-11-17)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.35](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.34...@agentic-kit/cli@0.19.35) (2026-11-17)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.34](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.33...@agentic-kit/cli@0.19.34) (2026-11-17)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.33](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.32...@agentic-kit/cli@0.19.33) (2026-11-17)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.32](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.31...@agentic-kit/cli@0.19.32) (2026-11-16)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.31](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.30...@agentic-kit/cli@0.19.31) (2026-11-16)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.30](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.29...@agentic-kit/cli@0.19.30) (2026-11-16)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.29](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.28...@agentic-kit/cli@0.19.29) (2026-11-14)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.28](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.27...@agentic-kit/cli@0.19.28) (2026-11-12)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.27](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.26...@agentic-kit/cli@0.19.27) (2026-11-11)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.26](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.25...@agentic-kit/cli@0.19.26) (2026-11-11)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.25](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.24...@agentic-kit/cli@0.19.25) (2026-11-11)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.24](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.23...@agentic-kit/cli@0.19.24) (2026-11-10)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.23](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.22...@agentic-kit/cli@0.19.23) (2026-11-09)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.22](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.21...@agentic-kit/cli@0.19.22) (2026-11-09)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.21](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.20...@agentic-kit/cli@0.19.21) (2026-11-08)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.20](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.19...@agentic-kit/cli@0.19.20) (2026-11-06)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.19](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.18...@agentic-kit/cli@0.19.19) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.18](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.17...@agentic-kit/cli@0.19.18) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.17](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.16...@agentic-kit/cli@0.19.17) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.16](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.15...@agentic-kit/cli@0.19.16) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.15](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.14...@agentic-kit/cli@0.19.15) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.14](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.13...@agentic-kit/cli@0.19.14) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.13](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.12...@agentic-kit/cli@0.19.13) (2026-11-04)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.12](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.11...@agentic-kit/cli@0.19.12) (2026-11-04)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.11](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.10...@agentic-kit/cli@0.19.11) (2026-11-04)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.10](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.9...@agentic-kit/cli@0.19.10) (2026-11-04)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.9](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.8...@agentic-kit/cli@0.19.9) (2026-11-03)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.8](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.7...@agentic-kit/cli@0.19.8) (2026-11-01)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.7](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.6...@agentic-kit/cli@0.19.7) (2026-10-29)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.6](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.5...@agentic-kit/cli@0.19.6) (2026-10-29)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.4...@agentic-kit/cli@0.19.5) (2026-10-28)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.3...@agentic-kit/cli@0.19.4) (2026-10-28)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.2...@agentic-kit/cli@0.19.3) (2026-10-27)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.1...@agentic-kit/cli@0.19.2) (2026-10-26)

**Note:** Version bump only for package @agentic-kit/cli

## [0.19.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.19.0...@agentic-kit/cli@0.19.1) (2026-10-26)

**Note:** Version bump only for package @agentic-kit/cli

# [0.19.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.18.8...@agentic-kit/cli@0.19.0) (2026-10-24)

**Note:** Version bump only for package @agentic-kit/cli

## [0.18.8](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.18.7...@agentic-kit/cli@0.18.8) (2026-10-23)

**Note:** Version bump only for package @agentic-kit/cli

## [0.18.7](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.18.6...@agentic-kit/cli@0.18.7) (2026-10-22)

**Note:** Version bump only for package @agentic-kit/cli

## [0.18.6](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.18.5...@agentic-kit/cli@0.18.6) (2026-10-19)

**Note:** Version bump only for package @agentic-kit/cli

## [0.18.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.18.4...@agentic-kit/cli@0.18.5) (2026-10-17)

**Note:** Version bump only for package @agentic-kit/cli

## [0.18.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.18.3...@agentic-kit/cli@0.18.4) (2026-10-16)

**Note:** Version bump only for package @agentic-kit/cli

## [0.18.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.18.2...@agentic-kit/cli@0.18.3) (2026-10-16)

**Note:** Version bump only for package @agentic-kit/cli

## [0.18.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.18.1...@agentic-kit/cli@0.18.2) (2026-10-15)

**Note:** Version bump only for package @agentic-kit/cli

## [0.18.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.18.0...@agentic-kit/cli@0.18.1) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/cli

# [0.18.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.11...@agentic-kit/cli@0.18.0) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/cli

## [0.17.11](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.10...@agentic-kit/cli@0.17.11) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/cli

## [0.17.10](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.9...@agentic-kit/cli@0.17.10) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/cli

## [0.17.9](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.8...@agentic-kit/cli@0.17.9) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/cli

## [0.17.8](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.7...@agentic-kit/cli@0.17.8) (2026-10-13)

**Note:** Version bump only for package @agentic-kit/cli

## [0.17.7](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.6...@agentic-kit/cli@0.17.7) (2026-10-13)

**Note:** Version bump only for package @agentic-kit/cli

## [0.17.6](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.5...@agentic-kit/cli@0.17.6) (2026-10-13)

**Note:** Version bump only for package @agentic-kit/cli

## [0.17.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.4...@agentic-kit/cli@0.17.5) (2026-10-13)

**Note:** Version bump only for package @agentic-kit/cli

## [0.17.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.3...@agentic-kit/cli@0.17.4) (2026-10-13)

**Note:** Version bump only for package @agentic-kit/cli

## [0.17.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.2...@agentic-kit/cli@0.17.3) (2026-10-12)

**Note:** Version bump only for package @agentic-kit/cli

## [0.17.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.1...@agentic-kit/cli@0.17.2) (2026-10-12)

**Note:** Version bump only for package @agentic-kit/cli

## [0.17.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.17.0...@agentic-kit/cli@0.17.1) (2026-10-07)

**Note:** Version bump only for package @agentic-kit/cli

# [0.17.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.16.4...@agentic-kit/cli@0.17.0) (2026-10-02)

### Features

- **agentic-cli:** drop the pre-shared-store account file import ([ed59023](https://github.com/constructive-io/constructive/commit/ed590230d79502294d95d507c466975976fc36e9))

## [0.16.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.16.3...@agentic-kit/cli@0.16.4) (2026-09-30)

**Note:** Version bump only for package @agentic-kit/cli

## [0.16.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.16.2...@agentic-kit/cli@0.16.3) (2026-09-24)

**Note:** Version bump only for package @agentic-kit/cli

## [0.16.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.16.1...@agentic-kit/cli@0.16.2) (2026-09-19)

**Note:** Version bump only for package @agentic-kit/cli

## [0.16.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.16.0...@agentic-kit/cli@0.16.1) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/cli

# [0.16.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.15.1...@agentic-kit/cli@0.16.0) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/cli

## [0.15.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.15.0...@agentic-kit/cli@0.15.1) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/cli

# [0.15.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.14.0...@agentic-kit/cli@0.15.0) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/cli

# [0.14.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.14...@agentic-kit/cli@0.14.0) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.14](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.13...@agentic-kit/cli@0.13.14) (2026-09-15)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.13](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.12...@agentic-kit/cli@0.13.13) (2026-09-08)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.12](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.11...@agentic-kit/cli@0.13.12) (2026-09-07)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.11](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.10...@agentic-kit/cli@0.13.11) (2026-09-06)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.10](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.9...@agentic-kit/cli@0.13.10) (2026-09-05)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.9](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.8...@agentic-kit/cli@0.13.9) (2026-09-04)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.8](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.7...@agentic-kit/cli@0.13.8) (2026-09-03)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.7](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.6...@agentic-kit/cli@0.13.7) (2026-09-01)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.6](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.5...@agentic-kit/cli@0.13.6) (2026-09-01)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.4...@agentic-kit/cli@0.13.5) (2026-08-31)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.3...@agentic-kit/cli@0.13.4) (2026-08-28)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.2...@agentic-kit/cli@0.13.3) (2026-08-28)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.1...@agentic-kit/cli@0.13.2) (2026-08-28)

**Note:** Version bump only for package @agentic-kit/cli

## [0.13.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.13.0...@agentic-kit/cli@0.13.1) (2026-08-27)

**Note:** Version bump only for package @agentic-kit/cli

# [0.13.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.12.0...@agentic-kit/cli@0.13.0) (2026-08-25)

**Note:** Version bump only for package @agentic-kit/cli

# [0.12.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.11.5...@agentic-kit/cli@0.12.0) (2026-08-24)

**Note:** Version bump only for package @agentic-kit/cli

## [0.11.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.11.4...@agentic-kit/cli@0.11.5) (2026-08-19)

### Bug Fixes

- **cli:** let the caller supply the skills fetch so an offline assembly stays offline ([25f8cba](https://github.com/constructive-io/constructive/commit/25f8cbaa829314a67524a7d1757c54df460d25fc))

## [0.11.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.11.3...@agentic-kit/cli@0.11.4) (2026-08-19)

**Note:** Version bump only for package @agentic-kit/cli

## [0.11.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.11.2...@agentic-kit/cli@0.11.3) (2026-08-19)

**Note:** Version bump only for package @agentic-kit/cli

## [0.11.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.11.1...@agentic-kit/cli@0.11.2) (2026-08-18)

**Note:** Version bump only for package @agentic-kit/cli

## [0.11.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.11.0...@agentic-kit/cli@0.11.1) (2026-08-18)

**Note:** Version bump only for package @agentic-kit/cli

# [0.11.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.10.2...@agentic-kit/cli@0.11.0) (2026-08-18)

**Note:** Version bump only for package @agentic-kit/cli

## [0.10.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.10.1...@agentic-kit/cli@0.10.2) (2026-08-17)

**Note:** Version bump only for package @agentic-kit/cli

## [0.10.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.10.0...@agentic-kit/cli@0.10.1) (2026-08-15)

**Note:** Version bump only for package @agentic-kit/cli

# [0.10.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.13...@agentic-kit/cli@0.10.0) (2026-08-14)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.13](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.12...@agentic-kit/cli@0.9.13) (2026-08-14)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.12](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.11...@agentic-kit/cli@0.9.12) (2026-08-13)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.11](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.10...@agentic-kit/cli@0.9.11) (2026-08-13)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.10](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.9...@agentic-kit/cli@0.9.10) (2026-08-13)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.9](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.8...@agentic-kit/cli@0.9.9) (2026-08-13)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.8](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.7...@agentic-kit/cli@0.9.8) (2026-08-10)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.7](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.6...@agentic-kit/cli@0.9.7) (2026-08-10)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.6](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.5...@agentic-kit/cli@0.9.6) (2026-08-08)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.4...@agentic-kit/cli@0.9.5) (2026-08-07)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.3...@agentic-kit/cli@0.9.4) (2026-08-07)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.2...@agentic-kit/cli@0.9.3) (2026-08-06)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.1...@agentic-kit/cli@0.9.2) (2026-08-06)

**Note:** Version bump only for package @agentic-kit/cli

## [0.9.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.9.0...@agentic-kit/cli@0.9.1) (2026-08-05)

**Note:** Version bump only for package @agentic-kit/cli

# [0.9.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.8.2...@agentic-kit/cli@0.9.0) (2026-08-04)

### Bug Fixes

- **cli:** disable inquirerer idle timeout in interactive login ([ea21a20](https://github.com/constructive-io/constructive/commit/ea21a2040d1faf6d3649367b97eebf3973d852b4))
- **cli:** split coalesced stdin chunks so pasted passwords survive login ([922fd84](https://github.com/constructive-io/constructive/commit/922fd84d58bb8270c0ec44a9b80e125821037a5d))
- **cli:** use workspace:^ for sdk dependency ([254802d](https://github.com/constructive-io/constructive/commit/254802d398edb164d64aaca0038951919da85f2a))

### Features

- **cli:** add account session store and auth core ([46314fa](https://github.com/constructive-io/constructive/commit/46314faf2641b408a894d0f9f584c335e593bf03))
- **cli:** add login, logout and whoami commands ([8b404b6](https://github.com/constructive-io/constructive/commit/8b404b6251dbc8c09d7d2b6d51a433f0ed3bc4a6))
- **cli:** db tools read login session, startup key remint ([9f19ab1](https://github.com/constructive-io/constructive/commit/9f19ab177cbd9540850bcef2354cab9d5acd0946))
- **cli:** one shared Constructive login store ([20cb70d](https://github.com/constructive-io/constructive/commit/20cb70ded9bc03f69613e8b5bcd0cb2174c03373))

## [0.8.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.8.1...@agentic-kit/cli@0.8.2) (2026-08-03)

**Note:** Version bump only for package @agentic-kit/cli

## [0.8.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.8.0...@agentic-kit/cli@0.8.1) (2026-08-03)

**Note:** Version bump only for package @agentic-kit/cli

# [0.8.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.12...@agentic-kit/cli@0.8.0) (2026-08-02)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.12](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.11...@agentic-kit/cli@0.7.12) (2026-08-02)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.11](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.10...@agentic-kit/cli@0.7.11) (2026-08-01)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.10](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.9...@agentic-kit/cli@0.7.10) (2026-08-01)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.9](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.8...@agentic-kit/cli@0.7.9) (2026-08-01)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.8](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.7...@agentic-kit/cli@0.7.8) (2026-08-01)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.7](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.6...@agentic-kit/cli@0.7.7) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.6](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.5...@agentic-kit/cli@0.7.6) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.4...@agentic-kit/cli@0.7.5) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.3...@agentic-kit/cli@0.7.4) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.2...@agentic-kit/cli@0.7.3) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.1...@agentic-kit/cli@0.7.2) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/cli

## [0.7.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.7.0...@agentic-kit/cli@0.7.1) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/cli

# [0.7.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.6.9...@agentic-kit/cli@0.7.0) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/cli

## [0.6.9](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.6.8...@agentic-kit/cli@0.6.9) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/cli

## [0.6.8](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.6.7...@agentic-kit/cli@0.6.8) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/cli

## [0.6.7](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.6.6...@agentic-kit/cli@0.6.7) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/cli

## [0.6.6](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.6.5...@agentic-kit/cli@0.6.6) (2026-07-30)

**Note:** Version bump only for package @agentic-kit/cli

## [0.6.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.6.4...@agentic-kit/cli@0.6.5) (2026-07-30)

**Note:** Version bump only for package @agentic-kit/cli

## [0.6.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.6.3...@agentic-kit/cli@0.6.4) (2026-07-30)

**Note:** Version bump only for package @agentic-kit/cli

## [0.6.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.6.2...@agentic-kit/cli@0.6.3) (2026-07-30)

**Note:** Version bump only for package @agentic-kit/cli

## [0.6.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.6.1...@agentic-kit/cli@0.6.2) (2026-07-30)

**Note:** Version bump only for package @agentic-kit/cli

## [0.6.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.6.0...@agentic-kit/cli@0.6.1) (2026-07-30)

**Note:** Version bump only for package @agentic-kit/cli

# [0.6.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.5.0...@agentic-kit/cli@0.6.0) (2026-07-29)

**Note:** Version bump only for package @agentic-kit/cli

# [0.5.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.4.3...@agentic-kit/cli@0.5.0) (2026-07-29)

**Note:** Version bump only for package @agentic-kit/cli

## [0.4.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.4.2...@agentic-kit/cli@0.4.3) (2026-07-29)

**Note:** Version bump only for package @agentic-kit/cli

## [0.4.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.4.1...@agentic-kit/cli@0.4.2) (2026-07-29)

**Note:** Version bump only for package @agentic-kit/cli

## [0.4.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.4.0...@agentic-kit/cli@0.4.1) (2026-07-29)

**Note:** Version bump only for package @agentic-kit/cli

# [0.4.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.3.1...@agentic-kit/cli@0.4.0) (2026-07-28)

**Note:** Version bump only for package @agentic-kit/cli

## [0.3.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.3.0...@agentic-kit/cli@0.3.1) (2026-07-28)

**Note:** Version bump only for package @agentic-kit/cli

# [0.3.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.2.3...@agentic-kit/cli@0.3.0) (2026-07-28)

**Note:** Version bump only for package @agentic-kit/cli

## [0.2.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.2.2...@agentic-kit/cli@0.2.3) (2026-07-28)

**Note:** Version bump only for package @agentic-kit/cli

## [0.2.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.2.1...@agentic-kit/cli@0.2.2) (2026-07-28)

**Note:** Version bump only for package @agentic-kit/cli

## [0.2.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/cli@0.2.0...@agentic-kit/cli@0.2.1) (2026-07-28)

**Note:** Version bump only for package @agentic-kit/cli

# 0.2.0 (2026-07-28)

### Features

- add @agentic-kit/cli — agent, the pi coding agent with the harness baked in ([3bf13ea](https://github.com/constructive-io/constructive/commit/3bf13ea9b979692bdda729f9df6e9dcb38235c80))
- wire @agentic-kit/pi db tools into the agent CLI ([66f6c22](https://github.com/constructive-io/constructive/commit/66f6c2234ab42f9e8b6b0346dd999383d2c118f3))
