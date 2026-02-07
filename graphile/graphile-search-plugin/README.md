# graphile-search-plugin

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
  <a href="https://www.npmjs.com/package/graphile-search-plugin">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-search-plugin%2Fpackage.json"/>
  </a>
</p>

**`graphile-search-plugin`** enables auto-generated full-text search condition fields for all `tsvector` columns in PostGraphile v5 schemas.

## Installation

```sh
npm install graphile-search-plugin
```

## Features

- Adds full-text search condition fields for `tsvector` columns
- Uses `websearch_to_tsquery` for natural search syntax
- Works with PostGraphile v5 preset/plugin pipeline

## Usage

### With Preset (Recommended)

```typescript
import { PgSearchPreset } from 'graphile-search-plugin';

const preset = {
  extends: [
    // ... your other presets
    PgSearchPreset({ pgSearchPrefix: 'fullText' }),
  ],
};
```

### With Plugin Directly

```typescript
import { PgSearchPlugin } from 'graphile-search-plugin';

const preset = {
  plugins: [
    PgSearchPlugin({ pgSearchPrefix: 'fullText' }),
  ],
};
```

### GraphQL Query

```graphql
query SearchGoals($search: String!) {
  goals(condition: { fullTextTsv: $search }) {
    nodes {
      id
      title
      description
    }
  }
}
```

## Known Limitations

**ORDER BY ts_rank**: The V4 version of this plugin automatically added `ORDER BY ts_rank(...)` for relevance-based ordering. In V5, the condition system only supports WHERE clause injection. Relevance ordering is not automatically applied. To achieve relevance ordering, consider:

1. Adding a custom `orderBy` enum value via a separate plugin
2. Using a dedicated search query field (similar to pgvector's approach)

## Testing

```sh
# requires a local Postgres available (defaults to postgres/password@localhost:5432)
pnpm --filter graphile-search-plugin test
```
