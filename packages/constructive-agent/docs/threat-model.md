# Constructive Agent Threat Model (Experimental)

## Scope

This threat model covers `@constructive-io/constructive-agent` runtime boundaries:

1. PI model/tool orchestration
2. Constructive GraphQL operation execution
3. Policy + approval enforcement
4. Run/event persistence

It assumes PostgreSQL RLS is enforced by Constructive GraphQL middleware and PostGraphile role/claim settings.

## Security Objectives

1. Prevent arbitrary or escalated data access from agent tool calls.
2. Preserve tenant and actor isolation.
3. Ensure high-risk actions require explicit approval.
4. Preserve auditability with tamper-evident run/event trails.
5. Minimize sensitive data exposure in logs/events.

## Trust Boundaries

1. **Model boundary**: LLM output is untrusted and must only select allowlisted tools.
2. **Tool boundary**: Tool arguments are untrusted until policy + validation pass.
3. **GraphQL boundary**: All business writes should run via bearer-token identity path.
4. **Approval boundary**: Only authorized deciders can approve/reject pending actions.
5. **Storage boundary**: Event/approval stores are durable audit records.

## Threats and Controls

### 1. Arbitrary operation execution

- Threat: model attempts to execute unregistered GraphQL documents.
- Control: operation allowlist via tool registry; runtime executes tools by name only.
- Residual risk: weakly designed tools that proxy arbitrary user input.

### 2. Cross-tenant or cross-user mutation

- Threat: mutation arguments target unauthorized tenant/user resource.
- Control: Constructive GraphQL + PostgreSQL RLS remains source of truth.
- Additional control: contextual policy rules can add pre-approval/deny checks for risky patterns.

### 3. Privilege escalation in approval path

- Threat: unauthorized actor approves high-risk operation.
- Control: approval authorizer enforcement in runner (`approvalAuthorizer`).
- Additional control: policy-matrix authorizer supports decider, tenant, capability, risk, tool constraints.

### 4. Sensitive data leakage in logs/events

- Threat: tokens/secrets persisted in run events or approvals.
- Control: recursive redaction in runtime event and approval payloads.
- Residual risk: custom tools returning sensitive data outside configured redaction patterns.

### 5. Unbounded resource consumption

- Threat: long-running loops or excessive tool calls.
- Control: runtime limits (`maxTurns`, `maxToolCalls`, `maxRuntimeMs`) and runner concurrency limits.
- Additional control: operator/automation interruption via `abortRun`.

### 6. Event-stream subscriber abuse

- Threat: unauthorized listener consumes sensitive run stream.
- Control: adapter-level authn/authz required in real transport implementation.
- Residual risk: in-memory bridge is process-local and intentionally non-authenticated.

## Recommended Production Baseline

1. Use GraphQL operation bundles with explicit allowlists only.
2. Default to deny/approval for write/destructive capabilities.
3. Enable policy-matrix approval authorizer with tenant-scoped deciders.
4. Persist runs/events/approvals in PostgreSQL (`ensureAgentStorageSchema`).
5. Configure redaction rules for tokens, keys, passwords, secrets.
6. Attach metrics + tracing sinks and alert on abnormal failure/approval latency.
7. Keep control protocol endpoints behind service auth and audit logging.

## Validation Coverage in Package Tests

1. Policy matrix tests for static/contextual/composite and rule-based decisions.
2. Approval lifecycle + authorizer enforcement tests.
3. RLS integration tests against real Constructive GraphQL server path.
4. Control protocol tests for stream/approval/abort behavior.
