# @agentic-kit/agent

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/agentic-kit/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/agent"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/agentic-kit?filename=packages%2Fagent%2Fpackage.json"/></a>
</p>

Minimal stateful agent runtime built on `agentic-kit`. The `Agent` class drives
a sequential model/tool loop, emits structured lifecycle events, and exposes a
run handle that can be consumed as async events, a `ReadableStream`, or an SSE
`Response` for transport to a frontend.

## Installation

```bash
npm install @agentic-kit/agent agentic-kit
```

## Quick Start

```ts
import { Agent } from '@agentic-kit/agent';
import { getModel } from 'agentic-kit';

const agent = new Agent({
  initialState: {
    model: getModel('openai', 'gpt-5.4-mini')!,
    systemPrompt: 'You are a helpful assistant.',
    tools: [],
  },
});

await agent.prompt('What is 2 + 2?');
console.log(agent.state.messages);
```

## Streaming a Run

The `prompt()` and `continue()` methods return an `AgentRunHandle`. A handle
can be consumed exactly once via one of these methods:

```ts
const handle = agent.prompt('Plan a trip to Lisbon.');

for await (const event of handle.events()) {
  if (event.type === 'message_update') {
    process.stdout.write(JSON.stringify(event.assistantMessageEvent));
  }
}
```

- `await handle` — run to completion without observing events. The handle is
  `PromiseLike<void>`, so it `await`s directly. Equivalent to `handle.wait()`.
- `handle.wait()` — explicit form of the above. Prefer this when the handle
  might be passed through generic wrappers (`Promise.resolve(...)`,
  `Promise.all([...])`) where accidental thenable assimilation would consume
  it before you intended.
- `handle.events()` — iterate `AgentEvent`s.
- `handle.toReadableStream()` — wrap events in a `ReadableStream<AgentEvent>`.
- `handle.toResponse(init?)` — wrap events as an SSE `Response`, ready to
  return from a Next.js / Hono / Express handler.

## SSE Transport

`toResponse()` serializes events as `data: <json>\n\n` frames. On the client,
parse them back into `AgentEvent`s with `parseSSEStream`:

```ts
import { parseSSEStream } from '@agentic-kit/agent';

const response = await fetch('/api/chat', { method: 'POST', body });
for await (const event of parseSSEStream(response.body!)) {
  // event is a typed AgentEvent
}
```

## Tools, Decisions, and Pauses

Tools extend the base `ToolDefinition` from `agentic-kit` with an executor and
an optional human-in-the-loop `decision` schema. When a tool with a `decision`
schema is called and no decision is attached, the agent emits a
`tool_decision_pending` event and pauses. Attach the decision to the matching
`toolCall` block and call `continue()` to resume.

```ts
const sendEmail: AgentTool = {
  name: 'send_email',
  label: 'Send email',
  description: 'Send an email to a recipient.',
  parameters: {
    type: 'object',
    properties: { to: { type: 'string' }, body: { type: 'string' } },
    required: ['to', 'body'],
  },
  decision: {
    type: 'object',
    properties: { approved: { type: 'boolean' } },
    required: ['approved'],
  },
  execute: async (toolCallId, args, decision) => {
    if (!(decision as { approved: boolean }).approved) {
      return { content: [{ type: 'text', text: 'Cancelled by user.' }] };
    }
    // ... send email
    return { content: [{ type: 'text', text: 'Sent.' }] };
  },
};
```

## Agent API

```ts
new Agent(options: AgentOptions)
```

`AgentOptions`:

- `initialState` — must include a `model`; `systemPrompt`, `tools`, and
  `messages` are optional.
- `maxSteps` — cap on model invocations per run. Resets in `prompt()`,
  persists across `continue()`.
- `streamFn` — override the underlying stream function (defaults to
  `stream` from `agentic-kit`).
- `transformContext(messages, signal)` — async hook to rewrite the message
  list before each model call (compaction, summarization, retrieval).
- `validateToolArguments(schema, args)` — override tool argument validation.
  Default uses a built-in JSON Schema subset.

State mutation:

- `setModel`, `setSystemPrompt`, `setTools`, `setStreamOptions`
- `replaceMessages`, `appendMessage`, `clearMessages`, `reset`

Execution:

- `prompt(input, opts?)` — start a new run from a user message.
- `continue(opts?)` — resume after a paused decision or after the messages
  array was edited externally. If the most recent pending assistant has
  non-`toolResult` messages appended after it (e.g., a user message
  injected while the tool was paused), `continue()` throws — use
  `injectDeferralResults()` + `prompt()` from `agentic-kit` instead, which
  synthesizes stand-in `toolResult`s before the new user message so the
  transcript stays well-formed for OpenAI / Anthropic.
- `abort()` — cancel the active run.
- `waitForIdle()` — resolves when the current run finishes.
- `subscribe(listener)` — receive `AgentEvent`s without consuming the handle.

## Event Types

`AgentEvent` is a discriminated union covering the full lifecycle:

- `agent_start`, `agent_end` (with `stopReason: 'completed' | 'max_steps' | 'aborted'`)
- `turn_start`, `turn_end`
- `message_start`, `message_update`, `message_end`
- `tool_execution_start`, `tool_execution_update`, `tool_execution_end`
- `tool_decision_pending` (carries `input` and `schema`)

Every `message_update` includes the underlying `assistantMessageEvent` from
the provider stream (text/thinking/toolcall deltas), so consumers can render
streaming text without re-deriving it from the partial message.
