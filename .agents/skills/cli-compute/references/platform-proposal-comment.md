# platformProposalComment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformProposalComment records via csdk CLI

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance. Supports chunk-aware search: set `includeChunks: true` in VectorNearbyInput to transparently query across parent and chunk embeddings, returning the minimum distance.

**Unified Search API fields:** `bodyTrgmSimilarity`, `pathTrgmSimilarity`, `search`, `searchScore`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```bash
csdk platform-proposal-comment list
csdk platform-proposal-comment list --where.<field>.<op> <value> --orderBy <values>
csdk platform-proposal-comment list --limit 10 --after <cursor>
csdk platform-proposal-comment find-first --where.<field>.<op> <value>
csdk platform-proposal-comment search <query>
csdk platform-proposal-comment get --id <UUID>
csdk platform-proposal-comment create --body <String> --proposalId <UUID> [--actorId <UUID>] [--attachments <Upload>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--embedding <Vector>] [--line <Int>] [--outdatedAt <Datetime>] [--path <String>] [--resolvedAt <Datetime>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-proposal-comment update --id <UUID> [--actorId <UUID>] [--attachments <Upload>] [--body <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--embedding <Vector>] [--line <Int>] [--outdatedAt <Datetime>] [--path <String>] [--proposalId <UUID>] [--resolvedAt <Datetime>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-proposal-comment delete --id <UUID>
```

## Examples

### List platformProposalComment records

```bash
csdk platform-proposal-comment list
```

### List platformProposalComment records with pagination

```bash
csdk platform-proposal-comment list --limit 10 --offset 0
```

### List platformProposalComment records with cursor pagination

```bash
csdk platform-proposal-comment list --limit 10 --after <cursor>
```

### Find first matching platformProposalComment

```bash
csdk platform-proposal-comment find-first --where.id.equalTo <value>
```

### List platformProposalComment records with field selection

```bash
csdk platform-proposal-comment list --select id,id
```

### List platformProposalComment records with filtering and ordering

```bash
csdk platform-proposal-comment list --where.id.equalTo <value> --orderBy ID_ASC
```

### Vector similarity search via `embedding` (manual vector)

```bash
# Pass a pre-computed vector array via dot-notation
csdk platform-proposal-comment list --where.embedding.vector '[0.1,0.2,0.3]' --where.embedding.distance 1.0 --select title,embeddingVectorDistance
```

### Vector semantic search via `embedding` with --auto-embed

```bash
# --auto-embed converts text to vectors using the configured embedder (e.g. Ollama nomic-embed-text)
EMBEDDER_PROVIDER=ollama csdk platform-proposal-comment search "semantic query" --auto-embed --select title,embeddingVectorDistance
EMBEDDER_PROVIDER=ollama csdk platform-proposal-comment list --where.embedding.vector "semantic query" --auto-embed --select title,embeddingVectorDistance
```

### Create/update with auto-embedded `embedding` via --auto-embed

```bash
# --auto-embed on create/update converts text strings in vector fields to embeddings before saving
EMBEDDER_PROVIDER=ollama csdk platform-proposal-comment create --embedding "text to embed" --auto-embed
EMBEDDER_PROVIDER=ollama csdk platform-proposal-comment update --embedding "new text to embed" --auto-embed
```

### Fuzzy search via trigram similarity (`trgmBody`)

```bash
csdk platform-proposal-comment list --where.trgmBody.value "approximate query" --where.trgmBody.threshold 0.3 --select title,bodyTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmPath`)

```bash
csdk platform-proposal-comment list --where.trgmPath.value "approximate query" --where.trgmPath.threshold 0.3 --select title,pathTrgmSimilarity
```

### Full-text search via tsvector (`search`)

```bash
csdk platform-proposal-comment list --where.search "search query" --select title,tsvRank
```

### Composite search (unifiedSearch dispatches to all text adapters)

```bash
csdk platform-proposal-comment list --where.unifiedSearch "search query" --select title,bodyTrgmSimilarity,pathTrgmSimilarity,tsvRank,searchScore
```

### Search with pagination and field projection

```bash
csdk platform-proposal-comment list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk platform-proposal-comment search "query" --limit 10 --select id,title,searchScore
```

### Create a platformProposalComment

```bash
csdk platform-proposal-comment create --body <String> --proposalId <UUID> [--actorId <UUID>] [--attachments <Upload>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--embedding <Vector>] [--line <Int>] [--outdatedAt <Datetime>] [--path <String>] [--resolvedAt <Datetime>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a platformProposalComment by id

```bash
csdk platform-proposal-comment get --id <value>
```
