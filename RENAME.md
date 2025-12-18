# Constructive Rename Plan

This document outlines the comprehensive plan to rename all LaunchQL references to Constructive across the codebase, including reorganizing packages into logical folder groupings.

## Overview

The goal is to:
1. Replace all instances of "LaunchQL" and "launchql" with "Constructive" and "constructive"
2. Use the `@constructive-io` npm scope for packages
3. Reorganize packages into logical folder groupings (similar to how `graphile/` is organized)
4. Rename all `launchql-*` folders
5. Rename exported classes to use `GraphQL` prefix where appropriate

## Folder Reorganization

### Current Structure

```
constructive/
├── packages/           # All packages mixed together
├── graphile/           # Graphile plugins
├── jobs/               # Job system
├── functions/          # Cloud functions
└── sandbox/            # Development sandbox
```

### New Structure

```
constructive/
├── packages/           # Constructive CLI and misc packages
├── pgpm/               # NEW: PGPM (PostgreSQL Package Manager) packages
├── graphql/            # NEW: GraphQL-related packages
├── streaming/          # NEW: File streaming and S3 utilities
├── postgres/           # NEW: PostgreSQL-specific packages
├── graphile/           # Graphile plugins (unchanged)
├── jobs/               # Job system (unchanged)
├── functions/          # Cloud functions (unchanged)
└── sandbox/            # Development sandbox (unchanged)
```

### pnpm-workspace.yaml Update

```yaml
packages:
  - 'packages/*'
  - 'pgpm/*'
  - 'graphql/*'
  - 'streaming/*'
  - 'postgres/*'
  - 'graphile/*'
  - 'jobs/*'
  - 'functions/*'
  - 'sandbox/*'
```

## Package Moves and Renames

### graphql/ - GraphQL-Related Packages

| Current Location | New Location | Current Package Name | New Package Name |
|-----------------|--------------|---------------------|------------------|
| `packages/server` | `graphql/server` | `@launchql/server` | `@constructive-io/graphql-server` |
| `packages/explorer` | `graphql/explorer` | `@launchql/explorer` | `@constructive-io/graphql-explorer` |
| `packages/launchql-gen` | `graphql/codegen` | `@launchql/codegen` | `@constructive-io/graphql-codegen` |
| `packages/launchql-types` | `graphql/types` | `@launchql/types` | `@constructive-io/graphql-types` |
| `packages/launchql-env` | `graphql/env` | `@launchql/env` | `@constructive-io/graphql-env` |
| `packages/launchql-test` | `graphql/test` | `launchql-test` | `@constructive-io/graphql-test` |
| `packages/query` | `graphql/query` | `@launchql/query` | `@constructive-io/graphql-query` |
| `packages/react` | `graphql/react` | `@launchql/react` | `@constructive-io/graphql-react` |
| `packages/gql-ast` | `graphql/gql-ast` | `gql-ast` | `gql-ast` |

### streaming/ - File Streaming and S3 Utilities

| Current Location | New Location | Current Package Name | New Package Name |
|-----------------|--------------|---------------------|------------------|
| `packages/s3-streamer` | `streaming/s3-streamer` | `@launchql/s3-streamer` | `@constructive-io/s3-streamer` |
| `packages/s3-utils` | `streaming/s3-utils` | `@launchql/s3-utils` | `@constructive-io/s3-utils` |
| `packages/content-type-stream` | `streaming/content-type-stream` | `@launchql/content-type-stream` | `@constructive-io/content-type-stream` |
| `packages/upload-names` | `streaming/upload-names` | `@launchql/upload-names` | `@constructive-io/upload-names` |
| `packages/etag-hash` | `streaming/etag-hash` | `etag-hash` | `etag-hash` |
| `packages/etag-stream` | `streaming/etag-stream` | `etag-stream` | `etag-stream` |
| `packages/stream-to-etag` | `streaming/stream-to-etag` | `stream-to-etag` | `stream-to-etag` |
| `packages/uuid-hash` | `streaming/uuid-hash` | `uuid-hash` | `uuid-hash` |
| `packages/uuid-stream` | `streaming/uuid-stream` | `uuid-stream` | `uuid-stream` |
| `packages/mime-bytes` | `streaming/mime-bytes` | `mime-bytes` | `mime-bytes` |

### postgres/ - PostgreSQL-Specific Packages

| Current Location | New Location | Current Package Name | New Package Name |
|-----------------|--------------|---------------------|------------------|
| `packages/pg-ast` | `postgres/pg-ast` | `pg-ast` | `pg-ast` |
| `packages/pg-cache` | `postgres/pg-cache` | `pg-cache` | `pg-cache` |
| `packages/pg-codegen` | `postgres/pg-codegen` | `pg-codegen` | `pg-codegen` |
| `packages/pg-env` | `postgres/pg-env` | `pg-env` | `pg-env` |
| `packages/pg-query-context` | `postgres/pg-query-context` | `pg-query-context` | `pg-query-context` |
| `packages/introspectron` | `postgres/introspectron` | `introspectron` | `introspectron` |
| `packages/pgsql-test` | `postgres/pgsql-test` | `pgsql-test` | `pgsql-test` |
| `packages/supabase-test` | `postgres/supabase-test` | `supabase-test` | `supabase-test` |
| `packages/drizzle-orm-test` | `postgres/drizzle-orm-test` | `drizzle-orm-test` | `drizzle-orm-test` |

### pgpm/ - PGPM (PostgreSQL Package Manager) Packages

| Current Location | New Location | Current Package Name | New Package Name |
|-----------------|--------------|---------------------|------------------|
| `packages/core` | `pgpm/core` | `@pgpmjs/core` | `@pgpmjs/core` |
| `packages/pgpm` | `pgpm/pgpm` | `pgpm` | `pgpm` |
| `packages/types` | `pgpm/types` | `@pgpmjs/types` | `@pgpmjs/types` |
| `packages/env` | `pgpm/env` | `@pgpmjs/env` | `@pgpmjs/env` |
| `packages/logger` | `pgpm/logger` | `@pgpmjs/logger` | `@pgpmjs/logger` |
| `packages/server-utils` | `pgpm/server-utils` | `@pgpmjs/server-utils` | `@pgpmjs/server-utils` |

### packages/ - Constructive CLI and Misc Packages (Remain in packages/)

| Current Package Name | New Package Name | Notes |
|---------------------|------------------|-------|
| `@launchql/cli` | `@constructive-io/cli` | Rename only |
| `client` | `@constructive-io/client` | Rename only |
| `orm` | `@constructive-io/orm` | Rename only |
| `@launchql/query-builder` | `@constructive-io/query-builder` | Rename only |
| `@launchql/url-domains` | `@constructive-io/url-domains` | Rename only |

## CLI Binary Renames

| Current Binary | New Binary | Location |
|---------------|------------|----------|
| `lql` | `cnc` (shorthand) | `packages/cli/package.json` |
| `launchql` | `constructive` (full name) | `packages/cli/package.json` |

```json
// Before
"bin": {
  "lql": "index.js",
  "launchql": "index.js"
}

// After
"bin": {
  "cnc": "index.js",
  "constructive": "index.js"
}
```

Both `cnc` and `constructive` will be available as CLI commands, with `cnc` serving as the shorthand.

## Class and Type Renames

### Exported Classes

| Current Name | New Name | Location |
|-------------|----------|----------|
| `LaunchQLServer` | `GraphQLServer` | `graphql/server/src/server.ts` |
| `LaunchQLExplorer` | `GraphQLExplorer` | `graphql/explorer/src/server.ts` |

### TypeScript Interfaces and Types

| Current Name | New Name | Location |
|-------------|----------|----------|
| `LaunchQLOptions` | `ConstructiveOptions` | `graphql/types/src/constructive.ts` |
| `LaunchQLGraphQLOptions` | `ConstructiveGraphQLOptions` | `graphql/types/src/constructive.ts` |
| `LaunchQLAPIToken` | `ConstructiveAPIToken` | `graphql/server/src/middleware/types.ts` |
| `LaunchQLGenOptions` | `GraphQLCodegenOptions` | `graphql/codegen/src/options.ts` |

### Exported Constants and Functions

| Current Name | New Name | Location |
|-------------|----------|----------|
| `launchqlDefaults` | `constructiveDefaults` | `graphql/types/src/constructive.ts` |
| `launchqlGraphqlDefaults` | `constructiveGraphqlDefaults` | `graphql/types/src/constructive.ts` |
| `defaultLaunchQLGenOptions` | `defaultGraphQLCodegenOptions` | `graphql/codegen/src/options.ts` |
| `mergeLaunchQLGenOptions` | `mergeGraphQLCodegenOptions` | `graphql/codegen/src/options.ts` |

### React Hooks

| Current Name | New Name | Location |
|-------------|----------|----------|
| `useLaunchqlQuery` | `useConstructiveQuery` | `graphql/react/src/use-constructive-client.ts` |

## Source File Renames

| Current File | New File |
|-------------|----------|
| `packages/launchql-types/src/launchql.ts` | `graphql/types/src/constructive.ts` |
| `packages/react/src/use-launchql-client.ts` | `graphql/react/src/use-constructive-client.ts` |

## String Literals and Comments

### Powered-By Header

In `graphql/explorer/src/server.ts`:
```typescript
// Before
app.use(poweredBy('launchql'));

// After
app.use(poweredBy('constructive'));
```

### CLI Help Text

| File | Current Text | New Text |
|------|-------------|----------|
| `packages/cli/src/commands.ts` | `'lql', 'LaunchQL'` | `'constructive', 'Constructive'` |
| `packages/cli/src/commands/codegen.ts` | `LaunchQL Codegen:` | `Constructive GraphQL Codegen:` |
| `packages/cli/src/commands/server.ts` | `LaunchQL Server Command:` | `Constructive GraphQL Server:` |
| `packages/cli/src/commands/explorer.ts` | `LaunchQL Explorer Command:` | `Constructive GraphQL Explorer:` |
| `packages/cli/src/commands/get-graphql-schema.ts` | `LaunchQL Get GraphQL Schema:` | `Constructive Get GraphQL Schema:` |

### Log Messages

| File | Current Message | New Message |
|------|----------------|-------------|
| `packages/cli/src/commands/explorer.ts` | `LaunchQL Explorer Configuration` | `Constructive GraphQL Explorer Configuration` |
| `packages/cli/src/commands/server.ts` | `LaunchQL Server Configuration` | `Constructive GraphQL Server Configuration` |
| `packages/core/src/utils/debug.ts` | `LaunchQL Debug Summary` | `Constructive Debug Summary` |
| `packages/core/src/migrate/client.ts` | `LaunchQL migration schema` | `Constructive migration schema` |

### Error Messages

Update error messages in `pgpm/core/src/workspace/paths.ts` (after move):
- `"You must be in a LaunchQL workspace"` -> `"You must be in a pgpm workspace"`
- `"You must be in a LaunchQL module"` -> `"You must be in a pgpm module"`

## Package.json Updates

### Description Updates

| Package | Current Description | New Description |
|---------|--------------------|-----------------| 
| `@launchql/cli` | `LaunchQL CLI` | `Constructive CLI` |
| `@launchql/server` | `LaunchQL Server` | `Constructive GraphQL Server` |
| `@launchql/explorer` | `LaunchQL Explorer` | `Constructive GraphQL Explorer` |
| `@launchql/types` | `LaunchQL GraphQL/Graphile types...` | `Constructive GraphQL/Graphile types...` |
| `@launchql/env` | `LaunchQL environment configuration...` | `Constructive environment configuration...` |
| `@launchql/query` | `LaunchQL Query` | `Constructive GraphQL Query` |
| `@launchql/react` | `LaunchQL React` | `Constructive GraphQL React` |
| `launchql-test` | `LaunchQL Testing...` | `Constructive GraphQL Testing...` |

### Keywords Updates

Remove `launchql` keyword and add `constructive` keyword in all package.json files.

## Import Statement Updates

After renaming packages, all import statements need to be updated:

```typescript
// Before
import { LaunchQLOptions } from '@launchql/types';
import { getEnvOptions } from '@launchql/env';
import { LaunchQLServer } from '@launchql/server';

// After
import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { GraphQLServer } from '@constructive-io/graphql-server';
```

## Summary of Product Names

| Component | New Name |
|-----------|----------|
| CLI Tool | Constructive CLI |
| GraphQL Server | Constructive GraphQL Server |
| GraphQL Explorer | Constructive GraphQL Explorer |
| Code Generator | Constructive GraphQL Codegen |
| React Integration | Constructive GraphQL React |
| Query Builder | Constructive Query Builder |
| Testing Framework | Constructive GraphQL Test |

## Folder Summary

| Folder | Purpose | Package Count |
|--------|---------|---------------|
| `packages/` | Constructive CLI and misc packages | 5 |
| `pgpm/` | PGPM (PostgreSQL Package Manager) core, types, env, logger, server-utils | 6 |
| `graphql/` | GraphQL server, explorer, codegen, types, env, test, query, react, gql-ast | 9 |
| `streaming/` | S3, file streaming, etag, uuid, mime utilities | 10 |
| `postgres/` | PostgreSQL AST, cache, codegen, env, context, introspection, testing | 9 |
| `graphile/` | Graphile/PostGraphile plugins (unchanged) | 15 |
| `jobs/` | Job system packages (unchanged) | 9 |
| `functions/` | Cloud functions (unchanged) | 2 |
| `sandbox/` | Development sandbox (unchanged) | 4 |

## Implementation Order

1. **Phase 1: Create New Folder Structure**
   - Create `pgpm/`, `graphql/`, `streaming/`, `postgres/` directories
   - Update `pnpm-workspace.yaml`

2. **Phase 2: Move Packages**
   - Move packages to their new locations
   - Update package.json names and descriptions
   - Update internal workspace references

3. **Phase 3: Class and Type Renames**
   - Rename `LaunchQLServer` -> `GraphQLServer`
   - Rename `LaunchQLExplorer` -> `GraphQLExplorer`
   - Rename TypeScript interfaces and types
   - Rename exported constants and functions

4. **Phase 4: Import Updates**
   - Update all import statements across the codebase
   - Update internal package dependencies

5. **Phase 5: CLI and Binary Updates**
   - Update CLI binary names
   - Update CLI help text and usage messages

6. **Phase 6: String Literals and Comments**
   - Update log messages
   - Update error messages
   - Update powered-by headers

7. **Phase 7: Documentation**
   - Update README files
   - Update AGENTS.md files
   - Update CHANGELOG files
   - Update other documentation

8. **Phase 8: Testing**
   - Run full test suite
   - Verify all packages build correctly
   - Test CLI commands

## Notes

- The `@pgpmjs/*` packages (core, types, env, logger, server-utils, pgpm) are being moved to the new `pgpm/` folder but NOT renamed as they are part of the PGPM (PostgreSQL Package Manager) branding
- The `graphile-*` packages in the `graphile/` directory are NOT being renamed as they are Graphile ecosystem plugins
- Fixture files in `__fixtures__/` may contain LaunchQL references for testing purposes and should be evaluated case-by-case
- The `jobs/` and `functions/` directories remain unchanged as they are separate systems

## Documentation Updates

The following documentation files contain LaunchQL references and need updating:

- `README.md`
- `AGENTS.md`
- `DEVELOPMENT.md`
- `QUICKSTART.md`
- `FOOTER.md`
- `TODO.md`
- `packages/*/README.md`
- `packages/*/CHANGELOG.md`
- `packages/core/AGENTS.md`
- `packages/cli/AGENTS.md`
- `pgpm/*/README.md` (after move)
- `graphql/*/README.md` (after move)
- `streaming/*/README.md` (after move)
- `postgres/*/README.md` (after move)

## Test File Updates

Update test files that reference LaunchQL:
- `graphql/codegen/__tests__/options.test.ts` (after move)
- `packages/cli/__tests__/codegen.test.ts`
- `packages/core/__tests__/resolution/dependency-resolution-error-handling.test.ts`
