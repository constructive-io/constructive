# graphile-pg-textsearch-plugin

PostGraphile v5 plugin for pg_textsearch BM25 ranked full-text search.

Auto-discovers BM25 indexes and adds search condition, score, orderBy, and filter fields — zero configuration needed.

## Usage

```typescript
import { Bm25SearchPreset } from "graphile-pg-textsearch-plugin";

const preset = {
  extends: [Bm25SearchPreset()],
};
```

## Features

- **Auto-discovery**: Finds all text columns with BM25 indexes automatically
- **Condition fields**: `bm25<Column>` condition inputs for BM25 ranked search
- **Score fields**: `bm25<Column>Score` computed fields returning BM25 relevance scores
- **OrderBy**: `BM25_<COLUMN>_SCORE_ASC/DESC` enum values for sorting by relevance
- **Connection filter**: `bm25Matches` operator for postgraphile-plugin-connection-filter

## Requirements

- PostgreSQL with [pg_textsearch](https://github.com/timescale/pg_textsearch) extension installed
- PostGraphile v5 (rc.5+)

