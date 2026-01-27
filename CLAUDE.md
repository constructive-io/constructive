# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build all packages (dev mode - faster, no optimizations)
pnpm build:dev

# Lint all packages (auto-fix enabled)
pnpm lint

# Clean build artifacts
pnpm clean

# Update dependencies interactively
pnpm deps
```

### Per-Package Commands

Navigate to any package directory (e.g., `cd pgpm/cli`) and run:

```bash
pnpm build        # Build the package
pnpm lint         # Lint with auto-fix
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm dev          # Run in development mode (where available)
```

### Running a Single Test File

```bash
cd packages/cli
pnpm test -- path/to/test.test.ts
# or with pattern matching:
pnpm test -- --testNamePattern="test name pattern"
```

## Project Architecture

This is a **pnpm monorepo** using Lerna for versioning/publishing. The workspace is organized into domain-specific directories:

### Core Package Groups

| Directory | Purpose |
|-----------|---------|
| `pgpm/` | PostgreSQL Package Manager - CLI, core engine, types |
| `graphql/` | GraphQL layer - server, codegen, React hooks, testing |
| `graphile/` | PostGraphile plugins - filters, i18n, meta-schema, PostGIS |
| `postgres/` | PostgreSQL utilities - introspection, testing, seeding, AST |
| `packages/` | Shared utilities - CLI, ORM, query builder |
| `uploads/` | File streaming - S3, ETags, content-type detection |
| `jobs/` | Job scheduling and worker infrastructure |

### Key Packages

**pgpm (PostgreSQL Package Manager)**
- `pgpm/cli` - Main CLI tool (`pgpm` command)
- `pgpm/core` - Migration engine, dependency resolution, deployment

**GraphQL Stack**
- `graphql/server` - Express + PostGraphile API server
- `graphql/codegen` - SDK generator (React Query hooks or Prisma-like ORM)
- `graphql/query` - Fluent GraphQL query builder

**Testing Infrastructure**
- `postgres/pgsql-test` - Isolated PostgreSQL test environments with transaction rollback
- `graphile/graphile-test` - GraphQL testing utilities

### Testing Pattern

Tests use `pgsql-test` for database testing with per-test transaction rollback:

```typescript
import { getConnections } from 'pgsql-test';

let db, teardown;

beforeAll(async () => {
  ({ db, teardown } = await getConnections());
});

beforeEach(() => db.beforeEach());
afterEach(() => db.afterEach());
afterAll(() => teardown());

test('example', async () => {
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': '123' });
  const result = await db.query('SELECT current_user_id()');
  expect(result.rows[0].current_user_id).toBe('123');
});
```

### Database Configuration

Tests require PostgreSQL. Standard PG environment variables:
- `PGHOST` (default: localhost)
- `PGPORT` (default: 5432)
- `PGUSER` (default: postgres)
- `PGPASSWORD` (default: password)

For S3/MinIO tests: `MINIO_ENDPOINT`, `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_REGION`

### Build System

- Uses `makage` for TypeScript compilation (handles both CJS and ESM output)
- Jest with ts-jest for testing
- ESLint with TypeScript support
- Each package has its own `tsconfig.json` extending root config

### Code Conventions

- TypeScript with `strict: true` (but `strictNullChecks: false`)
- Target: ES2022, Module: CommonJS
- Packages publish to npm from `dist/` directory
- Workspace dependencies use `workspace:^` protocol
