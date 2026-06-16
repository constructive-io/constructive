# @agentic-kit/anthropic

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/agentic-kit/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/anthropic"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/agentic-kit?filename=packages%2Fanthropic%2Fpackage.json"/></a>
</p>

Anthropic (Claude) adapter for `agentic-kit`. Speaks the Messages API over
SSE, surfaces text / thinking / tool-call deltas as structured events, and
plugs into the shared model and provider registries.

## Installation

```bash
npm install @agentic-kit/anthropic agentic-kit
```

## Usage

The adapter can either be used directly or registered with the shared
`agentic-kit` provider registry.

### Direct adapter

```ts
import { AnthropicAdapter } from '@agentic-kit/anthropic';

const adapter = new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! });
const model = adapter.createModel('claude-sonnet-4-5');

const result = adapter.stream(model, {
  messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
});

for await (const event of result) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.delta);
  }
}
```

### Through `agentic-kit`

The base `agentic-kit` package pre-registers an Anthropic adapter with an
empty key. Override it with your own key once at startup:

```ts
import { registerProvider, stream, getModel } from 'agentic-kit';
import { AnthropicAdapter } from '@agentic-kit/anthropic';

registerProvider(new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }));

const model = getModel('anthropic', 'claude-sonnet-4-5')!;
const result = stream(model, { messages: [...] });
```

## API Reference

### `new AnthropicAdapter(options | apiKey)`

`AnthropicOptions`:

- `apiKey` — required.
- `baseUrl` — defaults to `https://api.anthropic.com/v1`.
- `defaultModel` — defaults to `claude-sonnet-4-5`.
- `provider` — override the registry key (defaults to `'anthropic'`).
- `headers` — extra headers merged into every request.
- `maxTokens` — default `max_tokens` when neither model nor request sets one.

### `adapter.createModel(modelId, overrides?)`

Returns a `ModelDescriptor`. If `modelId` matches a built-in entry in
`ANTHROPIC_MODELS`, the built-in is used as a base; otherwise a generic
descriptor is synthesized.

### `adapter.stream(model, context, options?)`

Starts a streaming request and returns an `AssistantMessageEventStream` — an
async iterable of `AssistantMessageEvent`s with a `.result()` promise for the
final `AssistantMessage`.

`StreamOptions`:

- `apiKey`, `headers` — per-request overrides.
- `maxTokens`, `temperature`.
- `reasoning` — `'minimal' | 'low' | 'medium' | 'high' | 'xhigh'`. Enables
  Claude extended thinking; maps to a token budget (`256` → `16384`).
- `onPayload` — observe the raw request body before send.
- `signal` — abort the request mid-stream.

### `adapter.listModels()`

Returns the entries from `ANTHROPIC_MODELS` for this adapter's provider key.

### `ANTHROPIC_MODELS`

Built-in `ModelDescriptor[]` with cost, context window, and capability
metadata for the latest Claude tier (Sonnet 4.5, Haiku 4.5).
