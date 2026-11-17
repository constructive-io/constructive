# Querying Search via Generated SDK (Codegen)

After running `cnc codegen`, the generated SDK client exposes search filters, score fields, and orderBy enums for every search-enabled table. This reference shows how to query each search type.

---

## Setup

```typescript
import { createClient } from '@constructive-io/sdk';

const db = createClient({
  endpoint: process.env.GRAPHQL_ENDPOINT || 'https://api.constructive.io/graphql',
  headers: {
    Authorization: `Bearer ${process.env.API_TOKEN}`,
  },
});
```

---

## Composite Fields (Unified Search)

### unifiedSearch — Multi-Strategy Filter

A single filter that fans the same text query to all text-compatible adapters (tsvector, BM25, trgm) simultaneously:

```typescript
const result = await db.article.findMany({
  where: {
    unifiedSearch: 'postgres tutorial',
  },
  select: {
    id: true,
    title: true,
    searchScore: true,  // combined 0..1 relevance across all signals
  },
}).execute();

if (result.ok) {
  result.data.articles.nodes.forEach(a => {
    console.log(`${a.title} (score: ${a.searchScore})`);
  });
}
```

pgvector is excluded from `unifiedSearch` because it requires a vector array input, not text.

### searchScore — Composite Relevance

A normalized 0..1 relevance score that combines all active search signals. Returns `null` when no search filters are active.

```typescript
const result = await db.article.findMany({
  where: {
    fullTextSearchTsv: 'postgres tutorial',
  },
  orderBy: 'SEARCH_TSV_RANK_DESC',
  select: {
    id: true,
    title: true,
    searchTsvRank: true,    // per-adapter score
    searchScore: true,      // composite: normalized 0..1
  },
}).execute();
```

The composite score normalizes each adapter's raw score to 0..1 (bounded ranges use linear normalization, unbounded use sigmoid) and averages them. Custom weights can be configured in the preset.

---

## TSVector Queries

### Basic Full-Text Search

```typescript
const result = await db.article.findMany({
  where: {
    fullTextSearchTsv: 'postgres full text',
  },
  orderBy: 'SEARCH_TSV_RANK_DESC',
  select: {
    id: true,
    title: true,
    searchTsvRank: true,
  },
}).execute();

if (result.ok) {
  result.data.articles.nodes.forEach(a => {
    console.log(`${a.title} (rank: ${a.searchTsvRank})`);
  });
}
```

### Search with Pagination

```typescript
const result = await db.article.findMany({
  where: {
    fullTextSearchTsv: 'database indexing',
  },
  orderBy: 'SEARCH_TSV_RANK_DESC',
  first: 10,
  after: cursor,
  select: {
    id: true,
    title: true,
    searchTsvRank: true,
  },
}).execute();
```

### Combining Search with Other Filters

```typescript
const result = await db.article.findMany({
  where: {
    fullTextSearchTsv: 'postgres',
    isPublished: { equalTo: true },
    category: { equalTo: 'tech' },
  },
  orderBy: 'SEARCH_TSV_RANK_DESC',
  first: 20,
  select: {
    id: true,
    title: true,
    category: true,
    searchTsvRank: true,
  },
}).execute();
```

### Field Naming Convention

| DB Column | Filter Field | Score Field | OrderBy |
|-----------|-------------|-------------|---------|
| `search_tsv` | `fullTextSearchTsv` | `searchTsvRank` | `SEARCH_TSV_RANK_ASC/DESC` |
| `body_tsv` | `fullTextBodyTsv` | `bodyTsvRank` | `BODY_TSV_RANK_ASC/DESC` |

**Pattern:**
- Filter: `fullText` + camelCase(column)
- Score: camelCase(column) + `Rank` (Float, higher = better, null when no filter active)
- OrderBy: SCREAMING_SNAKE(column) + `_RANK_ASC/DESC`

---

## BM25 Queries

### Basic BM25 Search

```typescript
const result = await db.document.findMany({
  where: {
    bm25Content: { query: 'postgres full text search' },
  },
  orderBy: 'CONTENT_BM25_SCORE_ASC',
  select: {
    id: true,
    title: true,
    contentBm25Score: true,
  },
}).execute();

if (result.ok) {
  result.data.documents.nodes.forEach(d => {
    console.log(`${d.title} (score: ${d.contentBm25Score})`);
  });
}
```

**Important:** BM25 scores are negative — more negative means more relevant. Sort ascending (`_ASC`) to get the best matches first.

### Search with Pagination

```typescript
const result = await db.document.findMany({
  where: {
    bm25Content: { query: 'machine learning' },
  },
  orderBy: 'CONTENT_BM25_SCORE_ASC',
  first: 10,
  after: cursor,
  select: {
    id: true,
    title: true,
    contentBm25Score: true,
  },
}).execute();
```

### Combining BM25 with Other Filters

```typescript
const result = await db.document.findMany({
  where: {
    bm25Content: { query: 'kubernetes deployment' },
    isPublished: { equalTo: true },
    category: { equalTo: 'devops' },
  },
  orderBy: 'CONTENT_BM25_SCORE_ASC',
  first: 20,
  select: {
    id: true,
    title: true,
    category: true,
    contentBm25Score: true,
  },
}).execute();
```

### Field Naming Convention

| DB Column | Filter Field | Score Field | OrderBy |
|-----------|-------------|-------------|---------|
| `content` | `bm25Content` | `contentBm25Score` | `CONTENT_BM25_SCORE_ASC/DESC` |
| `body` | `bm25Body` | `bodyBm25Score` | `BODY_BM25_SCORE_ASC/DESC` |

**Pattern:**
- Filter: `bm25` + CamelCase(column) — accepts `{ query: String!, threshold?: Float }`
- Score: camelCase(column) + `Bm25Score` (Float, negative, more negative = better, null when no filter active)
- OrderBy: SCREAMING_SNAKE(column) + `_BM25_SCORE_ASC/DESC`
- Without `threshold` only rows the query matches (negative score) are returned, so `totalCount` equals the number of matching rows. `threshold` is a maximum score and inclusive: a row scoring exactly the threshold is kept.

---

## Trigram Queries

### Similarity Search (via StringTrgmFilter)

On qualifying tables (those with intentional search infrastructure), string columns get `similarTo` and `wordSimilarTo` operators:

```typescript
// similarTo: overall trigram similarity
const result = await db.article.findMany({
  where: {
    title: { similarTo: { value: 'postgre', threshold: 0.2 } },
  },
  first: 20,
  select: {
    id: true,
    title: true,
    titleTrgmSimilarity: true,  // 0..1, higher = more similar
  },
}).execute();

if (result.ok) {
  result.data.articles.nodes.forEach(a => {
    console.log(`${a.title} (similarity: ${a.titleTrgmSimilarity})`);
  });
}
```

```typescript
// wordSimilarTo: best substring similarity (better for search-as-you-type)
const result = await db.article.findMany({
  where: {
    title: { wordSimilarTo: { value: 'postgres', threshold: 0.3 } },
  },
  orderBy: 'TITLE_TRGM_SIMILARITY_DESC',
  first: 10,
  select: {
    id: true,
    title: true,
    titleTrgmSimilarity: true,
  },
}).execute();
```

### Adapter-Level Filter

```typescript
const result = await db.article.findMany({
  where: {
    trgmTitle: { value: 'postgre' },
  },
  orderBy: 'TITLE_TRGM_SIMILARITY_DESC',
  select: {
    id: true,
    title: true,
    titleTrgmSimilarity: true,
  },
}).execute();
```

### ILIKE Search (GIN-Accelerated)

The GIN trigram index still accelerates `ILIKE` queries via standard filter operators:

```typescript
const result = await db.article.findMany({
  where: {
    title: { likeInsensitive: '%postgres%' },
  },
  first: 20,
  select: {
    id: true,
    title: true,
  },
}).execute();
```

### Field Naming Convention

| DB Column | Adapter Filter | Score Field | OrderBy |
|-----------|---------------|-------------|---------|
| `title` | `trgmTitle` | `titleTrgmSimilarity` | `TITLE_TRGM_SIMILARITY_ASC/DESC` |
| `name` | `trgmName` | `nameTrgmSimilarity` | `NAME_TRGM_SIMILARITY_ASC/DESC` |

**Pattern:**
- Adapter filter: `trgm` + CamelCase(column) — accepts `{ value: String, threshold?: Float }`
- Connection filter: column gets `StringTrgmFilter` with `similarTo`/`wordSimilarTo` operators
- Score: camelCase(column) + `TrgmSimilarity` (Float, 0..1, higher = better)
- OrderBy: SCREAMING_SNAKE(column) + `_TRGM_SIMILARITY_ASC/DESC`

---

## pgvector Queries

### Basic Nearest Neighbor Search

```typescript
const result = await db.document.findMany({
  where: {
    vectorEmbedding: {
      vector: queryVector,
      metric: 'COSINE',
    },
  },
  orderBy: 'EMBEDDING_VECTOR_DISTANCE_ASC',
  first: 10,
  select: {
    id: true,
    title: true,
    embeddingVectorDistance: true,
  },
}).execute();

if (result.ok) {
  result.data.documents.nodes.forEach(d => {
    console.log(`${d.title} (distance: ${d.embeddingVectorDistance})`);
  });
}
```

### Search with Distance Threshold

```typescript
const result = await db.document.findMany({
  where: {
    vectorEmbedding: {
      vector: queryVector,
      metric: 'COSINE',
      distance: 0.5,  // filter out results beyond threshold
    },
  },
  orderBy: 'EMBEDDING_VECTOR_DISTANCE_ASC',
  select: {
    id: true,
    title: true,
    embeddingVectorDistance: true,
  },
}).execute();
```

### Combining Vector Search with Other Filters

```typescript
const result = await db.document.findMany({
  where: {
    vectorEmbedding: {
      vector: queryVector,
      metric: 'COSINE',
    },
    isPublished: { equalTo: true },
    category: { equalTo: 'tech' },
  },
  orderBy: 'EMBEDDING_VECTOR_DISTANCE_ASC',
  first: 10,
  select: {
    id: true,
    title: true,
    category: true,
    embeddingVectorDistance: true,
  },
}).execute();
```

### Distance Metrics

| Metric | Range | Meaning | Sort Direction |
|--------|-------|---------|----------------|
| `COSINE` | 0 to 2 | 0 = identical, 2 = opposite | ASC = most similar |
| `L2` | 0 to infinity | 0 = identical | ASC = most similar |
| `IP` | -infinity to 0 | More negative = more similar | ASC = most similar |

### Field Naming Convention

| DB Column | Filter Field | Distance Field | OrderBy |
|-----------|-------------|----------------|---------|
| `embedding` | `vectorEmbedding` | `embeddingVectorDistance` | `EMBEDDING_VECTOR_DISTANCE_ASC/DESC` |
| `content_vec` | `vectorContentVec` | `contentVecVectorDistance` | `CONTENT_VEC_VECTOR_DISTANCE_ASC/DESC` |

**Pattern:**
- Filter: `vector` + CamelCase(column) — accepts `{ vector: [Float!]!, model?: String, metric?: String, distance?: Float, includeChunks?: Boolean }`
- Distance: camelCase(column) + `VectorDistance` (Float, lower = closer, null when no filter active)
- OrderBy: SCREAMING_SNAKE(column) + `_VECTOR_DISTANCE_ASC/DESC`

### Chunk-Aware Vector Search

Tables with the `@hasChunks` smart tag automatically get chunk-aware search. The distance returned is `LEAST(parent_distance, MIN(chunk_distance))` — the best match across the document embedding and all chunk embeddings.

Chunk search is **on by default** for `@hasChunks` tables. No extra code is needed:

```typescript
// Chunk-aware search — ON by default for @hasChunks tables
// Distance = LEAST(parent embedding distance, closest chunk distance)
const result = await db.document.findMany({
  where: {
    vectorEmbedding: {
      vector: queryVector,
      metric: 'COSINE',
      // includeChunks defaults to true when @hasChunks is present
    },
  },
  orderBy: 'EMBEDDING_VECTOR_DISTANCE_ASC',
  first: 10,
  select: {
    id: true,
    title: true,
    embeddingVectorDistance: true,   // best distance across parent + all chunks
  },
}).execute();

if (result.ok) {
  result.data.documents.nodes.forEach(d => {
    console.log(`${d.title} (distance: ${d.embeddingVectorDistance})`);
  });
}
```

### Opt Out of Chunk Search

Set `includeChunks: false` to only search the parent embedding:

```typescript
const result = await db.document.findMany({
  where: {
    vectorEmbedding: {
      vector: queryVector,
      metric: 'COSINE',
      includeChunks: false,    // only use parent embedding
    },
  },
  orderBy: 'EMBEDDING_VECTOR_DISTANCE_ASC',
  first: 10,
  select: {
    id: true,
    title: true,
    embeddingVectorDistance: true,   // parent distance only
  },
}).execute();
```

### Chunk-Aware Search with Distance Threshold

The distance threshold applies to the combined (chunk-aware) distance:

```typescript
const result = await db.document.findMany({
  where: {
    vectorEmbedding: {
      vector: queryVector,
      metric: 'COSINE',
      distance: 0.3,           // threshold applies to LEAST(parent, chunk)
    },
    isPublished: { equalTo: true },
  },
  orderBy: 'EMBEDDING_VECTOR_DISTANCE_ASC',
  first: 20,
  select: {
    id: true,
    title: true,
    embeddingVectorDistance: true,
    searchScore: true,         // composite 0..1 relevance
  },
}).execute();
```

> **Note:** `includeChunks` only appears on `VectorNearbyInput` when at least one table in the schema has the `@hasChunks` smart tag. For tables without chunks, the field is absent and vector search behaves as standard parent-only search.

---

## Multi-Strategy Patterns

### Fuzzy Fallback (BM25 + Trigram)

```typescript
// Primary: BM25 search
const bm25Result = await db.document.findMany({
  where: { bm25Content: { query: userQuery } },
  orderBy: 'CONTENT_BM25_SCORE_ASC',
  first: 10,
  select: { id: true, title: true, contentBm25Score: true },
}).execute();

const bm25Docs = bm25Result.ok ? bm25Result.data.documents.nodes : [];

// Fallback: trigram if BM25 returned few results
if (bm25Docs.length < 3) {
  const fuzzyResult = await db.document.findMany({
    where: {
      title: { similarTo: { value: userQuery, threshold: 0.15 } },
    },
    orderBy: 'TITLE_TRGM_SIMILARITY_DESC',
    first: 10,
    select: { id: true, title: true, titleTrgmSimilarity: true },
  }).execute();
}
```

### Autocomplete Pipeline (Trigram + TSVector)

```typescript
// Stage 1: Autocomplete (on every keystroke)
const autocomplete = await db.article.findMany({
  where: {
    title: { similarTo: { value: partialInput, threshold: 0.15 } },
  },
  orderBy: 'TITLE_TRGM_SIMILARITY_DESC',
  first: 5,
  select: { id: true, title: true, titleTrgmSimilarity: true },
}).execute();

// Stage 2: Full search (on form submit)
const search = await db.article.findMany({
  where: { fullTextSearchTsv: fullQuery },
  orderBy: 'SEARCH_TSV_RANK_DESC',
  first: 20,
  select: { id: true, title: true, searchTsvRank: true },
}).execute();
```

### Semantic + Keyword Hybrid (pgvector + TSVector)

```typescript
// Semantic search
const semanticResult = await db.document.findMany({
  where: { vectorEmbedding: { vector: queryEmbedding, metric: 'COSINE' } },
  orderBy: 'EMBEDDING_VECTOR_DISTANCE_ASC',
  first: 20,
  select: { id: true, title: true, embeddingVectorDistance: true },
}).execute();

// Keyword search
const keywordResult = await db.document.findMany({
  where: { fullTextSearchTsv: userQuery },
  orderBy: 'SEARCH_TSV_RANK_DESC',
  first: 20,
  select: { id: true, title: true, searchTsvRank: true },
}).execute();

// Merge by reciprocal rank fusion or custom weighting
```
