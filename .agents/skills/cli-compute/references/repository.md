# repository

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Repository records via csdk CLI

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance. Supports chunk-aware search: set `includeChunks: true` in VectorNearbyInput to transparently query across parent and chunk embeddings, returning the minimum distance.

**Unified Search API fields:** `cloneUrlTrgmSimilarity`, `defaultBranchTrgmSimilarity`, `descriptionTrgmSimilarity`, `externalIdTrgmSimilarity`, `nameTrgmSimilarity`, `providerTrgmSimilarity`, `search`, `searchScore`, `slugTrgmSimilarity`, `visibilityTrgmSimilarity`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```bash
csdk repository list
csdk repository list --where.<field>.<op> <value> --orderBy <values>
csdk repository list --limit 10 --after <cursor>
csdk repository find-first --where.<field>.<op> <value>
csdk repository search <query>
csdk repository get --id <UUID>
csdk repository create --databaseId <UUID> --name <String> --slug <String> [--cloneUrl <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--defaultBranch <String>] [--description <String>] [--embedding <Vector>] [--externalId <String>] [--isArchived <Boolean>] [--metadata <JSON>] [--ownerId <UUID>] [--provider <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>] [--visibility <String>]
csdk repository update --id <UUID> [--cloneUrl <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--defaultBranch <String>] [--description <String>] [--embedding <Vector>] [--externalId <String>] [--isArchived <Boolean>] [--metadata <JSON>] [--name <String>] [--ownerId <UUID>] [--provider <String>] [--slug <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>] [--visibility <String>]
csdk repository delete --id <UUID>
```

## Examples

### List repository records

```bash
csdk repository list
```

### List repository records with pagination

```bash
csdk repository list --limit 10 --offset 0
```

### List repository records with cursor pagination

```bash
csdk repository list --limit 10 --after <cursor>
```

### Find first matching repository

```bash
csdk repository find-first --where.id.equalTo <value>
```

### List repository records with field selection

```bash
csdk repository list --select id,id
```

### List repository records with filtering and ordering

```bash
csdk repository list --where.id.equalTo <value> --orderBy ID_ASC
```

### Vector similarity search via `embedding` (manual vector)

```bash
# Pass a pre-computed vector array via dot-notation
csdk repository list --where.embedding.vector '[0.1,0.2,0.3]' --where.embedding.distance 1.0 --select title,embeddingVectorDistance
```

### Vector semantic search via `embedding` with --auto-embed

```bash
# --auto-embed converts text to vectors using the configured embedder (e.g. Ollama nomic-embed-text)
EMBEDDER_PROVIDER=ollama csdk repository search "semantic query" --auto-embed --select title,embeddingVectorDistance
EMBEDDER_PROVIDER=ollama csdk repository list --where.embedding.vector "semantic query" --auto-embed --select title,embeddingVectorDistance
```

### Create/update with auto-embedded `embedding` via --auto-embed

```bash
# --auto-embed on create/update converts text strings in vector fields to embeddings before saving
EMBEDDER_PROVIDER=ollama csdk repository create --embedding "text to embed" --auto-embed
EMBEDDER_PROVIDER=ollama csdk repository update --embedding "new text to embed" --auto-embed
```

### Fuzzy search via trigram similarity (`trgmCloneUrl`)

```bash
csdk repository list --where.trgmCloneUrl.value "approximate query" --where.trgmCloneUrl.threshold 0.3 --select title,cloneUrlTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmDefaultBranch`)

```bash
csdk repository list --where.trgmDefaultBranch.value "approximate query" --where.trgmDefaultBranch.threshold 0.3 --select title,defaultBranchTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmDescription`)

```bash
csdk repository list --where.trgmDescription.value "approximate query" --where.trgmDescription.threshold 0.3 --select title,descriptionTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmExternalId`)

```bash
csdk repository list --where.trgmExternalId.value "approximate query" --where.trgmExternalId.threshold 0.3 --select title,externalIdTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmName`)

```bash
csdk repository list --where.trgmName.value "approximate query" --where.trgmName.threshold 0.3 --select title,nameTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmProvider`)

```bash
csdk repository list --where.trgmProvider.value "approximate query" --where.trgmProvider.threshold 0.3 --select title,providerTrgmSimilarity
```

### Full-text search via tsvector (`search`)

```bash
csdk repository list --where.search "search query" --select title,tsvRank
```

### Fuzzy search via trigram similarity (`trgmSlug`)

```bash
csdk repository list --where.trgmSlug.value "approximate query" --where.trgmSlug.threshold 0.3 --select title,slugTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmVisibility`)

```bash
csdk repository list --where.trgmVisibility.value "approximate query" --where.trgmVisibility.threshold 0.3 --select title,visibilityTrgmSimilarity
```

### Composite search (unifiedSearch dispatches to all text adapters)

```bash
csdk repository list --where.unifiedSearch "search query" --select title,cloneUrlTrgmSimilarity,defaultBranchTrgmSimilarity,descriptionTrgmSimilarity,externalIdTrgmSimilarity,nameTrgmSimilarity,providerTrgmSimilarity,tsvRank,searchScore,slugTrgmSimilarity,visibilityTrgmSimilarity
```

### Search with pagination and field projection

```bash
csdk repository list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk repository search "query" --limit 10 --select id,title,searchScore
```

### Create a repository

```bash
csdk repository create --databaseId <UUID> --name <String> --slug <String> [--cloneUrl <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--defaultBranch <String>] [--description <String>] [--embedding <Vector>] [--externalId <String>] [--isArchived <Boolean>] [--metadata <JSON>] [--ownerId <UUID>] [--provider <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>] [--visibility <String>]
```

### Get a repository by id

```bash
csdk repository get --id <value>
```
