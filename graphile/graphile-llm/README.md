# graphile-llm

LLM integration plugin for PostGraphile v5. Provides server-side text-to-vector embedding for pgvector columns.

## Features

- **Text-based vector search**: Adds `text: String` field to `VectorNearbyInput` — clients pass natural language instead of raw float vectors
- **Text mutation fields**: Adds `{column}Text: String` companion fields on create/update inputs for vector columns
- **Pluggable embedders**: Provider-based architecture (Ollama via `@agentic-kit/ollama`, with room for OpenAI, etc.)
- **Per-database configuration**: Reads `llm_module` from `services_public.api_modules` for per-API embedder config
- **Plugin-conditional**: Fields only appear in the schema when the plugin is loaded

## Usage

```typescript
import { GraphileLlmPreset } from 'graphile-llm';

const preset = {
  extends: [
    GraphileLlmPreset({
      defaultEmbedder: {
        provider: 'ollama',
        model: 'nomic-embed-text',
        baseUrl: 'http://localhost:11434',
      },
    }),
  ],
};
```
