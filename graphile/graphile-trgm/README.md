# graphile-trgm

PostGraphile v5 plugin for **pg_trgm** fuzzy text matching.

Adds `similarTo` and `wordSimilarTo` filter operators to text columns, with similarity score computed fields and orderBy support. Tolerates typos and misspellings using PostgreSQL's trigram matching.

## Features

- **`similarTo`** — fuzzy match using `similarity()` (whole-string comparison)
- **`wordSimilarTo`** — fuzzy match using `word_similarity()` (best substring match)
- **`<column>Similarity`** — computed score field (0–1, null when no trgm filter active)
- **`SIMILARITY_<COLUMN>_ASC/DESC`** — orderBy enum values for ranking by similarity
- **Zero config** — works on any text/varchar column out of the box
- **Optional index safety** — `connectionFilterTrgmRequireIndex: true` restricts to GIN-indexed columns

## Usage

```typescript
import { TrgmSearchPreset } from 'graphile-trgm';

const preset = {
  extends: [TrgmSearchPreset()],
};
```

```graphql
query {
  locations(filter: {
    name: { similarTo: { value: "cenral prk", threshold: 0.3 } }
  }) {
    nodes {
      name
      nameTrgmSimilarity
    }
  }
}
```

## Requirements

- PostgreSQL with `pg_trgm` extension enabled
- PostGraphile v5 (rc.5+)
- `graphile-connection-filter` (workspace dependency)
