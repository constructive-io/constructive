# Constructive Agent Architecture (Experimental)

## Purpose

`@constructive-io/constructive-agent` is an orchestration layer that sits between:

1. PI agent runtime primitives (`@mariozechner/pi-agent-core`)
2. Constructive GraphQL execution paths
3. Policy and approval controls aligned to PostgreSQL RLS-first authorization

## High-level Flow

```text
Run Trigger
  -> RunController.startRun()
  -> Policy + Tool Registry
  -> (PI runtime adapter executes turns/tools)
  -> GraphQL Tool Gateway
  -> Event Journal
  -> Terminal status (completed/failed/aborted/needs_approval)
```

## Core Boundaries

1. The model does not execute arbitrary GraphQL by default.
2. All executable operations are tool definitions in a registry.
3. Each tool call passes policy evaluation before execution.
4. Event envelopes are persisted for replayability.

## Runtime Components

- `RunController`: run lifecycle and event sequencing.
- `ToolRegistry`: named allowlist of executable tools.
- `PolicyEngine`: allow/deny/needs_approval decision on tool invocation.
- `ApprovalStore`: tracks pending/approved/rejected/applied invocations.
- `GraphQLExecutor`: transport abstraction for GraphQL requests.
- `EventStore` / `RunStore`: storage contracts with in-memory + PostgreSQL implementations.
- `Replay`: event log reconstruction helper for post-mortem and resumability workflows.

## Current Status

Runtime, policy, and control flow are implemented, including:

1. PI loop wiring with policy-gated tool execution.
2. GraphQL operation registry + typed operation bundles.
3. In-memory + PostgreSQL stores for runs/events/approvals.
4. Redacted audit events and replay helpers.
5. Approval lifecycle with scoped approval authorization policies.
6. Runner event publishing, interruption control, and control protocol adapter.
7. Metrics/tracing hooks for run/tool/policy/approval observability.
