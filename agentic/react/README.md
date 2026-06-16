# @agentic-kit/react

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/agentic-kit/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/react"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/agentic-kit?filename=packages%2Freact%2Fpackage.json"/></a>
</p>

Headless React bindings for `@agentic-kit/agent`. Exposes a single hook —
`useChat` — that POSTs messages to a server endpoint, parses the SSE stream
back into typed `AgentEvent`s, and folds them into a `Message[]` plus a
small set of derived states (streaming snapshot, executing tools, pending
decisions).

The hook ships no UI. State lives in messages — there is no separate run
store and no `runId` to keep in sync.

## Installation

```bash
npm install @agentic-kit/react @agentic-kit/agent agentic-kit
```

Peer-deps `react@>=18` and `react-dom@>=18`.

## Server Contract

`useChat` POSTs JSON of the shape `{ messages, ...body() }` to `api`, and
expects an SSE response whose `data:` frames decode to `AgentEvent`s. The
easiest way to produce that is `AgentRunHandle#toResponse()`:

```ts
// app/api/chat/route.ts (Next.js)
import { Agent } from '@agentic-kit/agent';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const agent = new Agent({ initialState: { model, tools, systemPrompt } });
  agent.replaceMessages(messages.slice(0, -1));
  return agent.prompt(messages[messages.length - 1]).toResponse();
}
```

## Usage

```tsx
import { useChat } from '@agentic-kit/react';

export function Chat() {
  const {
    messages,
    streamingMessage,
    isStreaming,
    pendingDecisions,
    executingToolCallIds,
    send,
    respondWithDecision,
    abort,
  } = useChat({ api: '/api/chat' });

  return (
    <div>
      {messages.map((m, i) => <MessageView key={i} message={m} />)}
      {streamingMessage && <MessageView message={streamingMessage} streaming />}

      {[...pendingDecisions.values()].map((pending) => (
        <DecisionPrompt
          key={pending.toolCallId}
          event={pending}
          onApprove={() => respondWithDecision(pending.toolCallId, { approved: true })}
          onDeny={() => respondWithDecision(pending.toolCallId, { approved: false })}
        />
      ))}

      <Composer onSubmit={send} disabled={isStreaming} onAbort={abort} />
    </div>
  );
}
```

## API

### `useChat(options): UseChatResult`

#### Options

- `api` — endpoint to POST messages to.
- `body?: () => Record<string, unknown>` — extra fields merged into each
  request body (e.g. model id, conversation id).
- `initialMessages?: Message[]` — starting message log.
- `fetch?: typeof globalThis.fetch` — inject a custom fetch (useful for
  auth headers, tests).
- `onMessage?(message)` — fired for each finalized message (assistant or
  toolResult).
- `onFinish?(assistant)` — fired once per run with the final assistant
  message.
- `onDecisionPending?(event)` — fired when a tool pauses awaiting a decision.
- `onToolExecutionStart?(event)` — fired when a tool begins running.
- `onToolExecutionEnd?(event)` — fired when a tool finishes (or errors).
- `onError?(err)` — fired on transport or server errors.

#### Result state

- `messages: Message[]` — committed log.
- `streamingMessage: AssistantMessage | null` — the in-flight assistant
  message being streamed, including any partial tool-call blocks.
- `isStreaming: boolean`.
- `pendingDecisions: ReadonlyMap<string, ToolDecisionPendingEvent>` — keyed
  by `toolCallId`.
- `executingToolCallIds: ReadonlySet<string>` — tool calls currently running
  on the server.
- `error: unknown`.

#### Result actions

- `send(input: string | Message)` — append a user message and run.
- `sendMessages(msgs: Message[])` — replace the local log and run with that
  exact list. Useful when the caller has already prepared a transcript.
- `setMessages(update)` — patch messages without sending. Accepts an array
  or `(prev) => next`. Recomputes `pendingDecisions` from the new log.
- `respondWithDecision(toolCallId, value)` — attach a decision to the
  matching pending `toolCall` block and re-POST. Walks the log backwards to
  find the most recent assistant message owning that id with no decision
  yet, so the caller is free to append unrelated messages between the pause
  and the user's response. Throws if no pending match is found.
- `abort()` — cancel the in-flight request. Visible text in the streaming
  message is preserved as a finalized assistant message; orphan tool-call
  blocks are dropped so they don't re-pause the run on the next call.

## Patterns

### User types instead of clicking approve/deny

If the UI lets the user send a new message while a tool is paused, the
server can't resume on text alone — every dangling `toolCall` needs a
result before the next request. Compose `injectDeferralResults` from
`agentic-kit` with `sendMessages`:

```ts
import { injectDeferralResults, createUserMessage } from 'agentic-kit';

await sendMessages([
  ...injectDeferralResults(messages),
  createUserMessage(text),
]);
```

That synthesizes a stand-in `toolResult` for each paused tool call so the
transcript is well-formed when the server picks it back up.
