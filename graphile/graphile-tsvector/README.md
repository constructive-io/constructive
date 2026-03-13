# graphile-tsvector

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
  <a href="https://www.npmjs.com/package/graphile-tsvector">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-tsvector%2Fpackage.json"/>
  </a>
</p>

**`graphile-tsvector`** enables auto-generated full-text search condition fields for all `tsvector` columns in PostGraphile v5 schemas.

## Installation

```sh
npm install graphile-tsvector
```

## Features

- Adds full-text search condition fields for `tsvector` columns
- Uses `websearch_to_tsquery` for natural search syntax
- Automatic `ORDER BY ts_rank(column, tsquery) DESC` relevance ordering (matching V4 behavior)
- Cursor-based pagination remains stable — PostGraphile re-appends unique key columns after the relevance sort
- Works with PostGraphile v5 preset/plugin pipeline

## Usage

### With Preset (Recommended)

```typescript
import { PgSearchPreset } from 'graphile-tsvector';

const preset = {
  extends: [
    // ... your other presets
    PgSearchPreset({ pgSearchPrefix: 'fullText' }),
  ],
};
```

### With Plugin Directly

```typescript
import { PgSearchPlugin } from 'graphile-tsvector';

const preset = {
  plugins: [
    PgSearchPlugin({ pgSearchPrefix: 'fullText' }),
  ],
};
```

### GraphQL Query

```graphql
query SearchGoals($search: String!) {
  goals(filter: { fullTextTsv: $search }) {
    nodes {
      id
      title
      description
    }
  }
}
```

## Testing

```sh
# requires a local Postgres available (defaults to postgres/password@localhost:5432)
pnpm --filter graphile-tsvector test
```
