# agentSkill

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentSkill records via csdk CLI

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance. Supports chunk-aware search: set `includeChunks: true` in VectorNearbyInput to transparently query across parent and chunk embeddings, returning the minimum distance.

**Unified Search API fields:** `search`, `titleTrgmSimilarity`, `descriptionTrgmSimilarity`, `bodyTrgmSimilarity`, `searchScore`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```bash
csdk agent-skill list
csdk agent-skill list --where.<field>.<op> <value> --orderBy <values>
csdk agent-skill list --limit 10 --after <cursor>
csdk agent-skill find-first --where.<field>.<op> <value>
csdk agent-skill search <query>
csdk agent-skill get --id <UUID>
csdk agent-skill create --title <String> --body <String> [--createdBy <UUID>] [--updatedBy <UUID>] [--description <String>] [--keywords <String>] [--isActive <Boolean>] [--metadata <JSON>] [--embedding <Vector>] [--embeddingUpdatedAt <Datetime>]
csdk agent-skill update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--title <String>] [--description <String>] [--body <String>] [--keywords <String>] [--isActive <Boolean>] [--metadata <JSON>] [--embedding <Vector>] [--embeddingUpdatedAt <Datetime>]
csdk agent-skill delete --id <UUID>
```

## Examples

### List agentSkill records

```bash
csdk agent-skill list
```

### List agentSkill records with pagination

```bash
csdk agent-skill list --limit 10 --offset 0
```

### List agentSkill records with cursor pagination

```bash
csdk agent-skill list --limit 10 --after <cursor>
```

### Find first matching agentSkill

```bash
csdk agent-skill find-first --where.id.equalTo <value>
```

### List agentSkill records with field selection

```bash
csdk agent-skill list --select id,id
```

### List agentSkill records with filtering and ordering

```bash
csdk agent-skill list --where.id.equalTo <value> --orderBy ID_ASC
```

### Vector similarity search via `embedding` (manual vector)

```bash
# Pass a pre-computed vector array via dot-notation
csdk agent-skill list --where.embedding.vector '[0.1,0.2,0.3]' --where.embedding.distance 1.0 --select title,embeddingVectorDistance
```

### Vector semantic search via `embedding` with --auto-embed

```bash
# --auto-embed converts text to vectors using the configured embedder (e.g. Ollama nomic-embed-text)
EMBEDDER_PROVIDER=ollama csdk agent-skill search "semantic query" --auto-embed --select title,embeddingVectorDistance
EMBEDDER_PROVIDER=ollama csdk agent-skill list --where.embedding.vector "semantic query" --auto-embed --select title,embeddingVectorDistance
```

### Create/update with auto-embedded `embedding` via --auto-embed

```bash
# --auto-embed on create/update converts text strings in vector fields to embeddings before saving
EMBEDDER_PROVIDER=ollama csdk agent-skill create --embedding "text to embed" --auto-embed
EMBEDDER_PROVIDER=ollama csdk agent-skill update --embedding "new text to embed" --auto-embed
```

### Full-text search via tsvector (`search`)

```bash
csdk agent-skill list --where.search "search query" --select title,tsvRank
```

### Fuzzy search via trigram similarity (`trgmTitle`)

```bash
csdk agent-skill list --where.trgmTitle.value "approximate query" --where.trgmTitle.threshold 0.3 --select title,titleTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmDescription`)

```bash
csdk agent-skill list --where.trgmDescription.value "approximate query" --where.trgmDescription.threshold 0.3 --select title,descriptionTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmBody`)

```bash
csdk agent-skill list --where.trgmBody.value "approximate query" --where.trgmBody.threshold 0.3 --select title,bodyTrgmSimilarity
```

### Composite search (unifiedSearch dispatches to all text adapters)

```bash
csdk agent-skill list --where.unifiedSearch "search query" --select title,tsvRank,titleTrgmSimilarity,descriptionTrgmSimilarity,bodyTrgmSimilarity,searchScore
```

### Search with pagination and field projection

```bash
csdk agent-skill list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk agent-skill search "query" --limit 10 --select id,title,searchScore
```

### Create a agentSkill

```bash
csdk agent-skill create --title <String> --body <String> [--createdBy <UUID>] [--updatedBy <UUID>] [--description <String>] [--keywords <String>] [--isActive <Boolean>] [--metadata <JSON>] [--embedding <Vector>] [--embeddingUpdatedAt <Datetime>]
```

### Get a agentSkill by id

```bash
csdk agent-skill get --id <value>
```
