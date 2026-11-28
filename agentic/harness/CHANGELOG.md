# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.19.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.18.3...@agentic-kit/harness@0.19.0) (2026-11-28)

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

## [0.18.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.18.2...@agentic-kit/harness@0.18.3) (2026-11-26)

**Note:** Version bump only for package @agentic-kit/harness

## [0.18.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.18.1...@agentic-kit/harness@0.18.2) (2026-11-23)

**Note:** Version bump only for package @agentic-kit/harness

## [0.18.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.18.0...@agentic-kit/harness@0.18.1) (2026-11-05)

**Note:** Version bump only for package @agentic-kit/harness

# [0.18.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.17.0...@agentic-kit/harness@0.18.0) (2026-10-16)

### Features

- **harness:** carry a permission prompt and a grant scope on approvals ([4cb2d80](https://github.com/constructive-io/constructive/commit/4cb2d808fc82f0588e0020d6187d8237e00a7579))

# [0.17.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.16.0...@agentic-kit/harness@0.17.0) (2026-10-14)

**Note:** Version bump only for package @agentic-kit/harness

# [0.16.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.15.0...@agentic-kit/harness@0.16.0) (2026-09-17)

**Note:** Version bump only for package @agentic-kit/harness

# [0.15.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.14.0...@agentic-kit/harness@0.15.0) (2026-08-18)

### Features

- **agentic:** neutral HarnessTool contract, pi binds it at its edge ([cbd30d0](https://github.com/constructive-io/constructive/commit/cbd30d0b0400c195b4567bf0c077a38d5d8d96fe))

# [0.14.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.13.0...@agentic-kit/harness@0.14.0) (2026-08-18)

**Note:** Version bump only for package @agentic-kit/harness

# [0.13.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.12.0...@agentic-kit/harness@0.13.0) (2026-08-17)

### Features

- **agentic:** neutral harness contracts + single pi adapter ([6a7ceb0](https://github.com/constructive-io/constructive/commit/6a7ceb05ec1eeac028db9e6bec1f8ef81e36d168))

# [0.12.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.11.0...@agentic-kit/harness@0.12.0) (2026-08-13)

### Features

- **harness:** make the whole gate policy host-supplied ([d679814](https://github.com/constructive-io/constructive/commit/d6798140ccfc24b85013a55b0464a2c93e9db29d))

# [0.11.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.10.1...@agentic-kit/harness@0.11.0) (2026-08-13)

### Features

- **harness:** make the confirm gate's gated-tool set injectable ([b264d04](https://github.com/constructive-io/constructive/commit/b264d04c862226c0269983942f9048f179a3b367))

## [0.10.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.10.0...@agentic-kit/harness@0.10.1) (2026-08-05)

**Note:** Version bump only for package @agentic-kit/harness

# [0.10.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.9.0...@agentic-kit/harness@0.10.0) (2026-08-04)

### Features

- **cli:** one shared Constructive login store ([20cb70d](https://github.com/constructive-io/constructive/commit/20cb70ded9bc03f69613e8b5bcd0cb2174c03373))
- **harness:** confirm-gate create_api_key ([69e13af](https://github.com/constructive-io/constructive/commit/69e13af1fa6e71410771a871a8154f5ee0a3823f))
- **harness:** confirm-gate manage_entity_types mutations ([9470663](https://github.com/constructive-io/constructive/commit/9470663d094088f786fd45c556cedfa90b905d19))
- **harness:** default constructive-skills source ([4612160](https://github.com/constructive-io/constructive/commit/46121604ce7426d9c02afa82926d40accd66ba91))

# [0.9.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.8.3...@agentic-kit/harness@0.9.0) (2026-08-02)

**Note:** Version bump only for package @agentic-kit/harness

## [0.8.3](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.8.2...@agentic-kit/harness@0.8.3) (2026-08-01)

**Note:** Version bump only for package @agentic-kit/harness

## [0.8.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.8.1...@agentic-kit/harness@0.8.2) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/harness

## [0.8.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.8.0...@agentic-kit/harness@0.8.1) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/harness

# [0.8.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.7.1...@agentic-kit/harness@0.8.0) (2026-07-31)

**Note:** Version bump only for package @agentic-kit/harness

## [0.7.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.7.0...@agentic-kit/harness@0.7.1) (2026-07-30)

**Note:** Version bump only for package @agentic-kit/harness

# [0.7.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.6.0...@agentic-kit/harness@0.7.0) (2026-07-29)

**Note:** Version bump only for package @agentic-kit/harness

# [0.6.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.5.0...@agentic-kit/harness@0.6.0) (2026-07-29)

**Note:** Version bump only for package @agentic-kit/harness

# [0.5.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.4.0...@agentic-kit/harness@0.5.0) (2026-07-28)

**Note:** Version bump only for package @agentic-kit/harness

# [0.4.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.3.2...@agentic-kit/harness@0.4.0) (2026-07-28)

**Note:** Version bump only for package @agentic-kit/harness

## [0.3.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.3.1...@agentic-kit/harness@0.3.2) (2026-07-28)

**Note:** Version bump only for package @agentic-kit/harness

## [0.3.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.3.0...@agentic-kit/harness@0.3.1) (2026-07-28)

**Note:** Version bump only for package @agentic-kit/harness

# [0.3.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.2.0...@agentic-kit/harness@0.3.0) (2026-07-28)

### Features

- replace typebox with zod in @agentic-kit/harness blueprint schema ([44d9abb](https://github.com/constructive-io/constructive/commit/44d9abb107f000245e60202992056797a2d05f5d))

# [0.2.0](https://github.com/constructive-io/constructive/compare/@agentic-kit/harness@0.1.0...@agentic-kit/harness@0.2.0) (2026-07-28)

### Features

- **harness:** git-repo skill source — fetch releases from GitHub tags (pgpm/appstash pattern) ([ad99e62](https://github.com/constructive-io/constructive/commit/ad99e62b60dd85cb4af5bd2d2f9a616e6ac7ece4))
- **harness:** skill dependency tree via frontmatter requires: ([42f8318](https://github.com/constructive-io/constructive/commit/42f8318725f842f2f4476f0a59adbb4800025714))

# 0.1.0 (2026-07-28)

### Features

- **harness:** extract host-neutral confirm gate + blueprint domain logic from constructive-desktop ([05b7b28](https://github.com/constructive-io/constructive/commit/05b7b28f2c84d970fbcef5a411d630a48b2603b7))
- **harness:** scaffold @agentic-kit/harness — host-neutral context, appstash layout, ordered-overlay skill resolution ([0fee0d5](https://github.com/constructive-io/constructive/commit/0fee0d50e0a862a02c29bd3396764a76f46bbbd1))
- **harness:** skills release fetcher — registry client, SRI integrity, appstash unpack, cached update check with compat range ([d91eb6b](https://github.com/constructive-io/constructive/commit/d91eb6bcb3dd10a45fef1b089ed22be9c4a8b334))
