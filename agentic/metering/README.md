<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

# @agentic-kit/metering

Metering for an agent run: the Constructive gateway as a model endpoint, the run's identity headers, and usage reporting — none of it tied to a particular harness.

A run's model calls have to end up in `inference_log` under the same identity as every other platform inference call. *How* a harness is told which endpoint to call is vendor-specific; *what* that endpoint is, and who the run is, is not. This package owns the second part, so an adapter is left with a translation:

```
resolveMeteredGateway({ gatewayUrl, identity, models })
        │
        └─► MeteredGateway ──► the harness's own provider config
```

## Install

```sh
npm install @agentic-kit/metering
```

## The two lanes

| lane | authority |
| --- | --- |
| model calls leave through the gateway (`resolveMeteredGateway`) | the gateway — the agent cannot under-report |
| the host owns the provider keys and reports afterwards (`UsageReporter`) | self-reported; good for reconciliation, not for billing |

Cloud runs use the first. A laptop run on the user's own key uses the second.

## Gateway

```ts
import { resolveMeteredGateway } from '@agentic-kit/metering';

const gateway = resolveMeteredGateway({
  gatewayUrl: 'https://agentic.example.com', // the gateway root, NOT the /v1 path
  identity: {
    databaseId: process.env.CONSTRUCTIVE_DATABASE_ID!,
    entityId: process.env.CONSTRUCTIVE_OWNER_ID,
    actorId: runActorId,
    runToken // run-scoped, never an account token
  },
  models: [{ id: 'anthropic/claude-sonnet-4', contextWindow: 200000, maxTokens: 8192, input: ['text', 'image'] }]
});
```

- **Identity** travels as `X-Database-Id` / `X-Entity-Id` / `X-Actor-Id`, the headers `agentic-server` already reads, plus `Authorization: Bearer <runToken>` when one is given. Extra `headers` are merged but can never shadow identity.
- **Headers are only as trustworthy as the network.** In-cluster, or behind an ingress that pins identity from the bearer, they are authoritative; a host outside that boundary must send `runToken` and let the ingress pin it.
- **Misconfiguration fails at construction**, not at the first turn: a blank `databaseId`, a relative or non-http `gatewayUrl`, a `gatewayUrl` already ending in `/v1` (harnesses append their own, so the request would 404), or an empty model list.
- **Cost fields default to zero.** The gateway is the pricing authority; zeros mean "not priced client-side", not free.

## Usage reporting

```ts
import { httpUsageSink, toUsageReport, UsageReporter } from '@agentic-kit/metering';

const reporter = new UsageReporter({
  identity,
  sink: httpUsageSink({ gatewayUrl: 'https://agentic.example.com', identity })
});

reporter.enqueue(toUsageReport(message, identity));
await reporter.flush();
```

`toUsageReport` reads a harness-neutral assistant-message slice (`provider`, `model`, token counts, `stopReason`), so an adapter passes its own message through without a translation layer. Reports queue and are drained on `flush()`, which a run's shutdown path awaits.

## Testing

`pnpm test` — gateway and identity resolution are asserted directly and the reporter is driven against a fake sink, so no gateway or model credentials are needed.

## Related

- `@agentic-kit/harness` — the neutral harness contracts (adapter, run gate, approvals)
- `@agentic-kit/run-log` — the append-only run log
- `@agentic-kit/pi` — the pi adapter, which turns a `MeteredGateway` into pi's provider config
