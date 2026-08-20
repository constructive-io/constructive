# Constructive CLI

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/cli"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Fcli%2Fpackage.json"/></a>
</p>

> API Server and Development Tools for PostgreSQL

Constructive CLI provides GraphQL server capabilities and code generation tools for PostgreSQL databases. For database migrations, packages, and deployment operations, use [pgpm](https://pgpm.io).

## Installation

```bash
npm install -g @constructive-io/cli
```

Both `cnc` and `constructive` invoke the same binary.

The core protocol, context, authentication, and raw GraphQL commands support
Node.js 18.17 and newer. Codegen and the GraphQL server/explorer stack are
optional feature packages and currently require Node.js 22.19 or newer. On a
supported Node.js version, the default npm install includes those optional
features. For a core-only installation on Node.js 18 or 20, omit them:

```bash
npm install -g @constructive-io/cli --omit=optional
```

Feature commands remain discoverable in a core-only installation and fail
with the typed `CAPABILITY_UNAVAILABLE` error instead of a module-loader or
internal error.

## Command registry

The CLI contract is generated from a typed registry, so help, JSON Schema,
Markdown, Skills, and shell completions cannot drift from the executable
commands.

```bash
cnc commands --format json
cnc schema execute --format json
cnc help codegen
cnc docs export --target .constructive/agent-docs --dry-run
cnc completion zsh
```

The current command families are:

- `context create|list|use|current|delete`
- `auth set-token|status|logout`
- `execute`
- `codegen`
- `server`
- `explorer`

Run `cnc help <command>` for the exact, version-matched options. Canonical
flags use kebab case; historical camel-case flags remain temporary deprecated
aliases and produce `CLI_DEPRECATED` warnings.

The same registry is a stable in-process API for adapters such as future MCP
servers:

```ts
import { createCncRegistryForEnvironment } from '@constructive-io/cli/runtime';

const { registry } = createCncRegistryForEnvironment({
  version: '7.x',
  env: { HOME: '/srv/agent' },
});
```

Embeddings without a home-directory model must pass an absolute `configDir`;
the factory never falls back to the host process environment.

## Agent protocol

`--agent` enables strict noninteractive JSONL output. It disables prompts,
ANSI effects, browser opening, and update checks, and stdout contains protocol
events only.

```bash
cnc commands --agent
cnc execute \
  --context preview \
  --query 'query Viewer { viewer { id } }' \
  --agent
```

Finite commands also support a single terminal envelope with `--format json`.
Long-running services require JSONL so readiness and shutdown remain
observable.

```json
{"protocolVersion":"constructive.dev/cli/v1","event":"operation.started","operationId":"...","commandId":"discovery.version","timestamp":"..."}
{"protocolVersion":"constructive.dev/cli/v1","event":"operation.completed","operationId":"...","commandId":"discovery.version","timestamp":"...","durationMs":1,"result":{"data":{"version":"7.x","protocolVersion":"constructive.dev/cli/v1"}}}
```

Exit codes are stable: `0` success, `1` known operation failure, `2` invalid
invocation, `70` internal contract failure, and `130` cancellation.

## Contexts, authentication, and raw GraphQL

```bash
cnc context create preview --endpoint https://api.example.com/graphql
CNC_TOKEN='...' cnc auth set-token --context preview --agent
cnc execute --context preview --file queries/viewer.graphql --format json
cnc execute --context preview --anonymous --query 'query Health { health }'
```

Agent and CI execution require an explicit `--context` or `CNC_CONTEXT`; human
mode may fall back to the globally selected context for compatibility.
Agents provide tokens through `CNC_TOKEN` or `--token-stdin`, and token values
are never returned by the CLI.

Mutations in agent or CI mode require both `--allow-mutation` and `--yes`.
Subscriptions are rejected by raw execution, and the request timeout defaults
to 30 seconds.

## Code generation

```bash
cnc codegen \
  --endpoint http://localhost:5555/graphql \
  --output ./generated/graphql \
  --orm \
  --react-query \
  --dry-run \
  --format json
```

Codegen computes the complete ownership-aware plan before writing. Dry runs do
not mutate the filesystem, repeated generation is a no-op, stale files are
pruned only when the ownership manifest proves CNC owns them, and modified
generated files require `--overwrite-modified-generated --yes`.

CNC loads declarative `graphql-codegen.config.json` files only. Executable
JavaScript or TypeScript configs remain a legacy feature of the standalone
GraphQL codegen adapter and are rejected by CNC before evaluation.

Schema-only export uses the same planner:

```bash
cnc codegen \
  --schema-enabled \
  --schema-file ./schema.graphql \
  --schema-output ./schemas \
  --schema-filename public.graphql
```

## Services

```bash
cnc server --port 5555 --no-postgis
cnc explorer --port 5556
```

In JSONL mode, services emit `service.starting`, `service.ready`,
`service.stopping`, and `service.stopped`. SIGINT and SIGTERM await cleanup and
finish with `operation.cancelled` and exit code `130`.

## Global options

```text
--agent
--interactive
--non-interactive
--format human|json|jsonl
--cwd <path>
--yes
--no-color
--debug
--help
--version
```

`--dry-run` and overwrite acknowledgements are command-local because they are
only exposed where the operation can enforce them.

Constructive respects standard PostgreSQL environment variables for server and
database-backed codegen operations.

## Database Operations

For database migrations, packages, and deployment, use **pgpm**:

```bash
npm install -g pgpm
```

Common pgpm commands:

- `pgpm init workspace` - Initialize a new workspace
- `pgpm init` - Create a new module
- `pgpm add <change>` - Add a database change
- `pgpm deploy` - Deploy database changes
- `pgpm verify` - Verify database state
- `pgpm revert` - Revert database changes

See the [pgpm documentation](https://pgpm.io) for more details.
