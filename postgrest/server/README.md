# @constructive-io/postgrest-server

Constructive PostgREST Server - A REST API server that uses PostgREST to expose PostgreSQL databases.

## Overview

This package provides a REST API server similar to the GraphQL server but uses PostgREST instead of PostGraphile. It follows the same patterns and middleware structure as `@constructive-io/graphql-server`.

## Features

- REST API generation from PostgreSQL schemas via PostgREST
- Authentication middleware with JWT support
- CORS handling with per-API configuration
- Schema caching with automatic invalidation
- Health check endpoint
- Database change notifications

## Usage

```typescript
import { PostgRESTServer } from '@constructive-io/postgrest-server';

PostgRESTServer({
  pg: {
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    user: 'postgres',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  api: {
    exposedSchemas: ['public'],
    anonRole: 'anonymous',
    roleName: 'authenticated',
  },
});
```

## Configuration

The server accepts the same configuration options as the GraphQL server, with additional PostgREST-specific options:

- `postgrest.maxRows` - Maximum number of rows to return per request
- `postgrest.preRequest` - SQL function to run before each request

## Headers

When `enableMetaApi` is false, use these headers to configure the API:

- `X-Schemata` - Comma-separated list of schemas to expose
- `X-Database-Id` - Database identifier
- `X-Meta-Schema` - Use meta schema configuration

## Endpoints

- `GET /healthz` - Health check
- `POST /flush` - Clear schema cache
- `/*` - PostgREST API endpoints

## License

MIT
