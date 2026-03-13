# graphile-pgvector

PostGraphile v5 codec plugin for [pgvector](https://github.com/pgvector/pgvector) — makes `vector` columns, mutations, and SQL functions work automatically.

## How it works

This plugin registers a **codec** for the pgvector `vector` type. Without it, PostGraphile silently ignores `vector(n)` columns and skips SQL functions that accept `vector` arguments.

Once installed:

- `vector(n)` columns appear on GraphQL output types
- `vector(n)` columns appear in `create` / `update` mutation inputs
- SQL functions with `vector` arguments are exposed as query/mutation fields
- A `Vector` GraphQL scalar handles serialization (`[Float]`)

## Installation

```bash
pnpm add graphile-pgvector
```

## Prerequisites

- PostgreSQL with pgvector extension installed
- PostGraphile v5

## Usage

```typescript
import { VectorCodecPreset } from 'graphile-pgvector';

const preset = {
  extends: [
    // ...other presets
    VectorCodecPreset,
  ],
};
```

Zero configuration required. Any table with a `vector` column just works.

## GraphQL Examples

```graphql
# Vector columns appear on types automatically
query {
  contacts {
    nodes {
      id
      name
      embedding
    }
  }
}

# SQL functions with vector args are auto-exposed
query {
  searchContacts(queryEmbedding: [0.1, 0.2, 0.3]) {
    nodes {
      id
      name
    }
  }
}

# Mutations include vector columns
mutation {
  createContact(input: { name: "Test", embedding: [0.1, 0.2, 0.3] }) {
    contact {
      id
      embedding
    }
  }
}
```

## License

MIT
