# @agentic-kit/protocol

The shared protocol kernel for [agentic-kit](https://github.com/constructive-io/agentic-kit).

This package holds the provider-agnostic contracts and helpers that every adapter
and the top-level `agentic-kit` package build on:

- **Types** — `Context`, `Message`, `AssistantMessage`, `ModelDescriptor`, `Usage`,
  content blocks, and the provider/stream interfaces.
- **Event stream** — `EventStream` / `createAssistantMessageEventStream` for
  incremental assistant responses.
- **Message helpers** — `createEmptyUsage`, `calculateUsageCost`, `getMessageText`,
  `normalizeContext`, `createAssistantMessage`.
- **JSON helpers** — `clone`, `parsePartialJson`, `completePartialJson` for snapshotting
  and recovering streamed tool-call arguments.
- **Base URL** — `normalizeBaseUrl`.

It has no runtime dependencies, so a provider adapter (`@agentic-kit/openai`,
`@agentic-kit/anthropic`, `@agentic-kit/ollama`) can depend on it standalone without
pulling in the rest of the framework.
