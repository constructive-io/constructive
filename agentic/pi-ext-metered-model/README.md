<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

# @agentic-kit/pi-ext-metered-model

A pi extension that makes the [Constructive metered gateway](../agentic-server) the session's model provider, so a coding-agent run is metered exactly like every other platform inference call — same `inference_log`, same identity, same billing.

## Why the gateway and not self-reporting

Two lanes exist for getting a pi run's usage into billing:

| lane | package | authority |
| --- | --- | --- |
| model calls leave through `agentic-server` | **this package** | the gateway — the agent cannot under-report |
| the host owns the provider keys and reports usage afterwards | `@agentic-kit/pi-ext-usage-report` | self-reported; good for reconciliation, not for billing |

Use this one for cloud runs. `agentic-server` already speaks OpenAI's `/v1/chat/completions`, which is one of pi's built-in api types, so no custom streaming code is involved: the extension registers a provider whose `baseUrl` is the gateway and whose headers carry the run's identity.

## Usage

```ts
import { createMeteredModelExtension } from '@agentic-kit/pi-ext-metered-model';

const metered = createMeteredModelExtension({
  gatewayUrl: 'https://agentic.example.com', // the gateway root, NOT the /v1 path
  identity: {
    databaseId: process.env.CONSTRUCTIVE_DATABASE_ID!,
    entityId: process.env.CONSTRUCTIVE_OWNER_ID,
    actorId: runActorId,
    runToken // run-scoped, never an account token
  },
  models: [
    { id: 'anthropic/claude-sonnet-4', contextWindow: 200000, maxTokens: 8192, input: ['text', 'image'] }
  ]
});

// hand `metered.extension` to pi alongside your other extensions
```

The first declared model is selected on `session_start`; pass `selectModel: '<id>'` to pick another, or `selectModel: false` to leave the host's choice alone.

## Behavior

- **Identity** travels as `X-Database-Id` / `X-Entity-Id` / `X-Actor-Id`, the headers `agentic-server` already reads, plus `Authorization: Bearer <runToken>` when one is given. Extra `headers` (e.g. `X-LLM-Provider`) are merged, but can never shadow identity.
- **Headers are only as trustworthy as the network.** In-cluster, or behind an ingress that pins identity from the bearer, they are authoritative; a host outside that boundary must send `runToken` and let the ingress do the pinning.
- **Misconfiguration fails at construction**, not at the first turn: a blank `databaseId`, a relative or non-http `gatewayUrl`, a `gatewayUrl` ending in `/v1` (pi appends its own, so the request would 404), an empty model list, or a `selectModel` that is not one of the registered models — the last of which would otherwise leave pi quietly running an *unmetered* model.
- **Model selection fails loudly** if the model is absent from the registry after registration or pi refuses it for lack of credentials.
- **Cost fields default to zero.** The gateway is the pricing authority; zeros mean "not priced client-side", not free. Pass `cost` when you want pi's UI to show numbers.

## Testing

`pnpm test` — the provider/identity builders are asserted directly, and the extension is driven through a fake `ExtensionAPI`, so no gateway or model credentials are needed.

## Related

- `@agentic-kit/run-log` — append-only run log
- `@agentic-kit/pi-ext-run-log` — mirrors pi session entries into it
