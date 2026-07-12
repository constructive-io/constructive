# agentResource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentResource records via csdk CLI

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance. Supports chunk-aware search: set `includeChunks: true` in VectorNearbyInput to transparently query across parent and chunk embeddings, returning the minimum distance.

**Unified Search API fields:** `search`, `kindTrgmSimilarity`, `titleTrgmSimilarity`, `descriptionTrgmSimilarity`, `bodyTrgmSimilarity`, `searchScore`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```bash
csdk agent-resource list
csdk agent-resource list --where.<field>.<op> <value> --orderBy <values>
csdk agent-resource list --limit 10 --after <cursor>
csdk agent-resource find-first --where.<field>.<op> <value>
csdk agent-resource search <query>
csdk agent-resource get --id <UUID>
csdk agent-resource create --databaseId <UUID> --slug <String> --title <String> --body <String> [--createdBy <UUID>] [--updatedBy <UUID>] [--kind <String>] [--description <String>] [--keywords <String>] [--isActive <Boolean>] [--metadata <JSON>] [--isArchived <Boolean>] [--archivedAt <Datetime>] [--embedding <Vector>] [--embeddingUpdatedAt <Datetime>]
csdk agent-resource update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--databaseId <UUID>] [--slug <String>] [--kind <String>] [--title <String>] [--description <String>] [--body <String>] [--keywords <String>] [--isActive <Boolean>] [--metadata <JSON>] [--isArchived <Boolean>] [--archivedAt <Datetime>] [--embedding <Vector>] [--embeddingUpdatedAt <Datetime>]
csdk agent-resource delete --id <UUID>
```

## Examples

### List agentResource records

```bash
csdk agent-resource list
```

### List agentResource records with pagination

```bash
csdk agent-resource list --limit 10 --offset 0
```

### List agentResource records with cursor pagination

```bash
csdk agent-resource list --limit 10 --after <cursor>
```

### Find first matching agentResource

```bash
csdk agent-resource find-first --where.id.equalTo <value>
```

### List agentResource records with field selection

```bash
csdk agent-resource list --select id,id
```

### List agentResource records with filtering and ordering

```bash
csdk agent-resource list --where.id.equalTo <value> --orderBy ID_ASC
```

### Vector similarity search via `embedding` (manual vector)

```bash
# Pass a pre-computed vector array via dot-notation
csdk agent-resource list --where.embedding.vector '[0.1,0.2,0.3]' --where.embedding.distance 1.0 --select title,embeddingVectorDistance
```

### Vector semantic search via `embedding` with --auto-embed

```bash
# --auto-embed converts text to vectors using the configured embedder (e.g. Ollama nomic-embed-text)
EMBEDDER_PROVIDER=ollama csdk agent-resource search "semantic query" --auto-embed --select title,embeddingVectorDistance
EMBEDDER_PROVIDER=ollama csdk agent-resource list --where.embedding.vector "semantic query" --auto-embed --select title,embeddingVectorDistance
```

### Create/update with auto-embedded `embedding` via --auto-embed

```bash
# --auto-embed on create/update converts text strings in vector fields to embeddings before saving
EMBEDDER_PROVIDER=ollama csdk agent-resource create --embedding "text to embed" --auto-embed
EMBEDDER_PROVIDER=ollama csdk agent-resource update --embedding "new text to embed" --auto-embed
```

### Full-text search via tsvector (`search`)

```bash
csdk agent-resource list --where.search "search query" --select title,tsvRank
```

### Fuzzy search via trigram similarity (`trgmKind`)

```bash
csdk agent-resource list --where.trgmKind.value "approximate query" --where.trgmKind.threshold 0.3 --select title,kindTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmTitle`)

```bash
csdk agent-resource list --where.trgmTitle.value "approximate query" --where.trgmTitle.threshold 0.3 --select title,titleTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmDescription`)

```bash
csdk agent-resource list --where.trgmDescription.value "approximate query" --where.trgmDescription.threshold 0.3 --select title,descriptionTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmBody`)

```bash
csdk agent-resource list --where.trgmBody.value "approximate query" --where.trgmBody.threshold 0.3 --select title,bodyTrgmSimilarity
```

### Composite search (unifiedSearch dispatches to all text adapters)

```bash
csdk agent-resource list --where.unifiedSearch "search query" --select title,tsvRank,kindTrgmSimilarity,titleTrgmSimilarity,descriptionTrgmSimilarity,bodyTrgmSimilarity,searchScore
```

### Search with pagination and field projection

```bash
csdk agent-resource list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk agent-resource search "query" --limit 10 --select id,title,searchScore
```

### Create a agentResource

```bash
csdk agent-resource create --databaseId <UUID> --slug <String> --title <String> --body <String> [--createdBy <UUID>] [--updatedBy <UUID>] [--kind <String>] [--description <String>] [--keywords <String>] [--isActive <Boolean>] [--metadata <JSON>] [--isArchived <Boolean>] [--archivedAt <Datetime>] [--embedding <Vector>] [--embeddingUpdatedAt <Datetime>]
```

### Get a agentResource by id

```bash
csdk agent-resource get --id <value>
```
