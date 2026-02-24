# @constructive-io/constructive-agent-pi-extension

Constructive adapter for `@mariozechner/pi-coding-agent` extensions.

It supports two execution modes:
- **ORM dispatcher (default)**: `/constructive-explore` generates an endpoint-scoped ORM catalog and `constructive_orm_call` dispatches typed operations from that catalog.
- **Legacy allowlisted documents (optional)**: register static GraphQL operation documents as tools.

## What it provides

- `createConstructivePiExtension(options)`
  - Returns a PI extension factory (`ExtensionFactory`)
  - Registers GraphQL-backed tools and operator commands
- `createConstructiveTools(options)`
  - Returns tool definitions without command wiring
- `createConstructivePiOptionsFromEnv(env)`
  - Builds extension options from environment variables
- `createOperationParametersSchema(variables)`
  - Builds TypeBox parameter schemas from compact variable specs
- Package-level PI manifest (`pi.extensions`) pointing to `extension.js`
  - enables direct `pi install` usage

## Default commands

- `/constructive-status`
- `/constructive-auth-status`
- `/constructive-auth-set <token>`
- `/constructive-explore [--refresh] [--json]`
- `/constructive-capabilities [filter] [--json]`

`/constructive-auth-set` stores token in memory per PI session and takes precedence over env token.

## Programmatic usage

```ts
import {
  createConstructivePiExtension,
  type ConstructivePiOperation,
} from '@constructive-io/constructive-agent-pi-extension';
import { Type } from '@sinclair/typebox';

const operations: ConstructivePiOperation[] = [
  {
    toolName: 'create_project',
    label: 'Create Project',
    description: 'Create project through allowlisted mutation',
    capability: 'write',
    riskClass: 'low',
    document: `
      mutation CreateProject($name: String!) {
        createProject(input: { name: $name }) {
          project { id name }
        }
      }
    `,
    parameters: Type.Object({
      name: Type.String({ description: 'Project name' }),
    }),
  },
];

export default createConstructivePiExtension({
  operations,
  legacyDocumentTools: true, // Optional compatibility mode
  endpoint: process.env.CONSTRUCTIVE_GRAPHQL_ENDPOINT,
  resolveAccessToken: async (_ctx) => process.env.CONSTRUCTIVE_ACCESS_TOKEN,
  nonInteractiveApproval: 'deny',
});
```

Load it with PI:

```bash
pi -e ./constructive-extension.ts
```

## Env-driven package usage

When this package is installed as a PI package, `extension.js` auto-loads and reads env config.

### Supported env vars

- `CONSTRUCTIVE_GRAPHQL_ENDPOINT`
- `CONSTRUCTIVE_ACCESS_TOKEN`
- `CONSTRUCTIVE_ACTOR_ID`
- `CONSTRUCTIVE_TENANT_ID`
- `CONSTRUCTIVE_DATABASE_ID`
- `CONSTRUCTIVE_API_NAME`
- `CONSTRUCTIVE_META_SCHEMA`
- `CONSTRUCTIVE_ORIGIN`
- `CONSTRUCTIVE_USER_AGENT`
- `CONSTRUCTIVE_NON_INTERACTIVE_APPROVAL` (`allow` or `deny`)
- `CONSTRUCTIVE_INCLUDE_HEALTH_CHECK` (`true`/`false`)
- `CONSTRUCTIVE_ENABLE_COMMANDS` (`true`/`false`)
- `CONSTRUCTIVE_ENABLE_AUTH_SET` (`true`/`false`)
- `CONSTRUCTIVE_COMMAND_PREFIX` (default: `constructive`)
- `CONSTRUCTIVE_EXTRA_HEADERS_JSON` (JSON object)
- `CONSTRUCTIVE_OPERATIONS_FILE` (path to operation JSON array)
- `CONSTRUCTIVE_LEGACY_DOCUMENT_TOOLS` (`true`/`false`, default: `false`)
- `CONSTRUCTIVE_ORM_DISPATCHER_ENABLED` (`true`/`false`, default: `true`)
- `CONSTRUCTIVE_ORM_DISPATCHER_STRICT` (`true`/`false`, default: `true`)
- `CONSTRUCTIVE_ORM_DISPATCHER_TOOL_NAME` (default: `constructive_orm_call`)
- `CONSTRUCTIVE_ORM_SELECT_POLICY` (`auto-minimal`, `require-explicit`, `auto-full-scalar`)
- `CONSTRUCTIVE_EXPLORE_ENABLED` (`true`/`false`, default: `true`)
- `CONSTRUCTIVE_EXPLORE_CACHE_DIR` (default: `.constructive/agent`)
- `CONSTRUCTIVE_EXPLORE_TTL_MS` (default: `300000`)
- `CONSTRUCTIVE_EXPLORE_COMMAND` (default: `explore`)
- `CONSTRUCTIVE_EXPLORE_FORCE_REFRESH_ARG` (default: `--refresh`)
- `CONSTRUCTIVE_CODEGEN_OUTPUT_DIR` (default: `generated`)
- `CONSTRUCTIVE_CODEGEN_DOCS_AGENTS` (`true`/`false`, default: `true`)
- `CONSTRUCTIVE_CODEGEN_DOCS_MCP` (`true`/`false`, default: `true`)
- `CONSTRUCTIVE_CODEGEN_DOCS_SKILLS` (`true`/`false`, default: `false`)

## Schema Ergonomics

Use `createOperationParametersSchema` to define tool parameters with less TypeBox boilerplate:

```ts
import { createOperationParametersSchema } from '@constructive-io/constructive-agent-pi-extension';

const parameters = createOperationParametersSchema({
  id: { type: 'id' },
  name: { type: 'string' },
  tags: { type: { arrayOf: 'string' }, nullable: true },
  metadata: { type: 'json', nullable: true },
});
```

### Operations file format

`CONSTRUCTIVE_OPERATIONS_FILE` should point to a JSON array:

```json
[
  {
    "toolName": "create_project",
    "label": "Create Project",
    "description": "Create project",
    "capability": "write",
    "riskClass": "low",
    "document": "mutation CreateProject($name: String!) { ... }",
    "parameters": {
      "type": "object",
      "properties": {
        "name": { "type": "string" }
      },
      "required": ["name"]
    }
  }
]
```

## Security model

- Tools are operation-allowlisted only.
- Constructive policy engine runs before GraphQL execution.
- `write`/`destructive` operations require approval by default policy.
- Sensitive args are redacted in approval prompts.

## Examples

- local extension loading:
  - `examples/local-extension/README.md`
- PI package install flow:
  - `examples/pi-package/README.md`
