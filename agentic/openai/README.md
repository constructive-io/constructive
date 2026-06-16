# @agentic-kit/openai

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/agentic-kit/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/openai"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/agentic-kit?filename=packages%2Fopenai%2Fpackage.json"/></a>
</p>

OpenAI and OpenAI-compatible adapter for `agentic-kit`. Works with GPT models,
LM Studio, vLLM, Together AI, Groq, Mistral, and any other endpoint speaking
the chat-completions wire format. Compatibility quirks (token field naming,
reasoning effort, tool-call id encoding) are toggleable per-model via the
`compat` block.

## Installation

```bash
npm install @agentic-kit/openai agentic-kit
```

## Usage

### Direct adapter

```ts
import { OpenAIAdapter } from '@agentic-kit/openai';

const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: 'https://api.openai.com/v1',
});
const model = adapter.createModel('gpt-5.4-mini');

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

`agentic-kit` pre-registers an OpenAI adapter with no key. Replace it with a
configured one:

```ts
import { registerProvider, stream, getModel } from 'agentic-kit';
import { OpenAIAdapter } from '@agentic-kit/openai';

registerProvider(new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }));

const model = getModel('openai', 'gpt-5.4-mini')!;
const result = stream(model, { messages: [...] });
```

### Pointing at an OpenAI-compatible endpoint

```ts
const lmStudio = new OpenAIAdapter({
  baseUrl: 'http://localhost:1234/v1',
  provider: 'lmstudio',
  reasoning: false,
  tools: true,
  compat: {
    maxTokensField: 'max_tokens',
    reasoningFormat: 'none',
    supportsStrictToolSchema: false,
    supportsUsageInStreaming: false,
  },
});
const model = lmStudio.createModel('llama-3.1-8b-instruct');
```

## API Reference

### `new OpenAIAdapter(options? | apiKey?)`

`OpenAIOptions`:

- `apiKey` — required for hosted OpenAI; optional for unauthenticated local
  endpoints.
- `baseUrl` — defaults to `https://api.openai.com/v1`.
- `defaultModel` — defaults to `gpt-5.4-mini`.
- `provider` — registry key; defaults to `'openai'`. Set to your own value
  (e.g. `'lmstudio'`) when registering alongside the OpenAI adapter.
- `defaultInput` — input modalities for ad-hoc models. Defaults to
  `['text', 'image']`.
- `reasoning`, `tools` — capability defaults for ad-hoc models.
- `contextWindow`, `maxTokens` — defaults for ad-hoc models.
- `headers` — extra headers on every request.
- `compat` — `OpenAICompatibleCompat` overrides applied to every model
  produced by this adapter.

### `OpenAICompatibleCompat`

Per-model quirks for non-OpenAI endpoints:

- `maxTokensField` — `'max_tokens'` or `'max_completion_tokens'`.
- `reasoningFormat` — `'openai'` or `'none'`.
- `supportsReasoningEffort` — whether the endpoint accepts the
  `reasoning_effort` field.
- `supportsStrictToolSchema` — whether to send `strict: true` on tool defs.
- `supportsUsageInStreaming` — request usage in streaming payloads.
- `toolCallIdFormat` — `'passthrough' | 'safe64' | 'mistral9'` for endpoints
  that constrain tool-call ids.
- `requiresToolResultName` — include `name` on `tool` messages (some
  endpoints reject it, others require it).

### `adapter.createModel(modelId, overrides?)`

Returns a `ModelDescriptor`. Built-ins in `OPENAI_COMPATIBLE_MODELS` are
used as a base when the id matches; otherwise a generic descriptor is
synthesized from the adapter's defaults.

### `adapter.stream(model, context, options?)`

Returns an `AssistantMessageEventStream`. Supports the standard `agentic-kit`
`StreamOptions` (`apiKey`, `headers`, `maxTokens`, `temperature`,
`reasoning`, `onPayload`, `signal`).

### `adapter.listModels()`

If an API key is configured, fetches `${baseUrl}/models`; otherwise returns
the built-in `OPENAI_COMPATIBLE_MODELS` entries for this adapter's provider.

### `OPENAI_COMPATIBLE_MODELS`

Built-in descriptors for the GPT-5.4 tier (`gpt-5.4`, `gpt-5.4-mini`,
`gpt-5.4-nano`) with cost, context window, and `compat` metadata.
