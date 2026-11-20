# BM25 Adapter

Relevance-ranked search using BM25 scoring via the `pg_textsearch` extension. Best for document search where ranking quality matters.

## How It Works

The BM25 adapter:
1. **Gathers** BM25 index information during the Graphile gather phase (via `Bm25CodecPlugin`)
2. **Detects** text columns that have a BM25 index (stored in the `bm25IndexStore`)
3. **Registers** a `Bm25SearchInput` type (`{ query: String!, threshold: Float }`)
4. **Generates** BM25 score as a computed field and orderBy enum

## Adapter Configuration

```typescript
import { createBm25Adapter } from 'graphile-search';

createBm25Adapter({
  filterPrefix: 'bm25',  // default: 'bm25'
})
```

## Generated GraphQL

Given a table with a BM25 index on the `content` column:

### Filter

```graphql
query {
  allDocuments(where: { bm25Content: { query: "database indexing" } }) {
    nodes {
      title
      contentBm25Score
    }
  }
}
```

### Score Field

```graphql
type Document {
  contentBm25Score: Float  # BM25 score (negative, more negative = more relevant)
}
```

### OrderBy

```graphql
enum DocumentsOrderBy {
  CONTENT_BM25_SCORE_ASC   # most relevant first (most negative)
  CONTENT_BM25_SCORE_DESC  # least relevant first
}
```

## Filter Semantics

- A BM25 score is negative for a row the query matches and `0` for a row it does not. The filter keeps negative scores only, so without `threshold` the connection holds exactly the matching rows and `totalCount` equals that count (with or without a BM25 `orderBy`, and through `unifiedSearch`).
- `threshold` is a maximum score and inclusive: `{ query, threshold: -1.5 }` keeps rows scoring `<= -1.5`; a row scoring exactly the threshold is kept.
- `CONTENT_BM25_SCORE_ASC/DESC` requires `bm25Content` (or `unifiedSearch`) in `where`; without it the query errors and names the filter to add. This check also applies when `orderBy` is passed as a variable, and a variable `orderBy` keeps the requested order of a composite list.

## Score Semantics

| Property | Value |
|----------|-------|
| Metric | `score` |
| Lower is better | Yes (more negative = more relevant) |
| Range | Unbounded (uses sigmoid normalization in searchScore) |

## Adapter Flags

| Flag | Value |
|------|-------|
| `isSupplementary` | `false` (primary adapter) |
| `isIntentionalSearch` | `true` (triggers supplementary adapters like trgm) |
| `supportsTextSearch` | `true` (included in unifiedSearch composite filter) |

## Prerequisites

- `pg_textsearch` extension enabled (pre-enabled in Constructive stack)
- A BM25 index on a text column (`CREATE INDEX ... USING bm25 ...`)
- `Bm25CodecPlugin` loaded (included automatically by `UnifiedSearchPreset`)

## Index Discovery

The adapter reads from `bm25IndexStore`, which is populated during the Graphile gather phase by `Bm25CodecPlugin`. The gather hook introspects `pg_am` and `pg_class` to find indexes with access method `bm25`, then maps them back to table columns.
