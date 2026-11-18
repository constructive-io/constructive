# @agentic-kit/fast-app

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/fast-app"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=agentic%2Ffast-app%2Fpackage.json"/></a>
</p>

Constructive's app-building layer: the AppSpec, the curated blueprints, and the [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) tools an agent builds an app with. It has two hosts, and the same code runs in both:

- **Constructive Desktop** runs it in a Local chat, in the Electron main process.
- **A headless host** runs it in a process with no UI: the cloud Job of a Cloud chat (later a machine or a CLI).

The package doesn't read a host's state itself. The database tools get the account, the endpoints and the project's database from the `@agentic-kit/db-tools` host (`configureHost`). A host without a project `.env`, such as the cloud Job, answers `contextSource(cwd)` there with the values it was launched with.

```bash
npm install @agentic-kit/fast-app
```

## What's inside

- **`app-spec/`** — the pure spec layer. `validateAppSpec` checks a spec against the template's JSON Schema and against the tables it names. `specModel` resolves a spec into its tables. `planDelta` is the difference between two specs as db-tools calls. `seedPlan` orders the seed rows. `liveSpec` renders a live database as a spec. `contract/` is the template's own AppSpec types and schema.
- **`blueprints/`** — the curated blueprints (agent, agentic CRM, data room, fundraise) and the one reader of their tables.
- **`extensions/`** — pi extensions: `list_blueprints` and `provision_template`, `describe_scopes`, `search_blocks`, `create_plan`, the code rules, the note on a stopped call, and `db-tools/` (the database tools with time limits, the owner columns `add_records` fills, and `describe_live_schema`).
- **`pipeline/`** — the build and verify pipeline. So far only the field hints and the spec file names are here; the rest follows.

Later parts: `tools/` (`plan_app`, `verify_app`), `host.ts` (the `FastAppHost` contract), `headless/` (the host for a process with no UI) and `prompt.ts` (the app-building system prompt).

The root exports the extensions and the AppSpec layer. Everything else is a deep import, for example `@agentic-kit/fast-app/extensions/provision-template`.

```ts
import { configureHost } from '@agentic-kit/db-tools';
import { blueprintTools, dbToolsWithLimits, scopeTools } from '@agentic-kit/fast-app';

configureHost(host);
// pass the factories to pi's resource loader as extension factories
const extensionFactories = [dbToolsWithLimits, blueprintTools, scopeTools];
```

## Synced files

Two folders hold copies of files from other repos. Don't edit them by hand.

- `src/app-spec/contract/` comes from sandbox-templates `shared/gen`: `pnpm sync:app-spec [path/to/sandbox-templates]` (without a path it reads `CONSTRUCTIVE_TEMPLATE_DIR`). The files are copied byte for byte, so eslint leaves them alone. With `CONSTRUCTIVE_TEMPLATE_DIR` set, a test fails when the copy differs from the template's.
- `src/blueprints/*.json` comes from constructive-db `packages/blueprints`: `pnpm sync:blueprints [path/to/constructive-db]`.

Each folder's `SOURCE.md` names the commit it was synced from.

## Tests

`pnpm test` runs jest. The jest config does three things the code needs:

- It compiles typebox and pi-ai, which ship only ES modules, to CommonJS.
- It sets `TZ=Asia/Bangkok` for every test, because the seed time tests need a zone with an offset and a test file can't change it.
- `jest.setup.js` rebuilds what `structuredClone` returns in the test file's own realm, so `node:assert`'s strict deep equality compares values, not realms.
