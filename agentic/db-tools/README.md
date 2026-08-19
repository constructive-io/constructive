# @agentic-kit/db-tools

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/db-tools"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=agentic%2Fdb-tools%2Fpackage.json"/></a>
</p>

The Constructive typed database tools, as **harness-neutral** [`HarnessTool`](https://www.npmjs.com/package/@agentic-kit/harness)s: zod parameters, `execute(params, { cwd, signal })`, and no coding-agent SDK anywhere in the package. Binding them to a harness is the *adapter's* job — [`@agentic-kit/pi`](https://www.npmjs.com/package/@agentic-kit/pi) does it with `toPiTool()` — so a second, compatible harness registers the same 18 tools without a fork.

```
@agentic-kit/db-tools ──► @agentic-kit/harness (HarnessTool)
        ▲
        ├── @agentic-kit/pi        toPiTool()  ──► pi's ToolDefinition
        └── your adapter           toXTool()   ──► your harness's tool shape
```

```bash
npm install @agentic-kit/db-tools
```

## What's inside

- **18 typed db tools** — `provision_database`, `provision_blueprint`, `describe_schema`, `add_relation`, `delete_table`, `create_field` / `update_field` / `delete_field`, `add_policies`, `add_records`, `manage_entity_types`, `create_api_key`, `run_codegen`, and the template suite (`list` / `create` / `apply` / `update` / `delete`). `constructiveDbTools` is the list, in registration order.
- **Host injection** — credentials, backend endpoints and data-plane tokens come from the host application, not from the package. Call `configureHost()` once at startup; the tools read it lazily per call.
- **Project context** — `resolveProjectContext` / `resolveDataToken` resolve the database a tool acts on from the cwd's `.env` plus the host's session, and `deriveSubdomainEndpoint` derives its per-database endpoints.
- **Provisioning model** — the pinned `node-type-registry` presets, the provision manifest, and overlay resolution (`resolveProvisionModules`).
- **`constructiveGateDeps`** — the confirm gate's host capabilities (is the project runnable, is there a data token, what tables would a template copy) answered by these resolvers, so every adapter gates the same tools against the same project state instead of restating it.
- **`toolSchema`** — a tool's zod parameters as plain JSON Schema, for adapters whose harness wants JSON Schema rather than zod.

## Usage

```ts
import { configureHost, constructiveDbTools } from '@agentic-kit/db-tools';

configureHost({
  account: () => ({ userId, accessToken }),
  backendConfig: () => ({ apiEndpoint, modulesEndpoint }),
  signInHint: 'Run `agent login` to sign in.'
});

for (const tool of constructiveDbTools) {
  myHarness.registerTool(myToolBinding(tool));
}
```

A tool executes against nothing but its params and a context, so it is callable directly — which is also how the tests drive it:

```ts
const result = await describeSchemaTool.execute({ database_name: 'my-app' }, { cwd: process.cwd() });
```

## Related

| Package | Role |
| --- | --- |
| [`@agentic-kit/harness`](https://www.npmjs.com/package/@agentic-kit/harness) | the neutral contracts: `HarnessTool`, `HarnessAdapter`, the run gate |
| [`@agentic-kit/pi`](https://www.npmjs.com/package/@agentic-kit/pi) | the pi adapter: binds these tools and attaches a run's lanes to a pi session |
| [`@agentic-kit/cli`](https://www.npmjs.com/package/@agentic-kit/cli) | the `agent` CLI, which materializes the tools into a pi agent dir |
