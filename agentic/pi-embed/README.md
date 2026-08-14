<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

# @agentic-kit/pi-embed

One embedding of the pi coding agent for **both placements**. A run's lanes — append-only run log, metering, tool approvals — are composed from config, so "local" and "cloud" are *values*, not code paths, and there is exactly one agent loop to reason about.

```ts
import { startRun } from '@agentic-kit/pi-embed';

const embedded = await startRun({
  runId,
  cwd: workspace,
  log: { store },                              // @agentic-kit/pi-ext-run-log
  metering: { mode: 'gateway', gatewayUrl, identity, models: [{ id: 'gpt-5' }] },
  gate: { policy, approvals },                 // @agentic-kit/pi-ext-gate
  extensions: [createDbTools(host)]            // the host's own tools
});

await embedded.session.prompt('add a users table');
await embedded.close();
```

The same call runs on a laptop by changing only the values:

```ts
log: { store: fileRunLogStore(dir) },
metering: { mode: 'self-report', gatewayUrl, identity },   // own provider key
gate: { policy: gatePolicy({ defaultDecision: 'allow' }) } // a human is watching
```

## What it decides for you

- **Load order is lanes first, host extensions second**, so by the time a host tool call happens it is already gated and already logged.
- **`runId` is threaded into every lane** that records against a run — one id ties the transcript, the usage rows and the approval requests together.
- **The two metering lanes are mutually exclusive.** `gateway` is authoritative (the gateway meters what it proxies); `self-report` is the own-key lane and only as trustworthy as the agent reporting it. Enabling both would double-count the same tokens, so the config makes it impossible.
- **Extensions reach pi through a `ResourceLoader`,** not `createAgentSession` — that is pi's design, so `startRun` builds one (`DefaultResourceLoader` by default) and lets a host supply `createResourceLoader` to layer the lanes onto its own resources (skills, prompts, templates — the desktop harness already builds such a loader).
- **`close()` flushes the lanes, then disposes the session, then rethrows.** A delivery failure is never traded for a leaked session, and it is never swallowed into a clean-looking shutdown.
- **Lane misconfiguration fails at `composeRun`** — a gateway URL that already ends in `/v1`, a policy that can `ask` with nowhere to ask — rather than at the first model call or the first sensitive tool.

`composeRun` is available on its own for a host that already owns session creation and just wants the extension list plus a `flush()`.

## Testing

`pnpm test` — both the session factory and the loader factory are injectable, so every path here is covered without a model, a network or a filesystem.

## Related

- `@agentic-kit/run-log` — the record types, projectors and store contracts
- `@agentic-kit/pi-ext-run-log` — mirrors pi session entries into the log
- `@agentic-kit/pi-ext-metered-model` — the authoritative (gateway) metering lane
- `@agentic-kit/pi-ext-usage-report` — the self-reported (own key) metering lane
- `@agentic-kit/pi-ext-gate` — policy + remote approvals for tool calls
