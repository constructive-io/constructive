# Constructive

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
</p>

**Constructive** is a complete ecosystem for modular PostgreSQL development. Design your database schema, manage it with our package manager, and get a production-ready GraphQL API automatically. Build composable database modules, version them like npm packages, and deploy with confidence.

## 🚀 Quick Start

### Install & Setup

```bash
# Install pgpm globally
npm install -g pgpm

# Start local Postgres (via Docker) and export env vars
pgpm docker start
eval "$(pgpm env)"
```

> **Tip:** Already running Postgres? Skip the Docker step and just export your PG* vars.

---

### Create a Workspace and Install a Package

```bash
# 1. Create a workspace
pgpm init workspace
cd my-app

# 2. Create your first module
pgpm init
cd packages/your-module

# 3. Install a package
pgpm install @pgpm/faker

# 4. Deploy everything
pgpm deploy --createdb --database mydb1
psql -d mydb1 -c "SELECT faker.city('MI');"
>  Ann Arbor
```

### Starting a New Project and Adding a Change

```bash
# 1. Create workspace
pgpm init workspace
cd my-app

# 2. Create your first module
pgpm init
cd packages/new-module

# 3. Add some SQL migrations to sql/ directory
pgpm add some_change

# 4. Deploy to database
pgpm deploy --createdb
```

### Testing a pgpm module in a workspace

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Enter the packages/<yourmodule>
cd packages/yourmodule

# 3. Test the module in watch mode
pnpm test:watch
```


## What is Constructive?

Constructive transforms how you build PostgreSQL applications by treating your database as a modular, version-controlled system. At its core is **pgpm** (PostgreSQL Package Manager), which brings npm-style package management to Postgres. Write SQL migrations, organize them into reusable modules, install database packages as dependencies, and deploy with deterministic, plan-driven migrations.

The framework automatically generates a secure, role-aware GraphQL API from your PostgreSQL schema using PostGraphile. This means you design your database once, and Constructive handles the API layer, authentication middleware, and developer tooling.

### Core Philosophy

Constructive embraces a database-first development approach where your PostgreSQL schema is the source of truth. Row-Level Security (RLS) policies become your authorization layer, database functions become your business logic, and the GraphQL API is automatically derived from your carefully designed schema. This eliminates the impedance mismatch between your database and API while giving you the full power of SQL.

## Key Components

### 📦 pgpm - PostgreSQL Package Manager

The heart of Constructive's modular approach. pgpm manages database schemas as versioned packages with dependency resolution, migration tracking, and reproducible deployments.

**Features:**
- Reusable database modules with dependency management
- Deterministic, plan-driven migrations with rollback support
- Tag-based versioning for coordinated releases
- Recursive module resolution across workspaces
- Export migrations from existing databases

**Learn more:** [pgpm documentation](https://github.com/constructive-io/constructive/tree/main/pgpm/pgpm)

### 🖥️ Constructive CLI

Full-featured command-line toolkit for managing Constructive projects. Provides the complete development workflow from scaffolding to deployment.

**Features:**
- Database-first development with automatic GraphQL generation
- Hot-reload development server with GraphiQL explorer
- Module scaffolding and workspace management
- Production deployment with versioning and rollback
- Built-in security with role-based access control

**Learn more:** [@constructive-io/cli documentation](https://github.com/constructive-io/constructive/tree/main/packages/cli)

### ⚡ GraphQL API Server

Express-based server powered by PostGraphile that automatically exposes your PostgreSQL database as a secure, scalable GraphQL API.

**Features:**
- Automatic API generation from database schema
- Row-Level Security (RLS) integration
- JWT authentication middleware
- File upload streaming to S3
- Dynamic API configuration from meta-schema
- PostGIS, full-text search, and advanced filtering

**Learn more:** [@constructive-io/graphql-server documentation](https://github.com/constructive-io/constructive/tree/main/graphql/server)

## Common Workflows

### Development

```bash
# Run linting across all packages
pnpm lint

# Run linting for a specific package
cd packages/cli
pnpm lint

# Build all packages
pnpm build

# Clean build artifacts
pnpm clean
```

### Starting a New Project

```bash
# Create workspace with pgpm
pgpm init workspace
cd my-app

# Create your first module
pgpm init

# Add database changes
pgpm add schema/app
pgpm add tables/users
pgpm add functions/authenticate

# Deploy to database
pgpm deploy --createdb
```

### Installing Database Packages

```bash
# Install reusable database modules
pgpm install @pgpm/base32
pgpm install @pgpm/faker

# Deploy with dependencies
pgpm deploy
```

### Production Deployment

```bash
# Tag a release
pgpm tag v1.0.0 --comment "Initial release"

# Generate deployment plan
pgpm plan

# Deploy to production
pgpm deploy --to @v1.0.0

# Verify deployment
pgpm verify
```

### Testing Your Application

```ts
import { getConnections } from 'pgsql-test';

let db, teardown;

beforeAll(async () => {
  ({ db, teardown } = await getConnections());
});

beforeEach(() => db.beforeEach());
afterEach(() => db.afterEach());
afterAll(() => teardown());

test('user authentication', async () => {
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': '123' });
  const result = await db.query('SELECT current_user_id()');
  expect(result.rows[0].current_user_id).toBe('123');
});
```

## Why Constructive?

**Modular by Design** - Organize your database into reusable packages with clear dependencies. Share common schemas across projects, version them independently, and compose complex systems from simple building blocks.

**Database-First Development** - Your PostgreSQL schema is the source of truth. Design your data model with the full power of SQL, leverage Row-Level Security for authorization, and let Constructive generate your API automatically.

**Production-Ready** - Built for teams shipping real applications. Deterministic migrations, comprehensive testing tools, automatic API generation, and deployment automation mean you can move fast without breaking things.

**Developer Experience** - Hot-reload development server, GraphiQL explorer, automatic TypeScript types, and comprehensive testing utilities make building PostgreSQL applications a joy.

## Architecture

Constructive applications follow a clear architecture:

1. **Database Layer** - PostgreSQL schemas with tables, functions, views, and RLS policies organized into modules
2. **Migration Layer** - pgpm manages schema changes with version-controlled, plan-driven deployments
3. **API Layer** - PostGraphile automatically generates a GraphQL API respecting your RLS policies
4. **Client Layer** - Auto-generated TypeScript types and query builders for type-safe client development

This architecture eliminates the traditional ORM layer and API boilerplate, letting you focus on your data model and business logic.

## Complete Package Reference

### 📦 Package Management & Migrations

- **[pgpm](https://github.com/constructive-io/constructive/tree/main/pgpm/pgpm)** - PostgreSQL Package Manager for modular database development with npm-style dependency management
- **[@constructive-io/cli](https://github.com/constructive-io/constructive/tree/main/packages/cli)** - Full-featured command-line toolkit for Constructive projects with scaffolding, migrations, and deployment
- **[@pgpmjs/core](https://github.com/constructive-io/constructive/tree/main/pgpm/core)** - Core migration engine with module orchestration and dependency resolution

### 🚀 GraphQL API & Server

- **[@constructive-io/graphql-server](https://github.com/constructive-io/constructive/tree/main/graphql/server)** - Express-based API server powered by PostGraphile with RLS integration, JWT auth, and meta API routing
- **[@constructive-io/graphql-explorer](https://github.com/constructive-io/constructive/tree/main/graphql/explorer)** - GraphiQL interface for exploring your auto-generated GraphQL API
- **[graphile-settings](https://github.com/constructive-io/constructive/tree/main/graphile/graphile-settings)** - Centralized PostGraphile plugin configuration with connection filters, PostGIS, and full-text search

### 🧪 Testing & Quality Assurance

- **[pgsql-test](https://github.com/constructive-io/constructive/tree/main/postgres/pgsql-test)** - Isolated PostgreSQL test environments with per-test transaction rollbacks and RLS simulation
- **[pgsql-seed](https://github.com/constructive-io/constructive/tree/main/postgres/pgsql-seed)** - PostgreSQL seeding utilities for CSV, JSON, SQL data loading, and pgpm deployment
- **[drizzle-orm-test](https://github.com/constructive-io/constructive/tree/main/postgres/drizzle-orm-test)** - Drop-in pgsql-test replacement for Drizzle ORM with context management and RLS testing
- **[graphile-test](https://github.com/constructive-io/constructive/tree/main/graphile/graphile-test)** - GraphQL testing utilities for PostGraphile projects with snapshot support
- **[supabase-test](https://github.com/constructive-io/constructive/tree/main/postgres/supabase-test)** - Supabase-optimized test harness with JWT helpers and local stack integration
- **[pg-query-context](https://github.com/constructive-io/constructive/tree/main/postgres/pg-query-context)** - Session context injection for setting role, JWT claims, and session variables

### 🧠 Code Generation & Introspection

- **[introspectron](https://github.com/constructive-io/constructive/tree/main/postgres/introspectron)** - PostgreSQL schema introspection for generating SDKs and metadata
- **[@constructive-io/graphql-codegen](https://github.com/constructive-io/constructive/tree/main/graphql/codegen)** - GraphQL code generation (types, operations, SDK) from schema/endpoint
- **[pg-codegen](https://github.com/constructive-io/constructive/tree/main/postgres/pg-codegen)** - TypeScript interfaces and classes generated from PostgreSQL tables
- **[@constructive-io/graphql-query](https://github.com/constructive-io/constructive/tree/main/graphql/query)** - Fluent GraphQL query builder for PostGraphile schemas with schema-aware introspection
- **[@constructive-io/query-builder](https://github.com/constructive-io/constructive/tree/main/packages/query-builder)** - TypeScript SQL query builder for SELECT, INSERT, UPDATE, DELETE with JOIN and GROUP BY support

### 🔁 File Streaming & Storage

- **[@constructive-io/s3-streamer](https://github.com/constructive-io/constructive/tree/main/streaming/s3-streamer)** - Direct S3 streaming with automatic content-type detection and metadata extraction
- **[etag-hash](https://github.com/constructive-io/constructive/tree/main/streaming/etag-hash)** - S3-compatible ETag computation for file integrity verification
- **[etag-stream](https://github.com/constructive-io/constructive/tree/main/streaming/etag-stream)** - Transform stream for computing ETags during upload
- **[uuid-hash](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-hash)** - Deterministic UUID generation from content hashing for deduplication
- **[uuid-stream](https://github.com/constructive-io/constructive/tree/main/streaming/uuid-stream)** - Streaming UUID generation based on piped file content
- **[upload-names](https://github.com/constructive-io/constructive/tree/main/streaming/upload-names)** - Collision-resistant filename generation for structured uploads
- **[content-type-stream](https://github.com/constructive-io/constructive/tree/main/streaming/content-type-stream)** - MIME type detection via magic bytes during streaming

### 🧠 SQL Parsing & AST Manipulation

- **[pgsql-parser](https://www.npmjs.com/package/pgsql-parser)** - SQL parsing and deparsing engine for PostgreSQL syntax conversion
- **[libpg-query-node](https://www.npmjs.com/package/libpg-query)** - Node.js bindings for libpg_query to convert SQL into parse trees
- **[pg-proto-parser](https://www.npmjs.com/package/pg-proto-parser)** - Protobuf parser for PostgreSQL Protocol Buffers with TypeScript generation
- **[pg-ast](https://www.npmjs.com/package/pg-ast)** - AST construction and transformation utilities for Postgres query structures
- **[@pgsql/types](https://www.npmjs.com/package/@pgsql/types)** - TypeScript type definitions for PostgreSQL AST nodes
- **[@pgsql/enums](https://www.npmjs.com/package/@pgsql/enums)** - TypeScript enums for PostgreSQL AST for safe parsing logic
- **[@pgsql/utils](https://www.npmjs.com/package/@pgsql/utils)** - AST manipulation utilities for constructing and transforming syntax trees

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
