# @agentic-kit/run-log-gate

Tool approvals over the run log. The request, the human's answer and every
settled gate decision are entries in the run's log — `agent_event` rows once
the store is the platform's — so a desktop run, a cloud pi Job and the agentic
lane all ask in one place and are answered from any surface that projects the
log (`RunsPanel`, `pendingApprovals` → `resolveApproval`).

## Three pieces

- `runLogApprovals` — an `ApprovalChannel` for `@agentic-kit/harness`'s
  `RunGate`. Submits a `constructive.approval.request` entry and polls the log
  for the matching `constructive.approval.resolution`. The request entry's id
  is derived from the tool call id, so a retried submit is the same entry and
  the store's idempotency drops it instead of asking a human twice.
  `resolveApproval` is the other end for a local run and the tests.
- `runLogGateDecisions` — an `onDecision` sink that appends every settled
  decision as a `constructive.gate.decision` entry (audit: which calls the gate
  refused, on whose authority) and a `flush()` that rethrows the first write
  that failed.
- `createRunLogGateHost` — the harness's `GateHost` (what `createConfirmGate`
  and `createGatedToolset` drive) built on the two above: `confirmTool` asks in
  the log and returns what the log settled on, `notifyToolSkipped` files the
  skipped repeat as a denial, `drain()` surfaces a lost write.

Nothing here executes on the strength of a click: the decision is the record
that was persisted and read back. A host may mirror a concise notice into a
conversation thread, but the thread is never the authority.

## Consumers

In constructive-db: `pi-job-host` (the cloud pi Job — `RunGate` over
`runLogApprovals` + `runLogGateDecisions`), the `code_task` agentic lane and
`ui/desktop`'s capability gate (`createRunLogGateHost`).

## Testing

`pnpm test` — the store (`MemoryRunLogStore`), the clock and the sleep are all
injectable, so every path is covered without a database or a network.
