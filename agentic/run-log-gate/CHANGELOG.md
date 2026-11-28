# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.5.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/run-log-gate@0.4.5...@agentic-kit/run-log-gate@0.5.0) (2026-11-28)

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

## [0.4.5](https://github.com/constructive-io/constructive/compare/@agentic-kit/run-log-gate@0.4.4...@agentic-kit/run-log-gate@0.4.5) (2026-11-26)

**Note:** Version bump only for package @agentic-kit/run-log-gate

## [0.4.4](https://github.com/constructive-io/constructive/compare/@agentic-kit/run-log-gate@0.4.3...@agentic-kit/run-log-gate@0.4.4) (2026-11-23)

**Note:** Version bump only for package @agentic-kit/run-log-gate

## [0.4.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/run-log-gate@0.4.2...@agentic-kit/run-log-gate@0.4.3) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/run-log-gate

## [0.4.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/run-log-gate@0.4.1...@agentic-kit/run-log-gate@0.4.2) (2026-11-03)

**Note:** Version bump only for package @agentic-kit/run-log-gate

## [0.4.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/run-log-gate@0.4.0...@agentic-kit/run-log-gate@0.4.1) (2026-10-16)

**Note:** Version bump only for package @agentic-kit/run-log-gate

# [0.4.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/run-log-gate@0.3.0...@agentic-kit/run-log-gate@0.4.0) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/run-log-gate

# [0.3.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/run-log-gate@0.2.0...@agentic-kit/run-log-gate@0.3.0) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/run-log-gate

# 0.2.0 (2026-09-15)

### Features

- **agentic:** add @agentic-kit/run-log-gate — approvals and gate decisions over the run log ([7f9cf5e](https://github.com/constructive-io/constructive/commit/7f9cf5e6db735dba3bb1474021348028bc2abff1))
