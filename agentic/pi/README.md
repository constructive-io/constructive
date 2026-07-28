# @agentic-kit/pi

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

The [pi coding agent](https://github.com/badlogic/pi-mono) adapter for **agentic-kit**: the Constructive typed database tools and the [`@agentic-kit/harness`](https://www.npmjs.com/package/@agentic-kit/harness) confirm gate, packaged as a pi extension any host can register — Constructive Desktop, the [`agent` CLI](https://www.npmjs.com/package/@agentic-kit/cli), or your own pi-based agent.

```bash
npm install @agentic-kit/pi
```

## What's inside

- **16 typed db tools** — `provision_database`, `provision_blueprint`, `describe_schema`, `add_relation`, `delete_table`, `create_field` / `update_field` / `delete_field`, `add_policies`, `add_records`, `run_codegen`, and the template suite (`list` / `create` / `apply` / `update` / `delete`). Tool schemas are authored in [zod](https://zod.dev) and emitted as plain JSON Schema at pi's tool boundary.
- **Confirm gate** — the harness's host-neutral gate wired to pi's `tool_call` events. Hosts with a rich confirm surface (Desktop) expose `confirmTool`/`notifyToolSkipped` on `ctx.ui`; everyone else gets pi's built-in `ui.confirm` dialog.
- **Host injection** — credentials, backend endpoints, and data-plane tokens come from your host, not from the package:

```ts
import { Agent } from '@earendil-works/pi-coding-agent';
import { createDbTools } from '@agentic-kit/pi';

const dbTools = createDbTools({
  account: () => ({ userId, accessToken }),
  backendConfig: () => ({ apiEndpoint, modulesEndpoint }),
  // optional: dataAuthBroker, previewToken(), dataTokenSkewMs
});

// register like any pi extension
pi.use(dbTools);
```

## Host contract

`PiToolsHost` is the only integration surface:

| Member | Purpose |
| --- | --- |
| `account()` | signed-in platform account (`userId`, `accessToken`) |
| `backendConfig()` | env-aware API + modules GraphQL endpoints |
| `dataAuthBroker?` | remembers per-database end-user tokens across calls |
| `previewToken?()` | harvest an end-user token from the host's app preview |
| `dataTokenSkewMs?` | treat tokens expiring within this window as expired |

## Related

- [`@agentic-kit/harness`](https://www.npmjs.com/package/@agentic-kit/harness) — host-neutral skills, gating, and blueprint core
- [`@agentic-kit/cli`](https://www.npmjs.com/package/@agentic-kit/cli) — `agent`, a local secure-by-default coding agent
- [`agentic-kit`](https://www.npmjs.com/package/agentic-kit) — the umbrella package

## Credits

Built on the excellent [pi coding agent](https://github.com/badlogic/pi-mono) by Mario Zechner.
