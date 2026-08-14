<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

# @agentic-kit/pi-ext-gate

A pi extension that gates tool calls through a **declared policy**, and defers anything the policy will not decide alone to an **approval channel** that can reach a human on another machine.

This is what makes an unattended cloud run safe to start: the run's permissions are data, decided before it begins, and the escape hatch for everything else is an approval that travels over the platform's existing rows/API rather than a socket back into the cluster.

## Policy

A policy is an ordered rule list evaluated with no I/O — so the same value can be asserted in a test, stored on a run row, and rendered in a UI.

```ts
import { gatePolicy } from '@agentic-kit/pi-ext-gate';

const policy = gatePolicy({
  rules: [
    { tool: 'bash', decision: 'ask', reason: 'destructive command', match: ({ input }) => /\brm\b/.test(String(input.command)) },
    { tool: 'bash', decision: 'allow' },
    { tool: 'write', decision: 'ask', reason: 'writes to the workspace' },
    { tool: '*', decision: 'allow' }
  ],
  defaultDecision: 'deny'
});
```

First match wins, so order the list most specific first. With no `defaultDecision` the default is `ask`, not `allow`: a tool nobody declared is not implicitly trusted, and denying it outright would strand the run.

## Approvals

```ts
import { createGateExtension, pollingApprovalChannel } from '@agentic-kit/pi-ext-gate';

const gate = createGateExtension({
  runId,
  policy,
  approvals: pollingApprovalChannel({
    submit: (request) => api.createApprovalRequest(request), // a row
    poll: (request) => api.readApprovalDecision(request),    // another row
    intervalMs: 1000,
    timeoutMs: 15 * 60_000
  }),
  onDecision: (record) => runLog.append(record)
});

// hand `gate.extension` to pi
```

pi's `tool_call` handler can await, so an `ask` verdict simply suspends that one tool until the channel resolves — the rest of the session is untouched. `gate.pending` exposes the requests currently waiting.

## Behavior

- **Deny → `{ block: true, reason }`.** The reason is the model's *only* explanation for the refusal, so write policy reasons for the model to read.
- **Timeouts deny by default.** An unattended run must not take an unapproved action just because nobody was watching; `onTimeout: 'allow'` opts out.
- **A channel failure is not an approval.** `submit`/`poll` errors propagate and the tool call fails, rather than degrading into a silent allow.
- **Misconfiguration fails at construction:** a policy that can produce `ask` with no `approvals` channel throws immediately instead of on the first sensitive tool call.
- **Every settled decision is emitted** to `onDecision` — the policy verdict, the final decision, the deciding actor, the timestamp — which is what an audit trail or a run log stores.

`staticApprovalChannel({ decision: 'allow' })` is the explicit auto-approve for tests and deliberately unattended runs; it exists so that "approve everything" has to be written down.

## Testing

`pnpm test` — the policy is pure, the channel takes an injected clock/sleep, and the extension is driven through a fake `ExtensionAPI`, so nothing here needs a network or a model.

## Related

- `@agentic-kit/run-log` — append-only run log (`onDecision` records belong there)
- `@agentic-kit/pi-ext-run-log` — mirrors pi session entries into it
- `@agentic-kit/pi-ext-metered-model` / `@agentic-kit/pi-ext-usage-report` — the two metering lanes
