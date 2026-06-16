# agentic-server

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/agentic-server"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Fagentic-server%2Fpackage.json"/></a>
</p>

Standalone Express LLM service — agent threads, chat streaming, billing metering, and inference logging via `@constructive-io/express-context`.

## Overview

`agentic-server` is the Express-only equivalent of what `graphile-llm` does inside PostGraphile. It provides the same capabilities (agent threads, chat, embeddings, billing, inference logging) but as a standalone Express router that uses `@constructive-io/express-context` for tenant-scoped database access.

## Usage

```typescript
import express from 'express';
import { createContextMiddleware } from '@constructive-io/express-context';
import { createAgenticRouter } from 'agentic-server';

const app = express();

// Tenant context middleware (domain resolution, JWT, pgSettings, withPgClient)
app.use(createContextMiddleware());

// Mount the agentic router
app.use(createAgenticRouter());

app.listen(3001, () => {
  console.log('agentic-server running on :3001');
});
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/threads` | Create a new conversation thread |
| POST | `/v1/threads/:thread_id/messages` | Send messages + get AI response (streaming SSE) |
| POST | `/v1/orgs/:entity_id/threads` | Create thread (entity-scoped) |
| POST | `/v1/orgs/:entity_id/threads/:thread_id/messages` | Send message (entity-scoped) |
| POST | `/v1/embed` | Generate embeddings |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAT_PROVIDER` | `ollama` | Chat LLM provider |
| `CHAT_MODEL` | `llama3` | Default chat model |
| `CHAT_BASE_URL` | `http://localhost:11434` | Chat provider URL |
| `EMBEDDER_PROVIDER` | `ollama` | Embedding provider |
| `EMBEDDER_MODEL` | `nomic-embed-text` | Default embedding model |
| `EMBEDDER_BASE_URL` | `http://localhost:11434` | Embedding provider URL |

## Features

- **Thread management**: Create and manage conversation threads with system prompts
- **Streaming chat**: SSE streaming responses (OpenAI-compatible format)
- **Batch chat**: Non-streaming JSON responses
- **Embeddings**: Generate vector embeddings via `/v1/embed`
- **Billing integration**: Automatic quota checks and usage recording (when billing module is provisioned)
- **Inference logging**: Automatic token usage logging (when inference_log module is provisioned)
- **RLS enforcement**: All database operations run within tenant-scoped RLS transactions

## Architecture

```
Cloud Function → POST /v1/threads/:id/messages → agentic-server
                                                      │
                                  ┌───────────────────┼───────────────────┐
                                  │                   │                   │
                         express-context        OllamaAdapter        Billing
                        (tenant DB context)    (LLM provider)    (quota + usage)
```

The cloud function doesn't need to know about databases, billing, or LLM providers. It just POSTs `{ messages, model }` and gets back a streamed response.
