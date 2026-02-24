# Constructive Agent Runbook (Experimental)

## Preconditions

1. Constructive GraphQL endpoint reachable.
2. Actor bearer token available and valid.
3. Agent storage schema initialized for PostgreSQL durability (optional but recommended).
4. Policy engine and approval authorizer configured for write/destructive tools.

## Startup Checklist

1. Ensure operation registry contains only approved operations.
2. Configure runner limits:
- concurrency (`maxGlobalRuns`, `maxRunsPerActor`, `maxRunsPerTenant`)
- runtime limits (`maxTurns`, `maxToolCalls`, `maxRuntimeMs`)
3. Attach metrics/tracing sinks.
4. If using live UI, configure event publisher bridge.

## Standard Operations

### Start run

1. Call `runner.startRun(config)`.
2. If status is `completed`/`failed`/`aborted`, inspect run events for root cause.
3. If status is `needs_approval`, move to approval workflow.

### Approval workflow

1. Read pending approvals with `runner.listApprovals(runId)`.
2. Approve: `runner.approvePending(runId, { decidedBy, reason })`.
3. Reject: `runner.rejectPending(runId, { decidedBy, reason })`.
4. Ensure decider is authorized via `approvalAuthorizer` policy.

### Interrupt long run

1. Call `runner.abortRun(runId, { reason })`.
2. Confirm final status is `aborted` and `run_end` event is emitted.

## Incident Triage

### Symptom: repeated `needs_approval` loops

1. Verify approved request transitions to `applied`.
2. Check invocation hashing consistency (`argsHash`) and redacted args shape.
3. Confirm runtime resumes with same run config and tools.

### Symptom: policy denies expected safe tool

1. Inspect `policy_decision` events for action/reason.
2. Validate contextual rule matching (tenant/tool/args paths).
3. Check composite engine ordering and strictest-action behavior.

### Symptom: concurrency rejections

1. Inspect active run count by global/actor/tenant.
2. Tune concurrency limits or scheduling strategy.
3. Confirm terminal runs are releasing active slots.

## Metrics to Watch

1. `constructive_agent.run.execute.duration_ms`
2. `constructive_agent.run.execute.errors`
3. `constructive_agent.tool.duration_ms`
4. `constructive_agent.policy.decision` (by action)
5. `constructive_agent.approval.latency_ms`
6. `constructive_agent.run.concurrency.rejected`

## Recovery and Replay

1. Fetch persisted events for run ID.
2. Reconstruct state with `replayRunEvents(events)`.
3. Resume only non-terminal runs with valid config + approvals.
