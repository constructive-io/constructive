---
name: graphile-search
description: Unified PostGraphile v5 search plugin (graphile-search). Consolidates tsvector, BM25, pg_trgm, and pgvector into a single adapter-based architecture with composite searchScore and unifiedSearch fields. Includes codegen SDK query patterns for all search types. Use when asked to "add search to GraphQL", "expose search in PostGraphile", "configure search adapters", "query search via SDK/codegen", or when building search features on a Constructive or PostGraphile v5 stack.
compatibility: PostGraphile v5, graphile-search, graphile-build-pg, graphile-connection-filter
metadata:
  author: constructive-io
  version: "1.0.0"
---

# Graphile Search — Unified Search Plugin

A single PostGraphile v5 plugin that consolidates tsvector full-text search, BM25 ranked search, pg_trgm fuzzy matching, and pgvector similarity search behind a pluggable adapter architecture.

**Package:** `graphile-search` ([npm](https://www.npmjs.com/package/graphile-search))

## When to Apply

Use this skill when:
- Adding search capabilities to a PostGraphile v5 / Constructive GraphQL API
- Configuring which search adapters are active
- Understanding how search fields, filters, and scores appear in the GraphQL schema
- Querying search-enabled tables via the generated SDK (after codegen)
- Debugging missing search fields or unexpected trgm behavior
- Building hybrid search combining multiple algorithms

## Architecture Overview

Instead of separate plugins per algorithm, `graphile-search` uses a single `UnifiedSearchPlugin` with pluggable **adapters**:

```
UnifiedSearchPlugin
  ├── TsvectorAdapter     (keyword search with stemming)
  ├── Bm25Adapter         (relevance-ranked document search)
  ├── TrgmAdapter         (fuzzy matching, typo tolerance)
  └── PgvectorAdapter     (semantic/embedding similarity + chunk-aware RAG)
```

The pgvector adapter also supports **chunk-aware search** via the `@hasChunks` smart tag — transparently querying across parent and chunk embeddings and returning the minimum distance. See `references/pgvector-adapter.md` for details.

Each adapter implements the `SearchAdapter` interface:
- **`detectColumns()`** — finds searchable columns on a table (e.g. tsvector columns, columns with BM25 indexes)
- **`registerTypes()`** — registers any custom GraphQL types (e.g. filter input types)
- **`applyFilter()`** — generates the SQL WHERE clause when a filter is used
- **`scoreSemantics`** — declares metric name, direction, and range bounds for score normalization

The plugin also ships codec plugins that teach PostGraphile about custom types: `TsvectorCodecPlugin`, `Bm25CodecPlugin`, `VectorCodecPlugin`.

## Quick Start

```typescript
import { UnifiedSearchPreset } from 'graphile-search';

const preset: GraphileConfig.Preset = {
  extends: [
    // ... your other presets
    UnifiedSearchPreset(),  // all 4 adapters enabled by default
  ],
};
```

This single preset includes:
- All 4 adapter plugins (tsvector, BM25, trgm, pgvector)
- Codec plugins (TsvectorCodecPlugin, Bm25CodecPlugin, VectorCodecPlugin)
- Connection filter operator factories (matches, similarTo, wordSimilarTo)
- Composite `searchScore` and `unifiedSearch` fields

## Preset Options

```typescript
UnifiedSearchPreset({
  // Enable/disable individual adapters (all default to true)
  tsvector: true,                    // or { filterPrefix: 'fullText', tsConfig: 'english' }
  bm25: true,                       // or { filterPrefix: 'bm25' }
  trgm: true,                       // or { defaultThreshold: 0.2, filterPrefix: 'trgm' }
  pgvector: true,                   // or { defaultMetric: 'L2', filterPrefix: 'vector' }

  // Composite fields
  enableSearchScore: true,           // expose searchScore (0..1) on search-enabled tables
  enableUnifiedSearch: true,          // expose unifiedSearch composite filter

  // Weights for composite searchScore (used in weighted RRF contributions)
  searchScoreWeights: {
    tsv: 0.3,
    bm25: 0.4,
    trgm: 0.2,
    vector: 0.1,
  },

  // RRF smoothing constant (higher = more democratic across ranks, default 60)
  rrfK: 60,

  // Scalar naming
  fullTextScalarName: 'FullText',    // GraphQL scalar name for tsvector columns
  tsConfig: 'english',              // PostgreSQL text search configuration
})
```

## What Gets Generated in GraphQL

When the plugin detects search infrastructure on a table, it adds:

### Per-Adapter Score Fields (on row types)

| Adapter | Example Field | Type | Description |
|---------|--------------|------|-------------|
| tsvector | `searchTsvRank` | `Float` | ts_rank score (0..1, higher = better) |
| BM25 | `bodyBm25Score` | `Float` | BM25 relevance score (negative, more negative = better) |
| trgm | `titleTrgmSimilarity` | `Float` | Trigram similarity (0..1, higher = better) |
| pgvector | `embeddingVectorDistance` | `Float` | Vector distance (0..inf, lower = closer) |

**Naming pattern:** `{camelCase(column)}{Algorithm}{Metric}`

### Composite searchScore Field

```graphql
type Article {
  # ... regular fields
  searchScore: Float  # Normalized 0..1, higher = more relevant
}
```

Computed via **Reciprocal Rank Fusion (RRF)**: each active adapter ranks its results independently, then `searchScore = Σ(weight_i / (rrfK + rank_i)) / max_possible`. Returns `null` when no search filters are active. Always in [0, 1] with 1.0 = ranked #1 by every active adapter.

### Per-Adapter Filter Fields (on connection filters)

| Adapter | Filter Field | Input Type |
|---------|-------------|------------|
| tsvector | `fullTextSearchTsv` | `String` (search query) |
| BM25 | `bm25Body` | `Bm25SearchInput` (`{ query, indexName }`) |
| trgm | `trgmTitle` | `TrgmSearchInput` (`{ value, threshold? }`) |
| pgvector | `vectorEmbedding` | `VectorSearchInput` (`{ query: [Float!]!, metric? }`) |

**Naming pattern:** `{filterPrefix}{CamelCase(column)}`

### unifiedSearch Composite Filter

Fans out a single text query to all text-compatible adapters (tsvector, BM25, trgm) simultaneously, combining with OR:

```graphql
query {
  allArticles(where: { unifiedSearch: "postgres tutorial" }) {
    nodes {
      title
      searchScore  # composite relevance across all text search signals
    }
  }
}
```

### OrderBy Enum Values

Each adapter adds ASC/DESC ordering for its score metric:

```graphql
enum ArticlesOrderBy {
  SEARCH_TSV_RANK_ASC
  SEARCH_TSV_RANK_DESC
  BODY_BM25_SCORE_ASC
  BODY_BM25_SCORE_DESC
  # ... etc
}
```

### StringTrgmFilter Type

For tables that qualify for trgm (see "Trgm Scoping" below), string columns get a `StringTrgmFilter` type instead of the regular `StringFilter`. This adds two operators:

```graphql
input StringTrgmFilter {
  # ... all standard StringFilter operators (equalTo, includes, etc.)
  similarTo: TrgmSearchInput       # pg_trgm similarity()
  wordSimilarTo: TrgmSearchInput   # pg_trgm word_similarity()
}

input TrgmSearchInput {
  value: String!
  threshold: Float  # default 0.3
}
```

## Trgm Scoping — Supplementary Adapter Pattern

Trgm doesn't activate on every table with text columns. It uses a **supplementary adapter** pattern:

1. **Primary adapters** (tsvector, BM25, pgvector) run first and detect columns on each table
2. **Supplementary adapters** (trgm) only run if at least one adapter with `isIntentionalSearch: true` found columns on that table
3. pgvector sets `isIntentionalSearch: false` — embeddings alone don't trigger trgm
4. Only tsvector and BM25 count as "intentional search" and trigger trgm activation

This means:
- Table with tsvector column → trgm activates on its text columns
- Table with BM25 index → trgm activates on its text columns
- Table with only pgvector → trgm does NOT activate
- Table with no search infrastructure → trgm does NOT activate

### Opt-in via @trgmSearch Smart Tag

To force trgm on a table that has no intentional search (or only pgvector), use the `@trgmSearch` smart tag:

```sql
-- Table-level: enable trgm on all text columns
COMMENT ON TABLE app_public.contacts IS E'@trgmSearch';

-- Column-level: enable trgm on specific columns
COMMENT ON COLUMN app_public.contacts.name IS E'@trgmSearch';
```

## Adapter Details

Each adapter is documented in its own reference file:

- `references/tsvector-adapter.md` — tsvector full-text search adapter
- `references/bm25-adapter.md` — BM25 ranked search adapter
- `references/trgm-adapter.md` — pg_trgm fuzzy matching adapter
- `references/pgvector-adapter.md` — pgvector similarity search adapter
- `references/search-adapter-interface.md` — SearchAdapter interface specification

## Querying Search via Codegen SDK

After running `cnc codegen`, the generated SDK client exposes search filters, score fields, and orderBy enums. See `references/codegen-sdk-queries.md` for complete query patterns covering:

- **Composite fields** — `unifiedSearch` (multi-strategy filter) and `searchScore` (0..1 relevance)
- **TSVector queries** — `fullTextSearchTsv`, `searchTsvRank`, pagination, combined filters
- **BM25 queries** — `bm25Content`, `bm25ContentScore` (negative, sort ASC)
- **Trigram queries** — `similarTo`/`wordSimilarTo` via `StringTrgmFilter`, adapter-level `trgmTitle`, ILIKE
- **pgvector queries** — `vectorEmbedding`, `embeddingDistance`, distance metrics (COSINE/L2/IP)
- **Chunk-aware search** — `includeChunks` toggle for RAG tables with `@hasChunks`, transparent parent + chunk distance
- **Multi-strategy patterns** — fuzzy fallback, autocomplete pipeline, semantic + keyword hybrid

## Score Semantics & RRF Fusion

Each adapter declares how its scores behave:

| Adapter | Metric | Lower is Better? | Range |
|---------|--------|-------------------|-------|
| tsvector | `rank` | No (higher = better) | [0, 1] |
| BM25 | `score` | Yes (more negative = better) | Unbounded |
| trgm | `similarity` | No (higher = better) | [0, 1] |
| pgvector | `distance` | Yes (closer = better) | Unbounded |

**Composite `searchScore` uses Reciprocal Rank Fusion (RRF)** — not score normalization. Each adapter's results are ranked by `ROW_NUMBER()` window functions in SQL, and the composite score is:

```
searchScore = Σ(weight_i / (rrfK + rank_i)) / Σ(weight_i / (rrfK + 1))
```

This avoids the problem of BM25/pgvector producing unbounded scores that can't be meaningfully normalized. RRF only uses rank positions, making cross-algorithm fusion fair regardless of score scale.

- `rrfK` (default 60) controls how much top-ranked items dominate. Lower values amplify rank-1 advantage.
- `weights` from `@searchConfig` scale each adapter's RRF contribution (weighted RRF).
- `boost_recent` / `boost_recency_decay` apply exponential decay as a post-RRF multiplier.

## Common Pitfalls

| Issue | Cause | Fix |
|---|---|---|
| No search fields on table | No search infrastructure detected | Add tsvector column, BM25 index, or vector column |
| trgm operators missing | Table has no intentional search | Add tsvector/BM25, or use `@trgmSearch` smart tag |
| `searchScore` is null | No search filters active in query | Add a search filter (unifiedSearch, bm25Body, etc.) |
| `includeChunks` field missing | No `@hasChunks` tables in schema | Add `@hasChunks` smart tag to parent table codec |
| `Unknown type "FullText"` | TsvectorCodecPlugin not loaded | Use `UnifiedSearchPreset()` which includes all codecs |
| `Unknown type "Vector"` | VectorCodecPlugin not loaded | Use `UnifiedSearchPreset()` which includes all codecs |
| Duplicate type errors | Multiple search presets | Use only `UnifiedSearchPreset()`, not individual presets |

## Related Skills

- `constructive-db-search` (private) — SQL-level search strategies and metaschema integration
- `constructive-graphql-codegen` — code generation from search-enabled schemas
