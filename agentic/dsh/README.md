# @agentic-kit/dsh

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/dsh"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=agentic%2Fdsh%2Fpackage.json"/></a>
</p>

The **DeepSeek Harness (dsh)** adapter — the sibling of [`@agentic-kit/pi`](https://www.npmjs.com/package/@agentic-kit/pi), and the reason the harness contracts are neutral. The same 18 [`@agentic-kit/db-tools`](https://www.npmjs.com/package/@agentic-kit/db-tools), the same confirm gate and the same run-log vocabulary, bound to a second harness without any of them changing.

```
neutral contracts:   HarnessTool     ConfirmGate      TranscriptEvent
                          │               │                 ▲
      @agentic-kit/pi ────┼───────────────┼─────────────────┤  pi's ToolDefinition, tool_call, pi session
      @agentic-kit/dsh ───┴───────────────┴─────────────────┘  dsh's ToolDefinition, tools/pre-execute, dsh events
```

```bash
npm install @agentic-kit/dsh
```

## What's inside

- **`toDshTool` / `toDshTools`** — a neutral `HarnessTool` as dsh's `ToolDefinition`: parameters in dsh's JSON Schema subset, a declared canonical output whose value *is* the neutral `HarnessToolResult` (so dsh's durable log keeps the tool's structured `details`), and the caller's `AbortSignal` threaded to the tool.
- **`createConstructivePlugin`** — the tools as a dsh plugin, with Constructive's confirm gate on dsh's `tools/pre-execute` waterfall. A gated call asks dsh's approval service; a host with no approval service composed gets a `deny`, never a silent mutation.
- **`toDshParameters` / `convertDshParameters`** — zod → dsh's subset (`type`, `properties`, `required`, `items`, `oneOf`, `enum`, `const`, boolean `additionalProperties`). Constraints outside it are dropped from the *model-facing* schema and reported in `dropped`; they still hold, because a bound tool parses arguments with its own zod schema before the body runs. Structure that cannot degrade safely — a non-object root, a `$ref` — throws.
- **`dshTranscriptReader`** — dsh's session-event log as neutral `TranscriptEvent`s, so a Constructive surface renders a dsh run through the same projectors as a pi one. Import it from `@agentic-kit/dsh/transcript` in a browser: that entry point has no node dependency.

## Usage

```ts
import { configureHost } from '@agentic-kit/db-tools';
import { createConstructivePlugin } from '@agentic-kit/dsh';

configureHost(host);

export default createConstructivePlugin({ cwd: () => projectDir });
```

Reading a dsh run back:

```ts
import { dshTranscriptReader } from '@agentic-kit/dsh/transcript';
import { TranscriptReaderRegistry } from '@agentic-kit/run-log';

const readers = new TranscriptReaderRegistry([piTranscriptReader, dshTranscriptReader]);
const events = readers.require(record.transcriptFormat).toEvents(record.entry);
```

## No dsh dependency

dsh is a developer preview whose packages promise breaking changes, and whose published rc's trail its own source. So this adapter binds to the *shape* dsh asks for — a tool definition, a tool run context, a content block, a plugin's `apply` — declared structurally in `dsh-types.ts`, and has no `@deepseek-ai/*` dependency. A host on any rc registers the plugin; dsh's ESM-only graph never reaches a CJS consumer of this package.
