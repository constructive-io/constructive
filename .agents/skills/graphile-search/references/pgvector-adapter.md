# pgvector Adapter

Semantic similarity search using the `pgvector` extension. Supports cosine, L2, and inner product distance metrics for embedding-based search and RAG.

## How It Works

The pgvector adapter:
1. **Detects** `vector(N)` columns on tables (via `VectorCodecPlugin` codec registration)
2. **Registers** `VectorSearchInput` type (`{ query: [Float!]!, metric: VectorMetric }`)
3. **Generates** distance score as a computed field and orderBy enum

## Adapter Configuration

```typescript
import { createPgvectorAdapter } from 'graphile-search';

createPgvectorAdapter({
  filterPrefix: 'vector',        // default: 'vector'
  defaultMetric: 'COSINE',       // default: 'COSINE' (COSINE | L2 | IP)
})
```

## Generated GraphQL

Given a table with an `embedding vector(768)` column:

### Filter

```graphql
query {
  allDocuments(where: {
    vectorEmbedding: { query: [0.1, 0.2, ...], metric: COSINE }
  }) {
    nodes {
      title
      embeddingVectorDistance
    }
  }
}
```

### Score Field

```graphql
type Document {
  embeddingVectorDistance: Float  # distance score, lower = more similar
}
```

### OrderBy

```graphql
enum DocumentsOrderBy {
  EMBEDDING_VECTOR_DISTANCE_ASC   # most similar first
  EMBEDDING_VECTOR_DISTANCE_DESC  # least similar first
}
```

## Distance Metrics

| Metric | Operator | Range | Notes |
|--------|----------|-------|-------|
| `COSINE` | `<=>` | 0-2 | 0 = identical; best for normalized embeddings |
| `L2` | `<->` | 0-inf | Euclidean distance |
| `IP` | `<#>` | -inf to 0 | Negative inner product; less negative = more similar |

## Score Semantics

| Property | Value |
|----------|-------|
| Metric | `distance` |
| Lower is better | Yes (closer = more similar) |
| Range | Unbounded (uses sigmoid normalization in searchScore) |

## Adapter Flags

| Flag | Value |
|------|-------|
| `isSupplementary` | `false` (primary adapter) |
| `isIntentionalSearch` | `false` (embeddings do NOT trigger trgm) |
| `supportsTextSearch` | `false` (not included in unifiedSearch composite) |

pgvector is the only primary adapter that sets `isIntentionalSearch: false`. This is because vector embeddings operate on a different domain than text search — a table with only pgvector columns shouldn't get trgm similarity fields on its text columns.

## Chunk-Aware Search (`@hasChunks`)

Tables with long-form content (documents, articles, etc.) often split text into **chunks**, each with its own embedding. The pgvector adapter transparently queries across parent and chunk embeddings when the `@hasChunks` smart tag is present on the table's codec.

### How It Works

1. The parent table has a `vector(N)` column (the document-level embedding)
2. A separate chunks table stores per-chunk embeddings with a foreign key back to the parent
3. The `@hasChunks` smart tag tells the adapter where to find the chunks table
4. At query time, the adapter computes `LEAST(parent_distance, MIN(chunk_distance))` — the best match across all embeddings

### Smart Tag Configuration

Set `@hasChunks` on the parent table codec as a JSON object:

```json
{
  "chunksTable": "documents_chunks",
  "parentFk": "parent_id",
  "parentPk": "id",
  "embeddingField": "embedding"
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `chunksTable` | *(required)* | Name of the chunks table |
| `chunksSchema` | parent table's schema | Schema of the chunks table |
| `parentFk` | `parent_id` | Column in chunks table that references the parent |
| `parentPk` | `id` | Primary key column on the parent table |
| `embeddingField` | `embedding` | Vector column in the chunks table |

In Constructive, the `SearchVector` node type with chunks enabled automatically creates the chunks table and wires up the relationship. The smart tag is applied via a Graphile plugin or smart tags file.

### `includeChunks` Filter Field

When `@hasChunks` is detected, `VectorNearbyInput` gains an `includeChunks` boolean field:

```graphql
input VectorNearbyInput {
  vector: [Float!]!
  metric: VectorMetric
  distance: Float
  includeChunks: Boolean   # only present when @hasChunks is on the table
}
```

- **`true` (default for `@hasChunks` tables):** Distance = `LEAST(parent_distance, MIN(chunk_distance))`
- **`false`:** Distance = parent embedding distance only

### Generated SQL

When `includeChunks` is active, the adapter generates:

```sql
LEAST(
  parent.embedding <=> $query,
  (SELECT MIN(c.embedding <=> $query)
   FROM documents_chunks AS c
   WHERE c.parent_id = parent.id)
)
```

`LEAST` ignores NULL operands, so this is the closest of the parent and its
chunks, and NULL only when neither has an embedding. The filter also adds

```sql
parent.embedding IS NOT NULL
OR EXISTS (SELECT 1 FROM documents_chunks AS c
           WHERE c.parent_id = parent.id AND c.embedding IS NOT NULL)
```

to `WHERE`, so rows with no embedding anywhere are not returned, counted or
paged over. With `includeChunks: false` (and on tables without `@hasChunks`)
the predicate is just `parent.embedding IS NOT NULL`. The composite
`unifiedSearch` filter does not add this predicate: a row with no embedding can
still match through another adapter and simply has no vector score.

### GraphQL Query Examples

```graphql
# Chunk-aware (default) — returns best distance across parent + all chunks
query {
  allDocuments(where: {
    vectorEmbedding: { vector: [0.1, 0.2, ...], metric: COSINE }
  }) {
    nodes {
      title
      embeddingVectorDistance   # LEAST(parent, closest chunk)
    }
  }
}

# Parent-only — opt out of chunk search
query {
  allDocuments(where: {
    vectorEmbedding: { vector: [0.1, 0.2, ...], metric: COSINE, includeChunks: false }
  }) {
    nodes {
      title
      embeddingVectorDistance   # parent distance only
    }
  }
}
```

## VectorCodecPlugin

The `VectorCodecPlugin` (included in `UnifiedSearchPreset`) teaches PostGraphile about the `vector` PostgreSQL type:

- **Wire format:** PostgreSQL sends vectors as text `[0.1,0.2,...,0.768]`
- **JavaScript:** `number[]`
- **GraphQL scalar:** `Vector` (serialized as `[Float]`)

Without this plugin, PostGraphile silently ignores `vector(N)` columns.

## Codegen — Vector Scalar Mapping

When generating typed SDK code, the `Vector` scalar maps to `number[]`:

```typescript
// graphql-codegen.config.ts
scalars: {
  Vector: 'number[]',
}
```

With `@constructive-io/graphql-codegen >= 4.6.0`, this mapping is built-in.

## Prerequisites

- `pgvector` extension enabled (pre-enabled in Constructive stack)
- A `vector(N)` column on the table
- An HNSW or IVFFlat index for performance (`CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`)
- `VectorCodecPlugin` loaded (included automatically by `UnifiedSearchPreset`)
