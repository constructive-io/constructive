# @agentic-kit/pi

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/pi"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=agentic%2Fpi%2Fpackage.json"/></a>
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

## Project context

The tools need a bound database: an access key, a database id, and optionally endpoint/name pins. Where those values come from is the host's choice — `resolveProjectContext` takes values, not a directory:

```ts
import { fromEnvironment, resolveProjectContext } from '@agentic-kit/pi';

// headless: container, Job, CI — nothing on disk, nothing to commit
await resolveProjectContext(fromEnvironment());

// local project: read <cwd>/.env (what Desktop and the CLI do)
await resolveProjectContext(cwd);

// anything else: a record, or a lookup function into a secret store
await resolveProjectContext((name) => vault.get(name));
```

Injected variables carry a `CONSTRUCTIVE_` prefix; the bare names are also accepted (that is what the scaffolder writes into a project `.env`), with the prefixed spelling winning:

| Variable | Required | Purpose |
| --- | --- | --- |
| `CONSTRUCTIVE_ACCESS_TOKEN` | yes | project data-plane key |
| `CONSTRUCTIVE_DATABASE_ID` | yes | bound database |
| `CONSTRUCTIVE_DATABASE_NAME` | no | derives the per-db data endpoint |
| `CONSTRUCTIVE_API_ENDPOINT` | no | data-plane api pin |
| `CONSTRUCTIVE_MODULES_ENDPOINT` | no | data-plane modules pin |
| `CONSTRUCTIVE_OWNER_ID` | no | owner fallback when the probe omits it |

Endpoint pins from the source apply to the **data plane only**. The control plane (binding probe, schema resolution, blueprint/schema tools) always uses the host's `backendConfig()` and the account bearer, so an untrusted cloned project cannot redirect it.

## Provisioning

`provision_database` requests a database through the `requestDatabase` mutation on the api endpoint. When the requested module set matches a cataloged preset, the backend claims a warm pre-baked database in seconds. Otherwise a background job provisions the database cold. The tool polls the provision ticket on the modules endpoint until the database and its owner bootstrap are complete. Then it writes the credentials to the project `.env` and returns.

For local development, the cold path and the warm pool depend on the backend's jobs worker. Start the worker in `constructive-db` with `pnpm dev:fn`. If the worker is not running, cold tickets stay `pending` and the tool times out after 240 seconds.

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
