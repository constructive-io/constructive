# @agentic-kit/protocol

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/protocol"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=agentic%2Fprotocol%2Fpackage.json"/></a>
</p>

The shared protocol kernel for [agentic-kit](https://github.com/constructive-io/constructive).

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
