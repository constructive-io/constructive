# agentic-kit

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/agentic-kit"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=agentic%2Fagentic-kit%2Fpackage.json"/></a>
</p>

Umbrella package for the agentic-kit family — build your own custom agents with a provider-agnostic chat layer, a stateful agent runtime, and the Constructive harness.

## Usage

```typescript
// Chat layer (re-exported at the top level, same API as @agentic-kit/chat)
import { complete, stream, createOpenAIKit } from 'agentic-kit';

// Agent runtime
import { agent } from 'agentic-kit';

// Harness (skills resolution, gating, blueprints)
import { harness } from 'agentic-kit';
```

## Packages

| Package | Description |
|---------|-------------|
| [`@agentic-kit/chat`](https://github.com/constructive-io/constructive/tree/main/agentic/chat) | Provider-agnostic LLM adapter with streaming and multi-turn support |
| [`@agentic-kit/protocol`](https://github.com/constructive-io/constructive/tree/main/agentic/protocol) | Shared types and event stream |
| [`@agentic-kit/openai`](https://github.com/constructive-io/constructive/tree/main/agentic/openai) | OpenAI-compatible provider adapter |
| [`@agentic-kit/anthropic`](https://github.com/constructive-io/constructive/tree/main/agentic/anthropic) | Anthropic provider adapter |
| [`@agentic-kit/ollama`](https://github.com/constructive-io/constructive/tree/main/agentic/ollama) | Ollama provider adapter |
| [`@agentic-kit/agent`](https://github.com/constructive-io/constructive/tree/main/agentic/agent) | Minimal stateful agent runtime |
| [`@agentic-kit/harness`](https://github.com/constructive-io/constructive/tree/main/agentic/harness) | Host-neutral coding-agent harness: skills layers, confirm gating, blueprints |
| [`@agentic-kit/react`](https://github.com/constructive-io/constructive/tree/main/agentic/react) | React bindings (`useChat`) — install separately (React peer dependency) |
