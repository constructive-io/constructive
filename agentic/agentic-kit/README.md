# agentic-kit

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/agentic-kit/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/agentic-kit"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/agentic-kit?filename=packages%2Fagentic-kit%2Fpackage.json"/></a>
</p>

A low-level provider portability layer for LLM applications. `agentic-kit`
provides:

- provider-independent `ModelDescriptor` and `Context` types
- structured streaming events for text, reasoning, and tool calls
- model and provider registries
- cross-provider message normalization for replay and handoff
- a one-release compatibility wrapper for the legacy `AgentKit.generate()` API

## Installation

```bash
npm install agentic-kit
```


## Quick Start

### Structured API

```typescript
import { complete, getModel } from 'agentic-kit';

const model = getModel('openai', 'gpt-4o-mini');
const message = await complete(model!, {
  messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
});

console.log(message.content);
```

### Streaming

```typescript
import { stream, getModel } from 'agentic-kit';

const model = getModel('openai', 'gpt-4o-mini');
const result = stream(model!, {
  messages: [{ role: 'user', content: 'Explain tool calling briefly.', timestamp: Date.now() }],
});

for await (const event of result) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.delta);
  }
}
```

## API Reference

### Core API

- `stream(model: ModelDescriptor, context: Context, options?: StreamOptions)`
- `complete(model: ModelDescriptor, context: Context, options?: StreamOptions)`
- `completeText(model: ModelDescriptor, context: Context, options?: StreamOptions)`

### Registry

- `registerModel(model)`, `registerModels(models)`, `clearModels()`
- `registerProvider(provider, sourceId?)`, `unregisterProviders(sourceId)`, `clearProviders()`
- `getModel(provider, modelId)`, `getModels(provider?)`, `getModelProviders()`
- `getProvider(api)`, `getRegisteredProviders()`

The package pre-registers `OpenAIAdapter`, `AnthropicAdapter`, and
`OllamaAdapter` (with empty credentials) plus the built-in model catalogs
from each adapter package. Re-register an adapter with your own API key to
activate it.

### Message helpers

- `createUserMessage(content)`, `createAssistantMessage(model)`,
  `createToolResultMessage(toolCallId, toolName, content, isError?)`
- `createTextContent(text?)`, `createImageContent(data, mimeType)`,
  `createToolCall(id, name)`
- `getMessageText(assistant)` — concatenate text blocks.
- `cloneMessage(message)` — deep clone.
- `normalizeContext(context)` — apply per-message normalization.
- `injectDeferralResults(messages, options?)` — synthesize stand-in
  `toolResult` messages for every `toolCall` that lacks both a decision and
  a paired result. Useful when the user types a new message instead of
  responding to a paused tool — the next request needs a well-formed
  transcript.
- `transformMessages(messages, model)` — cross-provider normalization for
  replay across different providers.

### Adapter re-exports

- `OpenAIAdapter`, `AnthropicAdapter`, `OllamaAdapter`
- Types: `OpenAIOptions`, `AnthropicOptions`
- `OllamaClient` for direct Ollama HTTP access.

### Legacy Compatibility API

`AgentKit` is still available for one transition release:

```ts
interface GenerateInput {
  model: string;
  prompt?: string;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stream?: boolean;
}
```

Use `createOpenAIKit`, `createAnthropicKit`, `createOllamaKit`, or
`createMultiProviderKit()` if you still need the old prompt-only entrypoint.
