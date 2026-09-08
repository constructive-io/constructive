# platformProposal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformProposal records via csdk CLI

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance. Supports chunk-aware search: set `includeChunks: true` in VectorNearbyInput to transparently query across parent and chunk embeddings, returning the minimum distance.

**Unified Search API fields:** `bodyTrgmSimilarity`, `closedReasonTrgmSimilarity`, `kindTrgmSimilarity`, `mergeCommitTrgmSimilarity`, `mergeMethodTrgmSimilarity`, `resolutionTrgmSimilarity`, `search`, `searchScore`, `sourceRefTrgmSimilarity`, `statusTrgmSimilarity`, `targetRefTrgmSimilarity`, `titleTrgmSimilarity`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```bash
csdk platform-proposal list
csdk platform-proposal list --where.<field>.<op> <value> --orderBy <values>
csdk platform-proposal list --limit 10 --after <cursor>
csdk platform-proposal find-first --where.<field>.<op> <value>
csdk platform-proposal search <query>
csdk platform-proposal get --id <UUID>
csdk platform-proposal create --repositoryId <UUID> --title <String> [--actorId <UUID>] [--body <String>] [--closedReason <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--decidedAt <Datetime>] [--dueAt <Datetime>] [--embedding <Vector>] [--kind <String>] [--labels <String>] [--mergeCommit <String>] [--mergeMethod <String>] [--mergeRequestedAt <Datetime>] [--mergedAt <Datetime>] [--metadata <JSON>] [--parentId <UUID>] [--priority <BigFloat>] [--resolution <String>] [--sourceRef <String>] [--status <String>] [--targetRef <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-proposal update --id <UUID> [--actorId <UUID>] [--body <String>] [--closedReason <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--decidedAt <Datetime>] [--dueAt <Datetime>] [--embedding <Vector>] [--kind <String>] [--labels <String>] [--mergeCommit <String>] [--mergeMethod <String>] [--mergeRequestedAt <Datetime>] [--mergedAt <Datetime>] [--metadata <JSON>] [--parentId <UUID>] [--priority <BigFloat>] [--repositoryId <UUID>] [--resolution <String>] [--sourceRef <String>] [--status <String>] [--targetRef <String>] [--title <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-proposal delete --id <UUID>
```

## Examples

### List platformProposal records

```bash
csdk platform-proposal list
```

### List platformProposal records with pagination

```bash
csdk platform-proposal list --limit 10 --offset 0
```

### List platformProposal records with cursor pagination

```bash
csdk platform-proposal list --limit 10 --after <cursor>
```

### Find first matching platformProposal

```bash
csdk platform-proposal find-first --where.id.equalTo <value>
```

### List platformProposal records with field selection

```bash
csdk platform-proposal list --select id,id
```

### List platformProposal records with filtering and ordering

```bash
csdk platform-proposal list --where.id.equalTo <value> --orderBy ID_ASC
```

### Vector similarity search via `embedding` (manual vector)

```bash
# Pass a pre-computed vector array via dot-notation
csdk platform-proposal list --where.embedding.vector '[0.1,0.2,0.3]' --where.embedding.distance 1.0 --select title,embeddingVectorDistance
```

### Vector semantic search via `embedding` with --auto-embed

```bash
# --auto-embed converts text to vectors using the configured embedder (e.g. Ollama nomic-embed-text)
EMBEDDER_PROVIDER=ollama csdk platform-proposal search "semantic query" --auto-embed --select title,embeddingVectorDistance
EMBEDDER_PROVIDER=ollama csdk platform-proposal list --where.embedding.vector "semantic query" --auto-embed --select title,embeddingVectorDistance
```

### Create/update with auto-embedded `embedding` via --auto-embed

```bash
# --auto-embed on create/update converts text strings in vector fields to embeddings before saving
EMBEDDER_PROVIDER=ollama csdk platform-proposal create --embedding "text to embed" --auto-embed
EMBEDDER_PROVIDER=ollama csdk platform-proposal update --embedding "new text to embed" --auto-embed
```

### Fuzzy search via trigram similarity (`trgmBody`)

```bash
csdk platform-proposal list --where.trgmBody.value "approximate query" --where.trgmBody.threshold 0.3 --select title,bodyTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmClosedReason`)

```bash
csdk platform-proposal list --where.trgmClosedReason.value "approximate query" --where.trgmClosedReason.threshold 0.3 --select title,closedReasonTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmKind`)

```bash
csdk platform-proposal list --where.trgmKind.value "approximate query" --where.trgmKind.threshold 0.3 --select title,kindTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmMergeCommit`)

```bash
csdk platform-proposal list --where.trgmMergeCommit.value "approximate query" --where.trgmMergeCommit.threshold 0.3 --select title,mergeCommitTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmMergeMethod`)

```bash
csdk platform-proposal list --where.trgmMergeMethod.value "approximate query" --where.trgmMergeMethod.threshold 0.3 --select title,mergeMethodTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmResolution`)

```bash
csdk platform-proposal list --where.trgmResolution.value "approximate query" --where.trgmResolution.threshold 0.3 --select title,resolutionTrgmSimilarity
```

### Full-text search via tsvector (`search`)

```bash
csdk platform-proposal list --where.search "search query" --select title,tsvRank
```

### Fuzzy search via trigram similarity (`trgmSourceRef`)

```bash
csdk platform-proposal list --where.trgmSourceRef.value "approximate query" --where.trgmSourceRef.threshold 0.3 --select title,sourceRefTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmStatus`)

```bash
csdk platform-proposal list --where.trgmStatus.value "approximate query" --where.trgmStatus.threshold 0.3 --select title,statusTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmTargetRef`)

```bash
csdk platform-proposal list --where.trgmTargetRef.value "approximate query" --where.trgmTargetRef.threshold 0.3 --select title,targetRefTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmTitle`)

```bash
csdk platform-proposal list --where.trgmTitle.value "approximate query" --where.trgmTitle.threshold 0.3 --select title,titleTrgmSimilarity
```

### Composite search (unifiedSearch dispatches to all text adapters)

```bash
csdk platform-proposal list --where.unifiedSearch "search query" --select title,bodyTrgmSimilarity,closedReasonTrgmSimilarity,kindTrgmSimilarity,mergeCommitTrgmSimilarity,mergeMethodTrgmSimilarity,resolutionTrgmSimilarity,tsvRank,searchScore,sourceRefTrgmSimilarity,statusTrgmSimilarity,targetRefTrgmSimilarity,titleTrgmSimilarity
```

### Search with pagination and field projection

```bash
csdk platform-proposal list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk platform-proposal search "query" --limit 10 --select id,title,searchScore
```

### Create a platformProposal

```bash
csdk platform-proposal create --repositoryId <UUID> --title <String> [--actorId <UUID>] [--body <String>] [--closedReason <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--decidedAt <Datetime>] [--dueAt <Datetime>] [--embedding <Vector>] [--kind <String>] [--labels <String>] [--mergeCommit <String>] [--mergeMethod <String>] [--mergeRequestedAt <Datetime>] [--mergedAt <Datetime>] [--metadata <JSON>] [--parentId <UUID>] [--priority <BigFloat>] [--resolution <String>] [--sourceRef <String>] [--status <String>] [--targetRef <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a platformProposal by id

```bash
csdk platform-proposal get --id <value>
```
