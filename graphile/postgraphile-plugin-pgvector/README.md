# postgraphile-plugin-pgvector

PostGraphile v5 plugin for pgvector similarity search, enabling vector-based queries in your GraphQL API.

## Features

- **Vector Similarity Search**: Query your data by vector similarity using pgvector
- **Multiple Distance Metrics**: Support for COSINE, L2 (Euclidean), and IP (Inner Product) metrics
- **Configurable Collections**: Define multiple vector search endpoints for different tables
- **Pagination**: Built-in support for limit and offset parameters

## Installation

```bash
pnpm add postgraphile-plugin-pgvector
```

## Prerequisites

- PostgreSQL with pgvector extension installed
- PostGraphile v5

## Usage

```typescript
import { PgVectorPreset } from 'postgraphile-plugin-pgvector';

const preset = {
  extends: [
    ConstructivePreset,
    PgVectorPreset({
      collections: [{
        schema: 'public',
        table: 'documents',
        embeddingColumn: 'embedding',
        graphqlFieldName: 'vectorSearchDocument',
      }],
      defaultMetric: 'COSINE',
      maxLimit: 100,
    }),
  ],
};
```

## GraphQL Query Example

```graphql
query {
  vectorSearchDocument(query: [0.1, 0.2, 0.3], limit: 10, metric: COSINE) {
    id
    title
    distance
  }
}
```

## License

MIT
