# graphile-search

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/graphile-search"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-search%2Fpackage.json"/></a>
</p>

Unified PostGraphile v5 search plugin — abstracts tsvector, BM25, pg_trgm, and pgvector behind a single adapter-based architecture with composite `searchScore`.

## Overview

Instead of separate plugins per algorithm, `graphile-search` uses an **adapter pattern** where each search algorithm (tsvector, BM25, pg_trgm, pgvector) implements a ~50-line adapter. A single core plugin iterates all adapters and wires them into the Graphile v5 hook system.

## Usage

```typescript
import { UnifiedSearchPreset } from 'graphile-search';

const preset = {
  extends: [
    UnifiedSearchPreset(),
  ],
};
```

### Custom configuration

```typescript
import { UnifiedSearchPreset } from 'graphile-search';

const preset = {
  extends: [
    UnifiedSearchPreset({
      tsvector: { filterPrefix: 'fullText', tsConfig: 'english' },
      bm25: true,
      trgm: { defaultThreshold: 0.2 },
      pgvector: { defaultMetric: 'COSINE' },
      searchScoreWeights: { bm25: 0.5, trgm: 0.3, tsv: 0.2 },
    }),
  ],
};
```

## Features

- **4 search algorithms** via adapters: tsvector (ts_rank), BM25 (pg_textsearch), pg_trgm (similarity), pgvector (distance)
- **Per-algorithm score fields**: `{column}{Algorithm}{Metric}` (e.g. `bodyBm25Score`, `titleTrgmSimilarity`)
- **Composite `searchScore`**: Normalized 0..1 aggregating all active search signals
- **OrderBy enums**: `{COLUMN}_{ALGORITHM}_{METRIC}_ASC/DESC` + `SEARCH_SCORE_ASC/DESC`
- **Filter fields**: `{algorithm}{Column}` on connection filter input types
- **Hybrid search**: Combine multiple algorithms in a single query
- **Zero config**: Auto-discovers columns and indexes per adapter

## Architecture

```
┌─────────────────────────────────────┐
│        Unified Search Plugin        │
│  (iterates adapters, wires hooks)   │
├─────────────────────────────────────┤
│ Adapter: tsvector  │ Adapter: bm25  │
│ Adapter: trgm      │ Adapter: vector│
└─────────────────────────────────────┘
```

Each adapter implements the `SearchAdapter` interface:
- `detectColumns()` — discover eligible columns on a table
- `registerTypes()` — register custom GraphQL input types
- `getFilterTypeName()` — return the filter input type name
- `buildFilterApply()` — generate WHERE + score SQL fragments
