# @constructive-io/llm-env

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

Single source of truth for all LLM-related environment variables and defaults.
Follows the same conventions as `@pgpmjs/env`.

## Usage

```typescript
import { getEnvVars, getEnvOptions, llmDefaults } from '@constructive-io/llm-env';

// Raw env parsing — only keys that are set, no defaults
const envVars = getEnvVars(process.env);
// → { embedding: { model: 'text-embedding-3-small' } }  (only set keys)

// Merged: defaults → env → overrides
const opts = getEnvOptions();
// opts.embedding.provider  → EMBEDDER_PROVIDER  || 'ollama'
// opts.embedding.model     → EMBEDDER_MODEL     || 'nomic-embed-text'
// opts.embedding.baseUrl   → EMBEDDER_BASE_URL  || 'http://localhost:11434'
// opts.chat.provider       → CHAT_PROVIDER      || 'ollama'
// opts.chat.model          → CHAT_MODEL         || 'llama3'
// opts.chat.baseUrl        → CHAT_BASE_URL      || 'http://localhost:11434'

// With runtime overrides
const custom = getEnvOptions({ embedding: { model: 'mxbai-embed-large' } });
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDER_PROVIDER` | `ollama` | Embedding provider name |
| `EMBEDDER_MODEL` | `nomic-embed-text` | Embedding model identifier |
| `EMBEDDER_BASE_URL` | `http://localhost:11434` | Embedding provider URL |
| `CHAT_PROVIDER` | `ollama` | Chat provider name |
| `CHAT_MODEL` | `llama3` | Chat model identifier |
| `CHAT_BASE_URL` | `http://localhost:11434` | Chat provider URL |
