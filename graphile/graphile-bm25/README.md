# graphile-bm25

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
  <a href="https://www.npmjs.com/package/graphile-bm25">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-bm25%2Fpackage.json"/>
  </a>
</p>

**`graphile-bm25`** enables auto-discovered BM25 ranked full-text search for PostGraphile v5 schemas using [pg_textsearch](https://github.com/timescale/pg_textsearch).

## Installation

```sh
npm install graphile-bm25
```

## Features

- **Auto-discovery**: Finds all text columns with BM25 indexes automatically — zero configuration
- **Condition fields**: `bm25<Column>` condition inputs accepting `{ query, threshold? }` for BM25 ranked search
- **Score fields**: `bm25<Column>Score` computed fields returning BM25 relevance scores (negative values, more negative = more relevant)
- **OrderBy**: `BM25_<COLUMN>_SCORE_ASC/DESC` enum values for sorting by relevance
- Works with PostGraphile v5 preset/plugin pipeline

## Usage

### With Preset (Recommended)

```typescript
import { Bm25SearchPreset } from 'graphile-bm25';

const preset = {
  extends: [
    // ... your other presets
    Bm25SearchPreset(),
  ],
};
```

### With Plugin Directly

```typescript
import { Bm25CodecPlugin, Bm25SearchPlugin } from 'graphile-bm25';

const preset = {
  plugins: [
    Bm25CodecPlugin,
    Bm25SearchPlugin(),
  ],
};
```

### GraphQL Query

```graphql
query SearchArticles($search: Bm25SearchInput!) {
  articles(condition: { bm25Body: $search }) {
    nodes {
      id
      title
      body
      bm25BodyScore
    }
  }
}
```

Variables:

```json
{
  "search": {
    "query": "postgres full text search",
    "threshold": -0.5
  }
}
```

### OrderBy

```graphql
query SearchArticlesSorted($search: Bm25SearchInput!) {
  articles(
    condition: { bm25Body: $search }
    orderBy: BM25_BODY_SCORE_ASC
  ) {
    nodes {
      id
      title
      bm25BodyScore
    }
  }
}
```

## Requirements

- PostgreSQL with [pg_textsearch](https://github.com/timescale/pg_textsearch) extension installed
- PostGraphile v5 (rc.5+)
- A BM25 index on the text column(s) you want to search:

```sql
CREATE INDEX articles_body_idx ON articles USING bm25(body)
  WITH (text_config='english');
```

## Testing

```sh
# requires pyramation/postgres:17 Docker image with pg_textsearch pre-installed
pnpm --filter graphile-bm25 test
```

