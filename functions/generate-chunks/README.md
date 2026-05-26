# @constructive-io/generate-chunks-fn

Knative function that splits text content into chunks, generates per-chunk embeddings, and inserts them into the chunks table.

## Job Payload

```json
{
  "table": "team_agent_knowledge",
  "schema": "dataroom_public",
  "id": "row-uuid",
  "chunks_table": "team_agent_knowledge_chunks",
  "chunk_size": "1000",
  "chunk_overlap": "200",
  "chunk_strategy": "paragraph"
}
```

## Chunking Strategies

- **fixed** — split at character boundaries
- **sentence** — split on sentence-ending punctuation
- **paragraph** — split on double-newline boundaries
- **semantic** — falls back to paragraph (model-based splitting planned)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PGHOST` | `localhost` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGUSER` | `postgres` | PostgreSQL user |
| `PGPASSWORD` | `password` | PostgreSQL password |
| `PGDATABASE` | `postgres` | PostgreSQL database |
| `EMBEDDER_PROVIDER` | `ollama` | Embedding provider |
| `EMBEDDER_MODEL` | `nomic-embed-text` | Embedding model |
| `EMBEDDER_BASE_URL` | `http://localhost:11434` | Embedding provider URL |
| `PORT` | `8080` | HTTP server port |

## Pipeline

```
INSERT into knowledge table
  → AFTER INSERT trigger fires
  → app_jobs.add_job('generate_knowledge_chunks', payload)
  → knative-job-worker picks up job
  → POST payload to this function
  → read content → split → embed → insert chunks
```
