# agentResourceChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentResourceChunk records via csdk CLI

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance. Supports chunk-aware search: set `includeChunks: true` in VectorNearbyInput to transparently query across parent and chunk embeddings, returning the minimum distance.

**Unified Search API fields:** `searchScore`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```bash
csdk agent-resource-chunk list
csdk agent-resource-chunk list --where.<field>.<op> <value> --orderBy <values>
csdk agent-resource-chunk list --limit 10 --after <cursor>
csdk agent-resource-chunk find-first --where.<field>.<op> <value>
csdk agent-resource-chunk search <query>
csdk agent-resource-chunk get --id <UUID>
csdk agent-resource-chunk create --agentResourceId <UUID> --body <String> [--chunkIndex <Int>] [--databaseId <UUID>] [--embedding <Vector>] [--metadata <JSON>]
csdk agent-resource-chunk update --id <UUID> [--agentResourceId <UUID>] [--body <String>] [--chunkIndex <Int>] [--databaseId <UUID>] [--embedding <Vector>] [--metadata <JSON>]
csdk agent-resource-chunk delete --id <UUID>
```

## Examples

### List agentResourceChunk records

```bash
csdk agent-resource-chunk list
```

### List agentResourceChunk records with pagination

```bash
csdk agent-resource-chunk list --limit 10 --offset 0
```

### List agentResourceChunk records with cursor pagination

```bash
csdk agent-resource-chunk list --limit 10 --after <cursor>
```

### Find first matching agentResourceChunk

```bash
csdk agent-resource-chunk find-first --where.id.equalTo <value>
```

### List agentResourceChunk records with field selection

```bash
csdk agent-resource-chunk list --select id,id
```

### List agentResourceChunk records with filtering and ordering

```bash
csdk agent-resource-chunk list --where.id.equalTo <value> --orderBy ID_ASC
```

### Vector similarity search via `embedding` (manual vector)

```bash
# Pass a pre-computed vector array via dot-notation
csdk agent-resource-chunk list --where.embedding.vector '[0.1,0.2,0.3]' --where.embedding.distance 1.0 --select title,embeddingVectorDistance
```

### Vector semantic search via `embedding` with --auto-embed

```bash
# --auto-embed converts text to vectors using the configured embedder (e.g. Ollama nomic-embed-text)
EMBEDDER_PROVIDER=ollama csdk agent-resource-chunk search "semantic query" --auto-embed --select title,embeddingVectorDistance
EMBEDDER_PROVIDER=ollama csdk agent-resource-chunk list --where.embedding.vector "semantic query" --auto-embed --select title,embeddingVectorDistance
```

### Create/update with auto-embedded `embedding` via --auto-embed

```bash
# --auto-embed on create/update converts text strings in vector fields to embeddings before saving
EMBEDDER_PROVIDER=ollama csdk agent-resource-chunk create --embedding "text to embed" --auto-embed
EMBEDDER_PROVIDER=ollama csdk agent-resource-chunk update --embedding "new text to embed" --auto-embed
```

### Search with pagination and field projection

```bash
csdk agent-resource-chunk list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk agent-resource-chunk search "query" --limit 10 --select id,title,searchScore
```

### Create a agentResourceChunk

```bash
csdk agent-resource-chunk create --agentResourceId <UUID> --body <String> [--chunkIndex <Int>] [--databaseId <UUID>] [--embedding <Vector>] [--metadata <JSON>]
```

### Get a agentResourceChunk by id

```bash
csdk agent-resource-chunk get --id <value>
```
