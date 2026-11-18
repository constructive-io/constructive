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

The package doesn't read a host's state itself. It asks two hosts, each set once at startup:

- **The app pipeline's host** (`configureFastAppHost`, the `FastAppHost` contract in `pipeline/host.ts`): the account, the project records and their database, the owner's session on the app database, the plan card, the app template, the dev servers and the build lock, and optional parts a host without a UI leaves out (the render check, CORS origins and the app site, remembered passwords, UI events, progress).
- **The database tools' host** (`configureHost` in `@agentic-kit/db-tools`): the account bearer and the endpoints. A host without a project `.env`, such as the cloud Job, answers `contextSource(cwd)` there with the values it was launched with, and the pipeline reads those in place of the `.env` too.

```bash
npm install @agentic-kit/fast-app
```

## What's inside

- **`app-spec/`** — the pure spec layer. `validateAppSpec` checks a spec against the template's JSON Schema and against the tables it names. `specModel` resolves a spec into its tables. `planDelta` is the difference between two specs as db-tools calls. `seedPlan` orders the seed rows. `liveSpec` renders a live database as a spec. `contract/` is the template's own AppSpec types and schema.
- **`blueprints/`** — the curated blueprints (agent, agentic CRM, data room, fundraise) and the one reader of their tables.
- **`extensions/`** — pi extensions: `list_blueprints` and `provision_template`, `describe_scopes`, `search_blocks`, `create_plan`, the code rules, the note on a stopped call, and `db-tools/` (the database tools with time limits, the owner columns `add_records` fills, and `describe_live_schema`).
- **`pipeline/`** — the build and verify pipeline: the plan and its card, provisioning through the host, the schema, codegen, the seed, the screen generator, the dev server, the checks of `verify_app`, the build record and the commits. `host.ts` is the `FastAppHost` contract. Its commands get the host's environment without secrets and without `NODE_ENV`.
- **`tools/`** — `plan_app` and `verify_app`, bound to pi (`fastAppTools`).
- **`prompt.ts`** — the app-building sections of the system prompt (`appBuildingSection`, `specToolsNote`), so a host's prompt always names the tools this package registers.

A later part adds `headless/`, the host for a process with no UI.

The root exports what a host needs: the host contract and the services it is built from (`DevServerManager`, `ProjectLocks`), the extensions, the prompt sections and the AppSpec layer. Everything else is a deep import from `dist`, for example `@agentic-kit/fast-app/pipeline/build-record`.

```ts
import { configureHost } from '@agentic-kit/db-tools';
import {
  appBuildingSection,
  blocksTools,
  blueprintTools,
  configureFastAppHost,
  dbToolsWithLimits,
  fastAppTools,
  planTools,
  scopeTools
} from '@agentic-kit/fast-app';

configureHost(toolsHost);
configureFastAppHost(fastAppHost);
// pass the factories to pi's resource loader as extension factories
const extensionFactories = [dbToolsWithLimits, fastAppTools, blueprintTools, scopeTools, blocksTools, planTools];
const systemSection = appBuildingSection(true);
```

`node dist/pipeline/timing-cli.js <session.jsonl> [--json]` prints the timing of a build from a pi session file.

## Synced files

Two folders hold copies of files from other repos. Don't edit them by hand.

- `src/app-spec/contract/` comes from sandbox-templates `shared/gen`: `pnpm sync:app-spec [path/to/sandbox-templates]` (without a path it reads `CONSTRUCTIVE_TEMPLATE_DIR`). The files are copied byte for byte, so eslint leaves them alone. With `CONSTRUCTIVE_TEMPLATE_DIR` set, a test fails when the copy differs from the template's.
- `src/blueprints/*.json` comes from constructive-db `packages/blueprints`: `pnpm sync:blueprints [path/to/constructive-db]`.

Each folder's `SOURCE.md` names the commit it was synced from.

## Tests

`pnpm test` runs jest. The tests were written for `node:test`, and the jest config does what they need:

- It compiles typebox and pi-ai, which ship only ES modules, to CommonJS.
- It sets `TZ=Asia/Bangkok` for every test, because the seed time tests need a zone with an offset and a test file can't change it.
- It runs git with no global or system config and no author from the environment, as on a CI runner, for the same reason: a test file can't set the environment of the git it starts.
- It gives each test 60 s, as `node:test` has no default timeout and a few tests run real processes.
- `jest.setup.js` rebuilds what `structuredClone` returns in the test file's own realm, so `node:assert`'s strict deep equality compares values, not realms. A test that compares what a Node API returns (such as `readdirSync`) copies it first, for the same reason.

`package-boundary.test.ts` keeps the package host-neutral: every file imports only Node, the dependencies `package.json` declares and the package itself, pi only as types, and no file reads `import.meta` or a host setting from `process.env`.
