# Agentic AI Research Log (Constructive + PI)

## 2026-02-24T00:00:00Z - Checkpoint 1: Scope + Repo Orientation

### User Goal Interpreted
- Design viable approaches for agent-first creation workflows (no traditional UI required) on top of Constructive's Postgres + RLS + GraphQL stack.
- Compare TUI and web UI patterns for agentic experience.
- Prefer PI as the thin agent layer (instead of Vercel AI SDK).

### Local Context Collected
- Constructive monorepo key entry points confirmed:
  - `pgpm/core` migration engine (`PgpmPackage`, `PgpmMigrate`)
  - `packages/cli` command router for GraphQL/server/codegen flows
  - `graphql/server` (`GraphQLServer`) with middleware chain around auth/api resolution/PostGraphile integration
- PI monorepo discovered at `~/workspace/learn/pi-mono` with relevant packages:
  - `packages/agent`
  - `packages/tui`
  - `packages/web-ui`
  - `packages/mom`
  - `packages/ai`

### Next Research Tracks (Parallel)
1. Constructive architecture extraction for agent integration points.
2. PI architecture extraction for reusable agent loop/runtime/UI layers.
3. External research: agentic TUI/web patterns and architectures from primary sources.

## 2026-02-24T00:20:00Z - Checkpoint 2: Constructive Runtime Integration Surface

### Key Findings (Constructive)
- `graphql/server` runtime resolves tenant/API context per request in `middleware/api.ts`:
  - Supports domain routing for public APIs.
  - Supports header-driven routing for private APIs (`X-Api-Name`, `X-Schemata`, `X-Meta-Schema`, `X-Database-Id`).
  - Caches API resolution via `svcCache`.
- Authentication is RLS-function driven in `middleware/auth.ts`:
  - Uses configured `authenticate` / `authenticateStrict` DB functions.
  - Converts bearer token into DB-returned token payload (`req.token`).
- PostGraphile context binding in `middleware/graphile.ts`:
  - Per-request `pgSettings` sets `role` (`roleName` or `anonRole`) and JWT claims (`jwt.claims.user_id`, `database_id`, etc.).
  - Strong alignment for agent actions constrained by PostgreSQL RLS.
- GraphQL handler lifecycle:
  - Per-service-key PostGraphile instance caching.
  - Single-flight in-flight map to avoid duplicate handler creation under concurrency.

### Implication
- Agent layer should avoid bypassing GraphQL/PostGraphile for business writes unless intentionally invoking privileged backend services.
- Safe default: agent executes GraphQL operations with end-user bearer token so RLS remains source of truth.

## 2026-02-24T00:35:00Z - Checkpoint 3: Constructive Programmatic Access + Dev Tooling

### Key Findings
- `cnc execute` command provides raw GraphQL execution path with context-aware endpoint + token resolution.
- `packages/cli/src/sdk/executor.ts` abstracts context/token loading and GraphQL request execution.
- `graphql/codegen` provides typed execution client patterns (`createGraphQLClient`, typed documents) and ORM-style generated runtime templates.
- `pgsql-test` offers strong RLS-aware integration testing:
  - `setContext({ role, 'jwt.claims.*': ... })`
  - per-test transactional isolation (`beforeEach`/`afterEach`)

### Implication
- Immediate low-risk agent integration path exists:
  - Reuse existing GraphQL execution client in a dedicated tool layer.
  - Use codegen-generated operation SDK for structured tool contracts.
  - Validate RLS/authorization behavior in `pgsql-test` integration tests.

## 2026-02-24T00:50:00Z - Checkpoint 4: PI Monorepo Capabilities (Agent, Web UI, TUI)

### Key Findings (PI)
- `packages/agent`:
  - Event-driven loop with lifecycle events: `agent_start`, `turn_*`, `message_*`, `tool_execution_*`.
  - Built-in steering/follow-up queues for live interruption and queued continuation.
  - Tool calling is first-class; custom `convertToLlm` and `transformContext` hooks allow message model adaptation.
  - Optional `streamFn` lets you proxy LLM backend calls.
- `packages/web-ui`:
  - `AgentInterface` and `ChatPanel` subscribe directly to PI agent events.
  - Designed around streaming updates + tool rendering + attachment handling.
  - Supports custom runtime/tool renderers and proxy-aware stream function setup.
- `packages/tui`:
  - Differential renderer with batched frame updates.
  - Focus/overlay model and robust raw terminal input handling.
  - Strong foundation for local operator consoles and low-latency agent control surfaces.

### Implication
- PI can be used as thin orchestration and UX shell while Constructive remains data/control plane.
- Strong fit for dual-channel UX:
  - operator TUI for internal workflows and approvals
  - web UI for customer-facing/ops-facing agent sessions

## 2026-02-24T01:10:00Z - Checkpoint 5: External Architecture Research (Primary Sources)

### OpenAI Platform + Agents
- Responses streaming exposes typed semantic events for text/tool execution progress.
- Tools guide positions built-ins + function tools + remote MCP as unified extension model.
- Background mode supports durable long-running tasks with polling/streaming + optional webhooks.
- Conversations API formalizes server-side conversation state.
- OpenAI Agents SDK docs highlight handoffs, guardrails, and tracing/grouping primitives (`groupId`, workflow grouping).

### MCP (Model Context Protocol)
- Modern transport model is `stdio` + Streamable HTTP (SSE optional within streamable HTTP).
- Strong security guidance: origin validation, localhost binding for local servers, authentication.
- Tool metadata supports safety hints like read-only annotations.
- Resources/prompts concepts support structured context retrieval and reusable user-invoked workflows.

### LangGraph / Temporal
- LangGraph durable execution + checkpointing, explicit stream modes (`updates`, `values`, `messages`, `events`).
- Temporal AI cookbook patterns:
  - durable tool loops
  - human-in-the-loop via signals
  - MCP tools implemented as thin wrappers launching durable workflows.

### Agent Architecture Papers
- ReAct: interleaved reasoning + acting.
- Toolformer: model learns when/how to call tools.
- Reflexion: verbal feedback + episodic memory for iterative improvement.

## 2026-02-24T01:20:00Z - Checkpoint 6: Agentic UI/TUI Pattern Research

### Web UI patterns observed
- Event-stream first UIs (typed event ingestion, progressive rendering, tool/result surfaces).
- Explicit state partitioning:
  - model-visible structured state
  - UI-private ephemeral state
  - backend durable cross-session state.
- Human-in-loop interaction patterns:
  - approvals/interruption points
  - actionable tool-call cards with clear side-effect boundaries.

### TUI patterns observed
- Event loop + background worker model to avoid blocking render loop.
- Diff rendering and partial updates for low-latency feedback.
- Explicit cancellation semantics for long-running tasks/tools.

### PI alignment
- PI already maps to these patterns (event streams, tool lifecycle events, steering/interruption, separate UI runtimes).

## 2026-02-24T01:35:00Z - Checkpoint 7: Viable Solution Blueprints (Constructive + PI)

### Solution A: Headless Agent Service (No UI, API-triggered)

**When to choose**
- You need autonomous entity creation/updating via workflows, webhooks, or job queues before building UX.

**Architecture**
1. Trigger (`jobs`, webhook, CLI, HTTP) starts a PI `Agent`.
2. Agent tools call a constrained GraphQL Tool Gateway:
   - Uses Constructive codegen client and allowlisted operations.
   - Executes with user/project bearer token (RLS enforced in DB).
3. Agent emits events to durable store (`agent_run`, `turn`, `tool_call`, `tool_result`).
4. Optional async orchestration layer (Temporal or existing jobs) handles long-running retries/approvals.

**Security profile**
- Strong by default if every mutation runs through user token + allowlisted tool set.
- Add approval gates for privileged mutations.

### Solution B: Operator TUI (PI-TUI) + Headless Core

**When to choose**
- Internal teams need high-speed control/observability before customer-facing UI.

**Architecture**
- Reuse Solution A core.
- Add PI-TUI frontend bound to agent event stream:
  - streaming assistant text/tool updates
  - interrupt (`steer`) and follow-up commands
  - approval/reject actions for risky tool calls

**Benefit**
- Fastest path to practical agent operations with minimal web complexity.

### Solution C: Web UI Agent Workspace (PI Web UI) + Policy Gateway

**When to choose**
- You need multi-user browser UX and session persistence.

**Architecture**
1. Browser uses PI `ChatPanel` / `AgentInterface`.
2. Agent runtime lives server-side (recommended for security) or client-side for low-risk scenarios.
3. Tool execution delegated to backend Tool Gateway (same as A/B).
4. Session state persisted (conversation, tool traces, artifacts); optional MCP resources for contextual retrieval.

**Critical rule**
- Never expose privileged DB credentials/API keys to browser-side tool execution.

### Solution D: Hybrid Durable Agent Runtime (Recommended medium-term)

**When to choose**
- You need reliable long-running plans, resumability, approvals, and high auditability.

**Architecture**
- PI agent loop for reasoning + tool selection.
- Temporal-style durable workflow for orchestration (state machine + retries + human signals).
- Constructive GraphQL gateway remains execution plane with RLS enforcement.
- UI channel (TUI/web) is interchangeable subscriber/controller over the same event stream.

### Cross-Solution Shared Building Blocks

1. **GraphQL Tool Gateway**
- Typed tool contracts generated from Constructive codegen.
- Operation allowlist and argument validation.
- Capability tags (read-only, write, destructive) for policy routing.

2. **Policy/Approval Layer**
- Risk-based gating for high-impact operations.
- Approvals integrated as agent interruption/follow-up messages.

3. **Agent Event Journal**
- Persist all lifecycle events for replay, debugging, and analytics.
- Enables live TUI/web streaming and post-mortem audits.

4. **RLS-first Identity Model**
- Default path: user JWT -> Constructive auth middleware -> PostGraphile `pgSettings` role/claims.
- Avoid service-role shortcuts unless explicitly required and separately governed.

## 2026-02-24T02:00:00Z - Checkpoint 8: Implementation Planning Artifact Created

### Deliverable
- Added detailed phased implementation plan document:
  - `docs/constructive-agent-implementation-plan.md`

### Plan Characteristics
- Starts with headless runtime and in-memory stores.
- Moves to real Constructive GraphQL execution with RLS-preserving identity propagation.
- Adds durable storage/replay, then policy + approval controls.
- Introduces TUI/web adapters only after core runtime hardening.
- Includes testing strategy, data model sketch, security checklist, and open decisions.

## 2026-02-24T02:30:00Z - Checkpoint 9: Implementation Started (Phase 0 Scaffold)

### Implemented
- New package scaffold created: `packages/constructive-agent`
- Added package configuration:
  - `package.json`, `tsconfig.json`, `tsconfig.esm.json`, `jest.config.js`
- Added foundational source modules:
  - run/event/policy/tool/config type contracts
  - run controller + runner skeleton
  - tool registry + capability helpers
  - GraphQL gateway interfaces/executor/tool builder
  - in-memory run/event stores
  - placeholder PostgreSQL store adapters
  - headless/TUI/web adapter interfaces
  - observability and test fixtures utilities
- Added architecture/ADR docs:
  - `docs/architecture.md`
  - `docs/adr/0001-identity-propagation.md`
  - `docs/adr/0002-event-storage.md`
  - `docs/adr/0003-tool-allowlist.md`
- Added initial unit tests for:
  - tool registry
  - run controller lifecycle
  - static policy engine

### Validation
- `pnpm --filter @constructive-io/constructive-agent build` passed.
- `pnpm --filter @constructive-io/constructive-agent test` passed.
- `pnpm --filter @constructive-io/constructive-agent lint` currently fails due repo-level ESLint v9 flat-config mismatch (`.eslintrc.json` present, no `eslint.config.js`).

## 2026-02-24T03:10:00Z - Checkpoint 10: Phase 1 Runtime Wiring (In Progress)

### Implemented
- Added `src/runtime/pi-runtime-adapter.ts`:
  - PI runtime loader abstraction
  - default lazy ESM loader for `@mariozechner/pi-ai` and `@mariozechner/pi-agent-core`
  - tool execution path with policy evaluation (`allow` / `deny` / `needs_approval`)
  - run event mapping for turns and tool lifecycle
  - runtime limits handling (`maxToolCalls`, `maxRuntimeMs`)
- Updated run config to require prompt input (`ConstructiveAgentRunConfig.prompt`).
- Added `src/testing/local-runner.ts` for headless local runtime harnessing.
- Added unit tests for PI runtime adapter behavior:
  - allowed read tool => completed run
  - write tool under default policy => `needs_approval`

### Validation
- `pnpm --filter @constructive-io/constructive-agent test` passed (4 suites, 8 tests).
- `pnpm --filter @constructive-io/constructive-agent build` passed.

### Next
- Implement first real read-only GraphQL operation tool and integration test it through PI runtime adapter.

## 2026-02-24T03:35:00Z - Checkpoint 11: First Real GraphQL Tool Wired

### Implemented
- Extended identity/config contracts:
  - `identity.graphqlEndpoint` added.
  - `ConstructiveAgentRunConfig.prompt` required for PI runtime prompting.
  - tool execution context now includes `identity`.
- Added built-in read-only GraphQL tool:
  - `createGraphQLHealthCheckTool()` in `src/tools/graphql/builtins.ts`
  - executes `__typename` query via fetch executor with identity-derived auth headers.
- Added local harness helper:
  - `src/testing/local-runner.ts`
- Added tests:
  - `pi-runtime-adapter.test.ts` (allow and needs-approval paths)
  - `graphql-health-check-tool.test.ts` (real GraphQL fetch execution through PI adapter path)

### Validation
- `pnpm --filter @constructive-io/constructive-agent test` passed (5 suites, 9 tests).
- `pnpm --filter @constructive-io/constructive-agent build` passed.

## 2026-02-24T03:55:00Z - Checkpoint 12: Registry-Backed GraphQL Tool Bundles

### Implemented
- Added `createGraphQLToolsFromRegistry()` in `src/tools/graphql/tool-factory.ts`.
  - Converts allowlisted `GraphQLOperationRegistry` definitions into executable `AgentToolDefinition[]`.
  - Resolves endpoint from identity (`identity.graphqlEndpoint`) or static endpoint option.
  - Applies auth headers via identity token and Constructive routing headers.
- Improved operation registry typing to support typed `mapVariables`.
- Added tests:
  - `graphql-tool-factory.test.ts` for variable mapping, auth headers, and missing-endpoint error path.

### Validation
- `pnpm --filter @constructive-io/constructive-agent test` passed (6 suites, 11 tests).
- `pnpm --filter @constructive-io/constructive-agent build` passed.

## 2026-02-24T04:15:00Z - Checkpoint 13: Runtime Hardening + Integration Coverage

### Implemented
- Runtime hardening:
  - `recordError()` now transitions run lifecycle to failed and emits full status/end events.
  - `needs_approval` is treated as paused state (not terminal timestamp).
  - PI adapter now fails runs on:
    - policy deny (`POLICY_DENY`)
    - max tool calls exceeded (`TOOL_LIMIT_EXCEEDED`)
    - max turns exceeded (`TURN_LIMIT_EXCEEDED`)
- Added integration coverage:
  - `__tests__/integration/registry-runner.integration.test.ts`
  - validates end-to-end flow: registry tool -> PI adapter -> HTTP GraphQL endpoint
  - verifies auth/routing headers and mapped variables.

### Validation
- `pnpm --filter @constructive-io/constructive-agent test` passed (7 suites, 16 tests).
- `pnpm --filter @constructive-io/constructive-agent build` passed.

## 2026-02-24T05:00:00Z - Checkpoint 14: Durable Storage + Approval Lifecycle

### Implemented
- Phase 3 durability slices added:
  - PostgreSQL query abstraction: `src/storage/postgres/pg-client.ts`
  - Schema bootstrap helper: `src/storage/postgres/schema.ts`
  - PostgreSQL stores implemented:
    - `PgRunStore`
    - `PgEventStore`
    - `PgApprovalStore`
  - Retention helper: `src/storage/postgres/retention.ts`
  - Replay helper: `src/runtime/replay.ts`
- Phase 4 approval flow additions:
  - approval contracts: `src/types/approval.ts`
  - in-memory approval store: `src/storage/memory/memory-approval-store.ts`
  - run/event contracts extended with:
    - `approval_requested`
    - `approval_decision`
    - `approval_applied`
  - `RunController` approval methods:
    - request approval
    - decide approval
    - mark approval applied
    - list/find approval records
  - `AgentRunner` approval/resume APIs:
    - `listApprovals`
    - `approvePending`
    - `rejectPending`
    - `resumeRun`
- Policy hardening additions:
  - `src/policy/redaction.ts`:
    - recursive redaction
    - stable hashing for invocation identity
  - PI runtime adapter now:
    - creates approval requests on `needs_approval`
    - applies approved invocations on resume
    - fails on rejected/already-applied approvals
    - redacts tool args/results in event trails
- Phase 5 bridge progress:
  - `InMemoryWebBridge`
  - buffered TUI bridge helper
  - headless service methods for approve/reject/resume/list approvals

### Tests Added
- `__tests__/unit/approval-lifecycle.test.ts`
  - pause at approval, approve + resume, completion
  - sensitive field redaction in approval event payloads
- `__tests__/unit/replay.test.ts`
  - deterministic run/approval reconstruction from event journal

### Validation
- `pnpm --filter @constructive-io/constructive-agent build` passed.
- `pnpm --filter @constructive-io/constructive-agent test` passed (9 suites, 20 tests).

## 2026-02-24T06:00:00Z - Checkpoint 15: Real RLS Integration + Runtime Hardening

### Implemented
- Added real Constructive server integration tests using `graphql-server-test`:
  - new integration fixture: `packages/constructive-agent/__fixtures__/seed/rls-overlay.sql`
  - auth function wiring + `rls_module` metadata
  - PostgreSQL RLS policies with JWT claim enforcement on `animals`
  - integration test:
    - `__tests__/integration/constructive-rls.integration.test.ts`
    - validates:
      - user-scoped reads via bearer token -> JWT claims
      - unauthorized cross-user write blocked by RLS
      - authorized write with matching owner succeeds
- Added runner concurrency controls:
  - `maxGlobalRuns`
  - `maxRunsPerActor`
  - `maxRunsPerTenant`
  - implemented in `src/runtime/create-agent-runner.ts`
- Added bridge contract tests:
  - `__tests__/unit/web-bridge.test.ts`
  - `__tests__/unit/tui-bridge.test.ts`
- Added concurrency tests:
  - `__tests__/unit/concurrency-runner.test.ts`

### Validation
- `pnpm --filter @constructive-io/constructive-agent test` passed (13 suites, 29 tests).
- `pnpm --filter @constructive-io/constructive-agent build` passed.

### Remaining Gaps
- Dynamic tenant/resource-aware policy engine and approval authority model.
- Expanded typed GraphQL operation bundles for common entity lifecycle workflows.
- Production metrics/tracing sink wiring and operational runbook/threat model documentation.

## 2026-02-24T07:20:00Z - Checkpoint 16: Feature-Complete Pass (Policy/Control/Ops)

### Implemented
- Phase 2 closure:
  - Added typed GraphQL operation bundles:
    - `src/tools/graphql/operation-bundles.ts`
    - `createEntityCrudBundle`, `registerOperationBundle`, `registerEntityCrudBundle`
  - Added unit coverage for bundle generation + execution mapping.
- Phase 4 closure:
  - Added dynamic rule-based contextual policy engine:
    - `RuleBasedContextualPolicyEngine`
    - tenant/actor/tool/capability/risk/metadata/arg-path matching
  - Added richer approval authority model:
    - `PolicyMatrixApprovalAuthorizer`
    - scoped rule matching by decider, tenant, tool, capability, risk, decision
  - Added unit tests for policy matrix and approval authorization enforcement.
- Phase 5 closure:
  - Added runner event publishing hook (`eventPublisher`) and web bridge global subscriptions (`subscribeAll`).
  - Added control protocol adapter:
    - `src/adapters/control/protocol.ts`
    - supports start/resume/abort/approve/reject/get/list command handling.
  - Added integration tests for:
    - live event streaming
    - approval flow through control protocol
    - interruption (`abort_run`) while run is active
- Phase 6 baseline hardening:
  - Added run interruption API (`runner.abortRun` + headless service wiring).
  - Added metrics/tracing sink contracts + in-memory sinks:
    - `src/observability/metrics.ts`
    - `src/observability/tracing.ts`
  - Wired metrics/traces into runner + PI runtime adapter for:
    - run lifecycle
    - policy decisions
    - tool execution timing
    - approval latency/decisions
  - Added docs:
    - `packages/constructive-agent/docs/threat-model.md`
    - `packages/constructive-agent/docs/runbook.md`
    - `packages/constructive-agent/docs/integration-cookbook.md`

### Validation
- `pnpm --filter @constructive-io/constructive-agent test` passed.
  - 17 suites, 43 tests.
- `pnpm --filter @constructive-io/constructive-agent build` passed.

### Current Gap Profile
- Package is now at “almost feature complete” baseline from the implementation plan.
- Remaining work is beta hardening depth (chaos/fault injection, concrete sink exporters, deployment auth examples for control transport).

## 2026-02-24T08:10:00Z - Checkpoint 17: PI Coding-Agent Plugin Implementation

### Implemented
- Added extension-first integration package:
  - `packages/constructive-agent-pi-extension`
- Implemented PI extension adapter in:
  - `src/extension-factory.ts`
  - `createConstructivePiExtension(options)` and `createConstructiveTools(options)`
- Implemented tool execution path:
  - Constructive operation allowlist -> PI tool registration
  - per-call policy evaluation via Constructive `PolicyEngine`
  - approval UX for `needs_approval` decisions
  - non-UI fallback behavior (`allow`/`deny`)
  - GraphQL execution with Constructive auth header composition
- Implemented auth chain and operator controls:
  - session-scoped in-memory token override
  - resolver/static/env token fallback
  - `/constructive-status`
  - `/constructive-auth-status`
  - `/constructive-auth-set`
- Implemented env-driven extension entrypoint:
  - `src/env-config.ts`
  - `src/extension.ts`
  - optional JSON operation loading via `CONSTRUCTIVE_OPERATIONS_FILE`
- Added docs:
  - `packages/constructive-agent-pi-extension/README.md`
- Added test coverage:
  - `__tests__/unit/extension-factory.test.ts`
  - `__tests__/unit/env-config.test.ts`

### Validation
- `pnpm --filter @constructive-io/constructive-agent-pi-extension test` passed.
  - 2 suites, 9 tests.
- `pnpm --filter @constructive-io/constructive-agent-pi-extension build` passed.

### Remaining Gaps
- End-to-end SDK integration tests (`createAgentSession` + extension factory).
- packaged examples for direct `pi install` workflows.
- operation-schema ergonomics for generated schemas from Constructive codegen.

## 2026-02-24T09:00:00Z - Checkpoint 18: Hardening Follow-ups Completed

### Implemented
- Added SDK integration test exercising real PI SDK wiring:
  - `createAgentSession`
  - `DefaultResourceLoader` with `extensionFactories`
  - runtime execution of extension-registered GraphQL tool
  - local mock GraphQL server assertions (headers + variables + output)
  - file: `packages/constructive-agent-pi-extension/__tests__/integration/sdk-session.integration.test.ts`
- Added schema ergonomics helper:
  - `createOperationParametersSchema`
  - compact scalar/array/nullable variable spec -> TypeBox schema conversion
  - file: `packages/constructive-agent-pi-extension/src/operation-schema.ts`
- Added package workflow examples:
  - local extension: `examples/local-extension/*`
  - package install flow: `examples/pi-package/*`
  - operation JSON sample for env-driven loading.

### Validation
- `pnpm --filter @constructive-io/constructive-agent-pi-extension test` passed with integration + unit coverage.
- `pnpm --filter @constructive-io/constructive-agent-pi-extension build` passed.

### Current Gap Profile
- Extension package now covers planned baseline:
  - extension-first adapter
  - offline SDK integration coverage
  - install/run examples
  - schema helper ergonomics.

## 2026-02-24T09:40:00Z - Checkpoint 19: Review Defects Remediation

### Addressed Defects
- P1: per-run event sequence allocation race in `RunController.emit`
  - Implemented per-run serialized emit queues.
  - `nextSeq` + `append` now execute sequentially per run within a controller instance.
  - added regression test:
    - `__tests__/unit/run-controller.test.ts`
    - validates unique monotonic sequence values under concurrent `appendEvent` calls.
- P2: timeout/abort rejections misclassified as `PI_RUNTIME_ERROR`
  - Updated PI runtime adapter catch path:
    - timeout-triggered or signal-triggered prompt rejection now transitions run to `aborted`.
    - avoids false `failed` status on normal cancellation/timeout behavior.
  - added regression test:
    - `__tests__/unit/pi-runtime-adapter.test.ts`
    - `AbortRejectAgent` loader rejects on abort and verifies final status is `aborted`.
- P2: no-adapter active-slot leak in runner concurrency accounting
  - Added terminal-status hook support in `RunController`.
  - `createAgentRunner` now registers terminal hook to release active run slots consistently.
  - manual terminal transitions through `runner.controller.transitionStatus(...)` now release slots.
  - added regression test:
    - `__tests__/unit/concurrency-runner.test.ts`
    - verifies no-adapter run completion releases slot and new run starts.
- P2: web bridge fan-out interruption on subscriber throw
  - Updated `InMemoryWebBridge.publish` to isolate listener failures and continue delivery.
  - added regression test:
    - `__tests__/unit/web-bridge.test.ts`
    - verifies one failing subscriber does not block remaining run/global subscribers.

### Validation
- `pnpm --filter @constructive-io/constructive-agent test` passed:
  - 17 suites, 47 tests.
- `pnpm --filter @constructive-io/constructive-agent build` passed.

## 2026-02-24T18:00:00Z - Checkpoint 20: `cnc agent` Wrapper Implementation (PI-managed)

### Implemented
- Added `cnc agent` command family to `@constructive-io/cli`:
  - `cnc agent` (launch PI with Constructive defaults)
  - `cnc agent setup` (install managed PI runtime + project package wiring)
  - `cnc agent doctor` (runtime/package/context/token diagnostics)
  - `cnc agent reset` (clear managed PI runtime cache)
- Added new CLI agent helper modules under `packages/cli/src/agent/`:
  - `runtime-manager.ts`
    - managed local install for pinned `@mariozechner/pi-coding-agent@0.54.2`
    - install lock and stale-lock handling
    - runtime status + reset APIs
  - `extension-manager.ts`
    - resolves `@constructive-io/constructive-agent-pi-extension`
    - prefers publishable `dist` package source when present
    - ensures project-local PI package registration via `pi install <path> -l`
  - `context-adapter.ts`
    - resolves endpoint/token defaults with precedence:
      - explicit flags > env (`CONSTRUCTIVE_*`) > `cnc context`/`cnc auth`
    - emits warnings for missing endpoint/token
  - `pi-launcher.ts`
    - assembles PI argv and launches interactive/print sessions
  - `process-utils.ts`
    - reusable child-process runner
- Integrated command routing and user help:
  - `packages/cli/src/commands.ts` now includes `agent`
  - `packages/cli/src/utils/display.ts` updated usage text/examples
- Added CLI dependency:
  - `@constructive-io/constructive-agent-pi-extension` in `packages/cli/package.json`

### Tests Added
- `packages/cli/__tests__/agent-context-adapter.test.ts`
- `packages/cli/__tests__/agent-extension-manager.test.ts`
- `packages/cli/__tests__/agent-pi-launcher.test.ts`

### Validation
- `pnpm --filter @constructive-io/cli test` passed:
  - 5 suites, 11 tests.
- `pnpm --filter @constructive-io/cli build` passed.
- Manual smoke:
  - `node packages/cli/dist/index.js agent --help` works
  - `node packages/cli/dist/index.js agent doctor --cwd <repo>` works
  - `node packages/cli/dist/index.js agent setup --cwd <repo>` installs runtime + extension package wiring

## 2026-02-24T18:20:00Z - Checkpoint 21: PI TUI Input Corruption Fix

### Findings
- The Constructive PI extension does not intercept general editor input events.
- Redaction is only used for tool-argument approval/log surfaces, not keyboard input handling.
- Root cause: `inquirerer` prompter remained active while `cnc agent` launched PI, so terminal key listeners interfered with PI TUI input.

### Implemented
- Updated `packages/cli/src/commands.ts`:
  - close `prompter` before running `agent` command.
  - retain prior close behavior for all other commands.
  - added guard comment documenting terminal ownership transfer to PI.

### Validation
- `pnpm --filter @constructive-io/cli test` passed.
- `pnpm --filter @constructive-io/cli build` passed.
