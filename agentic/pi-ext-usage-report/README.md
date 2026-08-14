<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

# @agentic-kit/pi-ext-usage-report

A pi extension that reports each assistant message's token usage and cost to the [Constructive gateway](../agentic-server)'s `POST /v1/usage`, so a run on the host's own provider keys still lands in `inference_log`.

## Which lane is this

| lane | package | authority |
| --- | --- | --- |
| model calls leave through `agentic-server` | `@agentic-kit/pi-ext-metered-model` | the gateway — the agent cannot under-report |
| the host owns the provider keys and reports afterwards | **this package** | self-reported: usage visibility and reconciliation, not tamper-proof billing |

Both write the same rows. If a run is billed, route it through the gateway; this package exists for local/desktop runs on a developer's own key, where there is no proxy to meter and the alternative is no record at all. Nothing here needs a gateway change — `/v1/usage` already exists.

## Usage

```ts
import { createUsageReportExtension } from '@agentic-kit/pi-ext-usage-report';

const usage = createUsageReportExtension({
  gatewayUrl: 'https://agentic.example.com', // the gateway root, NOT the /v1 path
  identity: {
    databaseId: process.env.CONSTRUCTIVE_DATABASE_ID!,
    entityId: process.env.CONSTRUCTIVE_OWNER_ID,
    actorId: runActorId,
    runToken
  }
});

// hand `usage.extension` to pi; call `usage.flush()` when the host shuts the session down
```

`sink` replaces HTTP delivery entirely (in-process metering, a queue, a test double), in which case `gatewayUrl` is unnecessary.

## Behavior

- **What is reported.** pi puts `{ input, output, cacheRead, cacheWrite, totalTokens, cost }` on every assistant message — richer than the gateway's own proxy path sees. `input_tokens` is every prompt token the provider processed (`input + cacheRead + cacheWrite`), because `input` alone excludes cache hits and would under-report a long agent session by an order of magnitude; the split and pi's cost breakdown survive verbatim in `raw_usage`.
- **A turn that never reached the provider reports nothing** — a row of zeros is worse than no row.
- **Failed turns are still reported**, with `status: 'error'` and the provider's message as `error_type`; those tokens were spent.
- **Double billing is prevented** by deduping on the provider's `responseId`, since pi can emit `message_end` more than once for one response (rewritten message, replay on resume).
- **Delivery never sits in the agent's turn latency.** Reports are queued and sent serially; the first failure is retained and rethrown from `flush()` (also called on `session_shutdown`), so a host that flushes still fails loudly instead of silently losing usage. Pass `onError` to make delivery failures non-fatal.

## Testing

`pnpm test` — report shaping, the HTTP sink (injected `fetch`), and queue/failure semantics are asserted directly; no gateway needed.

## Related

- `@agentic-kit/pi-ext-metered-model` — the authoritative cloud lane
- `@agentic-kit/run-log` — append-only run log
- `@agentic-kit/pi-ext-run-log` — mirrors pi session entries into it
