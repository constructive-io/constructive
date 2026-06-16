# @agentic-kit/ollama

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/agentic-kit/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/agentic-kit/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/ollama"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/agentic-kit?filename=packages%2Follama%2Fpackage.json"/></a>
</p>

A JavaScript/TypeScript client and provider adapter for the Ollama API,
supporting model listing, structured streaming text generation, embeddings, and
model management.

## Installation

```bash
npm install @agentic-kit/ollama
```


## Usage

```typescript
import OllamaClient, { GenerateInput } from '@agentic-kit/ollama';

// Create a client (default port 11434)
const client = new OllamaClient('http://localhost:11434');

// List available models
const models = await client.listModels();
console.log('Available models:', models);

// Non-streaming text generation
const output = await client.generate({ model: 'mistral', prompt: 'Hello, Ollama!' });
console.log(output);

// Streaming generation
await client.generate(
  { model: 'mistral', prompt: 'Hello, streaming!', stream: true },
  (chunk) => {
    console.log('Received chunk:', chunk);
  }
);

// Pull a model to local cache
await client.pullModel('mistral');

// Generate embeddings (with token count from /api/embed)
const result = await client.generateEmbedding('Compute embeddings');
console.log('Embedding vector length:', result.embedding.length);
console.log('Prompt tokens:', result.promptTokens);

// Delete a pulled model when done
await client.deleteModel('mistral');
```

## API Reference

- `new OllamaClient(baseUrl?: string)` – defaults to `http://localhost:11434`
- `.listModels(): Promise<string[]>`
- `.showModel(model: string): Promise<{ capabilities?: string[] } | null>`
- `.generate(input: GenerateInput, onChunk?: (chunk: string) => void): Promise<string | void>`
- `.generateEmbedding(text: string, model?: string): Promise<EmbeddingResult>` — returns `{ embedding: number[], promptTokens: number }`, defaults to `nomic-embed-text`
- `.pullModel(model: string): Promise<void>`
- `.deleteModel(model: string): Promise<void>`

## Provider Adapter

```typescript
import { OllamaAdapter } from '@agentic-kit/ollama';

const provider = new OllamaAdapter('http://localhost:11434');
const model = provider.createModel('llama3');

// Embeddings with real token counts
const result = await provider.embed('Compute embeddings', 'nomic-embed-text');
console.log(result.embedding.length, result.promptTokens);
```

## Local Live Tests

The package includes a local-only live lane that never talks to hosted
providers.

```bash
OLLAMA_LIVE_MODEL=qwen3.5:4b pnpm --filter @agentic-kit/ollama test:live
```

That default command runs the fast smoke tier. Run the broader suite explicitly
when you want slower behavioral coverage:

```bash
OLLAMA_LIVE_MODEL=qwen3.5:4b pnpm --filter @agentic-kit/ollama test:live:extended
```

Notes:

- The preflight checks `OLLAMA_BASE_URL` first and defaults to `http://127.0.0.1:11434`.
- The default live model is `qwen3.5:4b`; override `OLLAMA_LIVE_MODEL` only if you want a different local model.
- If `nomic-embed-text:latest` is installed, the live lane also covers local embeddings. Override it with `OLLAMA_LIVE_EMBED_MODEL` if needed.
- `smoke` covers fast adapter invariants; `extended` runs the smoke tier plus slower behavioral checks such as reasoning metadata, legacy generate, short multi-turn context, and embeddings.
- If Ollama is not running, or the configured model is not installed, the live
  script exits cleanly with a skip message.
- Normal `pnpm test` runs do not include the live lane.

## GenerateInput type

```ts
interface GenerateInput {
  model: string;
  prompt?: string;
  messages?: ChatMessage[];
  system?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}
```

Either `prompt` (single-turn) or `messages` (multi-turn) must be set.

## Contributing

Please open issues or pull requests on [GitHub](https://github.com/constructive-io/agentic-kit).
