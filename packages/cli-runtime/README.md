# @constructive-io/cli-runtime

Typed command contracts and terminal-independent execution for Constructive CLIs. The package owns JSON Schema validation, strict argument binding, structured errors, redacted JSON/JSONL events, discovery documents, completions, and ownership-safe local documentation export.

It deliberately has no dependency on Incur, Inquirerer, PGPM, GraphQL, or a global logger. Interactive prompts and process I/O belong to the consuming terminal adapter.

```ts
import {
  createCommandRegistry,
  defineCommand,
  executeCommand,
  Type,
} from '@constructive-io/cli-runtime';

const inspect = defineCommand({
  id: 'project.inspect',
  path: ['inspect'],
  summary: 'Inspect the current project.',
  input: Type.Object(
    { depth: Type.Optional(Type.Number({ minimum: 0 })) },
    { additionalProperties: false }
  ),
  output: Type.Object({ root: Type.String() }, { additionalProperties: false }),
  bindings: [
    {
      property: 'depth',
      sources: [{ kind: 'option', name: 'depth' }],
      valueType: 'number',
      description: 'Maximum inspection depth.',
    },
  ],
  examples: [{ argv: ['inspect', '--depth', '2'] }],
  lifecycle: 'finite',
  effect: 'read',
  async execute(_input, context) {
    return { data: { root: context.cwd } };
  },
});

const registry = createCommandRegistry([inspect]);
const outcome = await executeCommand(
  registry,
  inspect,
  { depth: 2 },
  {
    cwd: '/workspace/app',
    mode: 'agent',
    env: {},
    signal: new AbortController().signal,
  }
);
```

Streaming adapters should pass a protocol sink and `captureEvents: false`; the
terminal envelope remains available as `outcome.terminalEvent` without retaining
an unbounded domain-event transcript. Mark secret-bearing option and environment
bindings with `sensitive: true`. Environment names such as `CNC_TOKEN` and
`PGPASSWORD` are also recognized automatically, and all results, errors, and
events are redacted and schema-validated immediately before publication.
If an operation loads a secret from storage or a remote credential provider,
it must call `context.registerSensitiveValue(secret)` before the value can
reach a result, event, warning, error, artifact, or recovery action.

The runtime serializes domain events in call order, drains unawaited emissions
before publishing the terminal event, and seals the reporter afterward. Result
and error next actions are validated against the active registry, including the
target command's input schema, before they cross the protocol boundary.
