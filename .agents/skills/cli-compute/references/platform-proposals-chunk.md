# platformProposalsChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformProposalsChunk records via csdk CLI

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance. Supports chunk-aware search: set `includeChunks: true` in VectorNearbyInput to transparently query across parent and chunk embeddings, returning the minimum distance.

**Unified Search API fields:** `searchScore`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```bash
csdk platform-proposals-chunk list
csdk platform-proposals-chunk list --where.<field>.<op> <value> --orderBy <values>
csdk platform-proposals-chunk list --limit 10 --after <cursor>
csdk platform-proposals-chunk find-first --where.<field>.<op> <value>
csdk platform-proposals-chunk search <query>
csdk platform-proposals-chunk get --id <UUID>
csdk platform-proposals-chunk create --body <String> --platformProposalsId <UUID> [--actorId <UUID>] [--chunkIndex <Int>] [--embedding <Vector>] [--metadata <JSON>]
csdk platform-proposals-chunk update --id <UUID> [--actorId <UUID>] [--body <String>] [--chunkIndex <Int>] [--embedding <Vector>] [--metadata <JSON>] [--platformProposalsId <UUID>]
csdk platform-proposals-chunk delete --id <UUID>
```

## Examples

### List platformProposalsChunk records

```bash
csdk platform-proposals-chunk list
```

### List platformProposalsChunk records with pagination

```bash
csdk platform-proposals-chunk list --limit 10 --offset 0
```

### List platformProposalsChunk records with cursor pagination

```bash
csdk platform-proposals-chunk list --limit 10 --after <cursor>
```

### Find first matching platformProposalsChunk

```bash
csdk platform-proposals-chunk find-first --where.id.equalTo <value>
```

### List platformProposalsChunk records with field selection

```bash
csdk platform-proposals-chunk list --select id,id
```

### List platformProposalsChunk records with filtering and ordering

```bash
csdk platform-proposals-chunk list --where.id.equalTo <value> --orderBy ID_ASC
```

### Vector similarity search via `embedding` (manual vector)

```bash
# Pass a pre-computed vector array via dot-notation
csdk platform-proposals-chunk list --where.embedding.vector '[0.1,0.2,0.3]' --where.embedding.distance 1.0 --select title,embeddingVectorDistance
```

### Vector semantic search via `embedding` with --auto-embed

```bash
# --auto-embed converts text to vectors using the configured embedder (e.g. Ollama nomic-embed-text)
EMBEDDER_PROVIDER=ollama csdk platform-proposals-chunk search "semantic query" --auto-embed --select title,embeddingVectorDistance
EMBEDDER_PROVIDER=ollama csdk platform-proposals-chunk list --where.embedding.vector "semantic query" --auto-embed --select title,embeddingVectorDistance
```

### Create/update with auto-embedded `embedding` via --auto-embed

```bash
# --auto-embed on create/update converts text strings in vector fields to embeddings before saving
EMBEDDER_PROVIDER=ollama csdk platform-proposals-chunk create --embedding "text to embed" --auto-embed
EMBEDDER_PROVIDER=ollama csdk platform-proposals-chunk update --embedding "new text to embed" --auto-embed
```

### Search with pagination and field projection

```bash
csdk platform-proposals-chunk list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk platform-proposals-chunk search "query" --limit 10 --select id,title,searchScore
```

### Create a platformProposalsChunk

```bash
csdk platform-proposals-chunk create --body <String> --platformProposalsId <UUID> [--actorId <UUID>] [--chunkIndex <Int>] [--embedding <Vector>] [--metadata <JSON>]
```

### Get a platformProposalsChunk by id

```bash
csdk platform-proposals-chunk get --id <value>
```
