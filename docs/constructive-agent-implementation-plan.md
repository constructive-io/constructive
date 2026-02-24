# Constructive Agent Implementation Plan

## Current Status (2026-02-24)

- Implemented baseline through approval-aware runtime:
  - PI runtime adapter with policy gates, limit guards, and event mapping.
  - GraphQL tool gateway + operation registry + integration-style endpoint tests.
  - Typed GraphQL operation bundles for common entity CRUD registration.
  - Approval lifecycle support:
    - `approval_requested` / `approval_decision` / `approval_applied` events
    - pending approvals, approve/reject APIs, and resume path.
  - Redaction + argument hashing for approval/event safety.
  - Rule-based contextual policy engine (tenant/actor/tool/arg path-aware).
  - Approval policy-matrix authorizer (decider/tenant/capability/risk scoped).
  - Durable PostgreSQL stores implemented for:
    - runs
    - run events
    - approvals
  - PostgreSQL schema bootstrap + retention pruning helpers.
  - Event replay helper (`replayRunEvents`) for deterministic reconstruction.
  - Real Constructive server + PostgreSQL RLS integration tests (agent tool path).
  - Runner concurrency controls (`maxGlobalRuns`, `maxRunsPerActor`, `maxRunsPerTenant`).
  - Runner interruption control (`abortRun`) and event publishing hooks.
  - Bridge contract tests for in-memory web/TUI adapters + control-protocol integration tests.
  - Metrics/tracing sink wiring in runner/runtime paths.
  - Threat model, runbook, and integration cookbook documentation.
- Implemented extension-first PI integration package:
  - New package: `packages/constructive-agent-pi-extension`.
  - PI extension factory: `createConstructivePiExtension(options)`.
  - Tool adapter: Constructive GraphQL operation allowlist -> PI tool registration.
  - Policy-aware execution:
    - Constructive `PolicyEngine` decisions evaluated per tool call.
    - inline approval prompts for `needs_approval` decisions.
    - non-UI approval fallback mode (`allow`/`deny`).
  - Auth resolution chain:
    - session-scoped in-memory token override (`/constructive-auth-set`)
    - custom token resolver
    - static token
    - env token fallback.
  - Operator commands:
    - `/constructive-status`
    - `/constructive-auth-status`
    - `/constructive-auth-set`.
  - Env-driven extension entrypoint (`extension.ts`) with optional operation-file loading (`CONSTRUCTIVE_OPERATIONS_FILE`).
  - Unit test coverage for adapter, approvals, auth resolution, and env config.

### Phase Status Snapshot

- `Phase 0`: completed (scaffold + contracts + ADRs)
- `Phase 1`: baseline completed (PI runtime adapter, policy gates, runner harness, tested)
- `Phase 2`: completed (GraphQL tool gateway + typed operation bundles + integration tests including real Constructive+RLS path)
- `Phase 3`: implemented in package code (PostgreSQL stores + schema + replay + retention helper)
- `Phase 4`: completed baseline (approval lifecycle + dynamic contextual policy + scoped approval authorization + coverage)
- `Phase 5`: completed baseline (web/TUI bridges + event publishing + control protocol + stream/approval/interrupt tests)
- `Phase 6`: baseline completed (concurrency + runtime guardrails + metrics/tracing hooks + core operational docs)
- `Phase 7`: baseline completed (extension-first PI plugin package + command/auth/policy wiring + tests/build)

### Remaining Work Toward "Almost Feature Complete"

1. Phase 6 beta hardening follow-ups:
   - add chaos/fault-injection tests and explicit retry/backoff validation.
   - wire concrete production sink adapters (e.g., OTEL/Prometheus exporters).
   - add transport-auth examples for non in-memory control protocol deployments.
2. Phase 7 hardening follow-ups:
   - add end-to-end SDK integration tests with real `createAgentSession` wiring. ✅
   - add package examples for `pi install` and project-local extension loading. ✅
   - add richer operation-schema ergonomics (shared schema helpers, generated parameter schemas). ✅

## 1. Objective

Build an experimental package `constructive-agent` that layers PI agent runtime capabilities on top of Constructive’s GraphQL + PostgreSQL + RLS stack, enabling no-UI and optional UI-assisted agentic workflows for entity creation and management.

Primary outcome:
- Safe, RLS-first agent execution where model actions are constrained through typed, allowlisted tools that execute against Constructive GraphQL APIs.

## 2. Scope and Principles

### In scope
- New package in this monorepo: `packages/constructive-agent`.
- Headless agent runtime first.
- Tool gateway for GraphQL operations with policy and approval hooks.
- Event journaling for replay/observability.
- Integration points for PI TUI and PI web UI (adapters, not full product UI).

### Out of scope (initially)
- Autonomous unrestricted SQL/GraphQL generation by the model.
- Browser-side privileged execution.
- Full multi-tenant SaaS productization concerns (billing, quotas, marketplace).

### Engineering principles
1. RLS-first identity path: user JWT -> Constructive middleware -> PostGraphile pgSettings.
2. Least privilege by design: allowlisted tools and capability tags.
3. Typed interfaces everywhere: tool schemas, event envelopes, policy decisions.
4. Deterministic replayability: event journal and run state transitions.
5. Incremental hardening: no rushed “all-at-once” integration.

## 3. Proposed Package Shape

### Package location and naming
- Directory: `packages/constructive-agent`
- NPM package name: `@constructive-io/constructive-agent`

### Initial external dependencies
- `@mariozechner/pi-agent-core`
- `@mariozechner/pi-ai`
- `@sinclair/typebox` (if needed for tool schemas, likely via PI already)
- Existing Constructive clients/codegen outputs where applicable

### Internal module layout (proposed)

```text
packages/constructive-agent/
  src/
    index.ts
    types/
      approval.ts
      config.ts
      events.ts
      policy.ts
      run-state.ts
      tools.ts
    runtime/
      create-agent-runner.ts
      replay.ts
      run-controller.ts
      steering.ts
    tools/
      registry.ts
      capability-tags.ts
      graphql/
        graphql-tool.ts
        operation-registry.ts
        executor.ts
        auth-context.ts
    policy/
      policy-engine.ts
      default-policy.ts
      approval-gates.ts
      redaction.ts
    storage/
      interfaces.ts
      memory/
        memory-approval-store.ts
        memory-event-store.ts
        memory-run-store.ts
      postgres/
        pg-approval-store.ts
        pg-client.ts
        pg-event-store.ts
        pg-run-store.ts
        retention.ts
        schema.ts
    adapters/
      headless/
        service.ts
      tui/
        bridge.ts
      web/
        bridge.ts
    observability/
      logger.ts
      tracing.ts
      metrics.ts
    testing/
      fixtures.ts
      test-tools.ts
  __tests__/
    unit/
    integration/
```

## 4. Runtime Architecture (Target)

1. `Run trigger` starts a run (`runId`, actor identity, tenant context, model config).
2. PI Agent loop executes with a curated tool registry.
3. Each tool call is pre-validated and policy-checked.
4. Approved tool calls execute through GraphQL operation executor.
5. Tool results flow back to PI loop.
6. All lifecycle events are journaled (`run_start`, `turn_start`, `tool_call_start`, `tool_call_end`, etc.).
7. Run reaches terminal status (`completed`, `failed`, `aborted`, `needs_approval`).

Key hard boundary:
- The LLM does not directly choose arbitrary GraphQL documents. It chooses tool names + typed args only.

## 5. Phase Plan

## Phase 0: Foundations and RFC Baseline

### Goals
- Establish conventions and constraints before implementation.

### Tasks
1. Create package scaffold with standard monorepo scripts (`clean`, `build`, `lint`, `test`).
2. Add architecture README with sequence diagrams and data contracts.
3. Define core types:
   - run config
   - event envelope
   - capability tags
   - policy decision model
4. Create ADRs:
   - identity propagation strategy
   - event storage strategy
   - tool allowlist strategy
5. Add dependency strategy for PI packages:
   - stable npm versions or pinned commit strategy for experiments.

### Exit criteria
- Package compiles.
- ADRs approved internally.
- Core interfaces frozen for Phase 1.

## Phase 1: Headless MVP (Single-run, In-memory Storage)

### Goals
- First working end-to-end headless run with real PI loop and mock/sandbox tools.

### Tasks
1. Implement `createAgentRunner()` wrapper around PI Agent.
2. Implement in-memory event store + run store.
3. Implement tool registry with:
   - lookup by tool name
   - schema validation
   - capability tag metadata
4. Implement simple policy engine:
   - allow/deny by capability
   - deny by default fallback
5. Add 2-3 baseline tools:
   - `graphql_read_entity`
   - `graphql_create_entity`
   - `graphql_update_entity`
6. Add CLI/dev harness command for local run simulation.

### Tests
- Unit: registry, policy decisions, run state transitions.
- Integration: single run with tool call + event journaling.
- Failure path: denied tool + malformed args + tool timeout.

### Exit criteria
- Can run one complete headless agent flow.
- Deterministic event log captured in memory.
- No direct arbitrary GraphQL text path.

## Phase 2: Constructive GraphQL Tool Gateway (RLS Path)

### Goals
- Replace mock execution with real Constructive GraphQL execution using bearer identity.

### Tasks
1. Build operation registry:
   - map `toolName -> typed GraphQL operation`.
2. Build GraphQL executor adapter:
   - endpoint resolution
   - auth headers
   - request timeout / retries
3. Integrate codegen typed documents/client where possible.
4. Implement auth context contract:
   - actor token
   - tenant/database/api identifiers
   - optional request metadata (`ip`, `origin`, `user-agent`)
5. Add strict operation allowlist:
   - only registered operations executable.

### Tests
- Integration against local Constructive GraphQL server.
- RLS behavioral tests using `pgsql-test` context simulation.
- Regression tests for unauthorized mutation attempts.

### Exit criteria
- Real GraphQL writes read back correctly under RLS constraints.
- Unauthorized actions are blocked by GraphQL/RLS and surfaced clearly.

## Phase 3: Durable State and Recovery

### Goals
- Enable resumability and post-mortem audit.

### Tasks
1. Implement PostgreSQL event store/run store adapters.
2. Define schema for:
   - runs
   - run_events
   - tool_invocations
   - approvals
3. Implement replay/recovery:
   - reconstruct run state from events.
4. Add idempotency keys for external triggers and mutation tools.
5. Add run cleanup and retention strategy.

### Tests
- Crash/resume integration tests.
- Replay consistency tests.
- Idempotency tests with duplicate triggers.

### Exit criteria
- Interrupted runs can be resumed.
- Full trace can be reconstructed from persisted events.

## Phase 4: Policy Hardening and Human Approval

### Goals
- Make higher-risk operations safe by policy and workflow controls.

### Tasks
1. Implement multi-layer policy evaluation:
   - static policy (capability whitelist)
   - dynamic policy (resource/tenant context)
   - per-tool risk scoring
2. Implement `needs_approval` run pause semantics.
3. Add approval API and resume path:
   - approve
   - reject
   - amend (optional later)
4. Define default risk classes:
   - read-only
   - low-risk write
   - high-risk write
   - destructive
5. Add secure redaction rules for logged tool args/results.

### Tests
- Policy matrix tests.
- Approval lifecycle tests.
- Redaction tests for sensitive fields.

### Exit criteria
- High-risk actions cannot proceed without explicit approval.
- Approval workflow is auditable and resumable.

## Phase 5: Operator Interfaces (TUI First, Web Bridge Next)

### Goals
- Add practical operator control surfaces without coupling core runtime to UI tech.

### Tasks
1. TUI bridge adapter:
   - subscribe to run events
   - steering/follow-up injection
   - approval actions
2. Web bridge adapter:
   - stream run events over SSE/WebSocket
   - expose safe control endpoints
3. Define transport-agnostic event protocol for UIs.
4. Keep UIs as optional consumers of the same runtime/events.

### Tests
- Adapter contract tests.
- Live-stream interruption tests.
- Approval via UI bridge tests.

### Exit criteria
- Operator can monitor and control runs from at least one UI surface.
- Core runtime remains UI-agnostic.

## Phase 6: Production Hardening (Experimental-to-Beta)

### Goals
- Raise reliability, observability, and security posture.

### Tasks
1. Add metrics:
   - run duration
   - tool success/failure rates
   - approval latency
2. Add tracing correlation:
   - `runId`, `turnId`, `toolCallId`, request IDs.
3. Rate limiting and concurrency controls per tenant/actor.
4. Add budget guardrails:
   - token budget
   - max tool calls per run
   - max runtime duration
5. Add chaos/fault injection tests.
6. Documentation set:
   - threat model
   - runbook
   - integration cookbook.

### Exit criteria
- Beta quality checklist passed.
- Clear operational runbooks in place.

## 6. Testing Strategy by Layer

1. Unit tests
- policy engine
- tool registry
- run state machine
- event serialization/deserialization

2. Integration tests
- PI loop + gateway + stores
- Constructive GraphQL + RLS paths
- approval pause/resume

3. End-to-end tests
- trigger -> run -> tool(s) -> completion
- trigger -> risky tool -> needs approval -> approve -> completion

4. Security tests
- tool injection attempts
- unauthorized operation attempts
- event log redaction assertions

## 7. Data Model (Initial Suggestion)

### `agent_runs`
- `id` (uuid, pk)
- `status` (enum)
- `actor_id` (text)
- `tenant_id` (text)
- `started_at`, `ended_at`
- `model_provider`, `model_name`
- `error_code`, `error_message`

### `agent_run_events`
- `id` (bigserial, pk)
- `run_id` (uuid, fk)
- `seq` (int, unique per run)
- `event_type` (text)
- `payload` (jsonb)
- `created_at`

### `agent_tool_invocations`
- `id` (uuid, pk)
- `run_id` (uuid, fk)
- `tool_name` (text)
- `capability` (text)
- `status` (enum)
- `args_redacted` (jsonb)
- `result_redacted` (jsonb)
- `started_at`, `ended_at`

### `agent_approvals`
- `id` (uuid, pk)
- `run_id` (uuid, fk)
- `tool_invocation_id` (uuid, fk)
- `decision` (enum: approved/rejected)
- `decided_by` (text)
- `reason` (text)
- `decided_at`

## 8. Security Controls Checklist

1. Tool allowlist only (no arbitrary query tool in MVP).
2. Capability tagging and policy decision on every tool call.
3. Actor token propagation for RLS enforcement.
4. Sensitive data redaction in logs and persisted events.
5. Approval gates for destructive/high-risk capabilities.
6. Strict timeouts + cancellation support.
7. Immutable event journal for audit.

## 9. Incremental Deliverables (What ships per phase)

1. Phase 0: package skeleton + ADR docs.
2. Phase 1: working headless local runner.
3. Phase 2: real GraphQL execution with RLS.
4. Phase 3: durable run/event persistence and replay.
5. Phase 4: approval workflow and hardened policy.
6. Phase 5: TUI/web control bridges.
7. Phase 6: operational hardening and beta readiness.

## 10. Immediate Next Actions (Start Now)

1. Create `packages/constructive-agent` scaffold and baseline scripts.
2. Add `src/types` contracts and empty runtime interfaces.
3. Implement Phase 1 in-memory runner and one read-only GraphQL tool.
4. Stand up integration test harness targeting local Constructive GraphQL endpoint.
5. Draft first policy file with deny-by-default behavior.

## 11. Open Decisions to Resolve Before Phase 2

1. PI dependency strategy:
- direct npm dependency vs pinned git commit snapshots for deterministic experiments.

2. Event storage location:
- reuse existing DB schema vs dedicated schema/package for agent runtime metadata.

3. Approval authority model:
- who can approve, and where approval requests surface first (CLI, TUI, internal admin web).

4. Multi-tenant partition strategy:
- strict tenant scoping columns + indexes from day one or staged introduction.
