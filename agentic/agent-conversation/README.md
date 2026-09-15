# @agentic-kit/agent-conversation

The agent module's three tables — `agent_thread`, `agent_message`, `agent_task` —
as a library a workload can use with nothing but a GraphQL client and a database
id. No `ctx`, no pool, no schema of its own: the tenant's agent module already
owns all of it.

```ts
import {
  Inbox,
  isApprovalEvent,
  loadOrCreateThread,
  TaskWriter,
  Transcript,
  createHttpGraphQLClient
} from '@agentic-kit/agent-conversation';

const client = createHttpGraphQLClient({ url, token });
const thread = await loadOrCreateThread({ client, databaseId, threadId, title });

const transcript = new Transcript(client, { databaseId, threadId: thread.id, model });
await transcript.appendText('Reading the tests first.');

const inbox = new Inbox({ client, threadId: thread.id, since: thread.createdAt! });
const { event, cancelled } = await inbox.waitFor(isApprovalEvent, { timeoutMs: 900_000 });
```

## The parts are the protocol

A tool call is not a row: it is a `ToolPart` inside `agent_message.parts`, and its
lifecycle is the `state` field the agent blueprint documents —
`input-streaming` → `input-available` → `approval-requested` →
`approval-responded` → `output-available` / `output-denied` / `output-error`.
`parts.ts` is the only place that lifecycle is enforced; an illegal transition
throws rather than writing a row no reader can interpret. A human approves by
echoing the same part back at `approval-responded` with `approval.approved` set,
which is why there is no approval table and no side channel.

## The inbox polls, deliberately

The chat seed exposes realtime subscriptions on the thread and message tables,
but that lane is a websocket carried by the GraphQL server's live-query plugin
and a resource Job holds neither a browser client nor a socket-capable session —
it has a bearer token and `fetch`. `Inbox` therefore polls one indexed
`agentMessages(threadId, createdAt >)` query at a human's timescale, with an
exclusive cursor so a decision is delivered exactly once. Its clock and its sleep
are values, so a suite drives it without real time passing.

## Tasks

`TaskWriter` mirrors an agent's todo list into `agent_task`, keyed by
description: a new item is inserted, a moved one is patched. The parent column is
passed in (`planId` or `threadId`) because the module generator attaches tasks to
whichever the tenant's surface provisioned — guessing from the row's shape would
be wrong half the time.

## Tests

`pnpm test` — every unit runs against `__tests__/fake-client.ts`, an in-memory
implementation of exactly the operations this library sends.
