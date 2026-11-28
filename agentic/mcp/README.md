# @agentic-kit/mcp

Serves `HarnessTool`s from `@agentic-kit/harness` as MCP tools on `@modelcontextprotocol/server` 2.x. It's the MCP host beside the command host (`@agentic-kit/command`): a tool's name, description, parameters, effect, gate, failures and follow-up calls all come from the tool object, and the plan text and the gate's decision come from the harness (`renderPlan`, `callChange`).

```ts
import { constructiveDbTools, constructiveGateDeps } from '@agentic-kit/db-tools';
import { createConstructiveGatePolicy } from '@agentic-kit/harness';
import { serveStdio } from '@agentic-kit/mcp';

const server = serveStdio({
  name: 'constructive',
  version,
  tools,                       // the tools to serve
  gate: createConstructiveGatePolicy(constructiveGateDeps()),
  cwd: process.cwd(),          // the project the tools act on
  readOnly: true,              // true: only the tools that read; false: the tools that write too
  instructions                 // optional: the host's own guidance, sent after the server's
});
await server.closed;           // the client closed stdin
```

`createMcpServerFactory(options)` returns the same servers as a factory, for `createMcpHandler` on HTTP or an in-memory test.

## Modes and tools

`readOnly: true` serves the tools whose effect is `read`. `readOnly: false` serves those and the tools whose effect is `write`. A tool whose effect is `destructive` (it can lose data, or delete what the person set up), or whose effect depends on its input, is served in neither mode, so a client cannot call it.

Each tool is listed under its own name, with its label as `title`, its description, and its zod parameters as the input schema:

| Effect | `annotations` | `_meta` |
|---|---|---|
| `read` | `{ readOnlyHint: true }` | none |
| `write` | `{ readOnlyHint: false, destructiveHint: true, idempotentHint: false }` | `{ "anthropic/requiresUserInteraction": true }` |

MCP reads `destructiveHint: false` as "only adds" and `idempotentHint: true` as "a second call changes nothing more". A write may change or replace what exists, and the tool object promises neither, so a write says the MCP defaults out loud.

## The host approves each write

Claude Code asks the person before every call of a tool marked with `anthropic/requiresUserInteraction`, in every permission mode and past allow rules. Where no one can answer (a `-p` run, or the `dontAsk` mode) it denies the call. Codex asks before a call of a tool that is not marked read-only in its `writes` approval mode. Annotations are hints that a host may ignore, so for any other host serve `readOnly: true`.

A write call that reaches the server runs once:

1. **The plan.** The gate makes the plan of the call. When the call cannot run (no one signed in, no database bound), the gate's failure comes back and nothing changes.
2. **The run.** The tool runs, and its result carries the plan: its own text, then "The plan of this call:" and the rendered plan, and the plan as `plan` in the envelope.

**Preview.** When the client declares form elicitation, the server shows the plan once and asks "Apply this change?". The preview is optional, not a second approval: the host's own prompt is the approval, so the box starts ticked and accepting the form as shown applies the change. A decline, a closed question or a box the person unticks changes nothing: the result is `cancelled`, says that nothing was changed, and carries the plan. A client without elicitation gets no question. The preview shows the plan as it is when the question is asked. The gate makes the plan again when the answer comes back, and the result carries the plan that ran, so the result is where to read what changed. The preview doesn't decide whether a client may write, because the client sends the answer.

## Results

`content` is the tool's content, and `structuredContent` is an envelope:

- a success: `{ ok: true, data, plan?, calls? }`;
- a failure, with `isError: true`: `{ ok: false, error: { code, message, hint?, retryable?, errorId?, context? }, data?, plan?, calls? }`.

`plan` is there on every result of a write that got a plan. `calls` are the tool's follow-up calls, with tool names as they are, because the agent calls tools. A thrown tool error becomes `failed` with a fixed sentence that names the tool, and the error id when the server logged one; its text and stack are never shown, since they can carry the server's own words.

## Instructions

Every server sends instructions when a client connects. They name the read tools and say to call them first, name the tools that change things, and say that the host asks the person before each call of them. In read-only mode, they say that nothing changes through the server. The `instructions` option is added after them. Keep the whole text under 4,096 characters.

## stdio

`serveStdio` keeps stdout for the protocol: from the moment it starts, every other write to `process.stdout`, `console.log` among them, goes to stderr. A child process that inherits file descriptor 1 still writes past that, so a tool must start its child processes with piped output.
