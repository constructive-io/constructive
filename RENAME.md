# Constructive Rename Plan

This document outlines the comprehensive plan to rename all LaunchQL references to Constructive across the codebase.

## Overview

The goal is to replace all instances of "LaunchQL" and "launchql" with "Constructive" and "constructive" respectively, using the `@constructive-io` npm scope for packages.

## Package Renames

### Core Packages (packages/)

| Current Package Name | New Package Name | Directory |
|---------------------|------------------|-----------|
| `@launchql/cli` | `@constructive-io/cli` | `packages/cli` |
| `@launchql/server` | `@constructive-io/graphql-server` | `packages/server` |
| `@launchql/explorer` | `@constructive-io/graphql-explorer` | `packages/explorer` |
| `@launchql/codegen` | `@constructive-io/graphql-codegen` | `packages/launchql-gen` |
| `@launchql/types` | `@constructive-io/graphql-types` | `packages/launchql-types` |
| `@launchql/env` | `@constructive-io/graphql-env` | `packages/launchql-env` |
| `@launchql/query` | `@constructive-io/graphql-query` | `packages/query` |
| `@launchql/query-builder` | `@constructive-io/query-builder` | `packages/query-builder` |
| `@launchql/react` | `@constructive-io/react` | `packages/react` |
| `@launchql/s3-streamer` | `@constructive-io/s3-streamer` | `packages/s3-streamer` |
| `@launchql/s3-utils` | `@constructive-io/s3-utils` | `packages/s3-utils` |
| `@launchql/upload-names` | `@constructive-io/upload-names` | `packages/upload-names` |
| `@launchql/url-domains` | `@constructive-io/url-domains` | `packages/url-domains` |
| `@launchql/content-type-stream` | `@constructive-io/content-type-stream` | `packages/content-type-stream` |
| `launchql-test` | `@constructive-io/graphql-test` | `packages/launchql-test` |

### Directory Renames (packages/)

| Current Directory | New Directory |
|------------------|---------------|
| `packages/launchql-gen` | `packages/graphql-codegen` |
| `packages/launchql-types` | `packages/graphql-types` |
| `packages/launchql-env` | `packages/graphql-env` |
| `packages/launchql-test` | `packages/graphql-test` |

## CLI Binary Renames

| Current Binary | New Binary | Location |
|---------------|------------|----------|
| `lql` | `constructive` | `packages/cli/package.json` |
| `launchql` | `constructive` | `packages/cli/package.json` |

The CLI package currently defines these binaries in `packages/cli/package.json`:
```json
"bin": {
  "lql": "index.js",
  "launchql": "index.js"
}
```

Should be changed to:
```json
"bin": {
  "constructive": "index.js"
}
```

## Class and Type Renames

### Exported Classes

| Current Name | New Name | Location |
|-------------|----------|----------|
| `LaunchQLServer` | `ConstructiveServer` | `packages/server/src/server.ts` |
| `LaunchQLExplorer` | `ConstructiveExplorer` | `packages/explorer/src/server.ts` |

### TypeScript Interfaces and Types

| Current Name | New Name | Location |
|-------------|----------|----------|
| `LaunchQLOptions` | `ConstructiveOptions` | `packages/launchql-types/src/launchql.ts` |
| `LaunchQLGraphQLOptions` | `ConstructiveGraphQLOptions` | `packages/launchql-types/src/launchql.ts` |
| `LaunchQLAPIToken` | `ConstructiveAPIToken` | `packages/server/src/middleware/types.ts` |
| `LaunchQLGenOptions` | `ConstructiveCodegenOptions` | `packages/launchql-gen/src/options.ts` |

### Exported Constants and Functions

| Current Name | New Name | Location |
|-------------|----------|----------|
| `launchqlDefaults` | `constructiveDefaults` | `packages/launchql-types/src/launchql.ts` |
| `launchqlGraphqlDefaults` | `constructiveGraphqlDefaults` | `packages/launchql-types/src/launchql.ts` |
| `defaultLaunchQLGenOptions` | `defaultConstructiveCodegenOptions` | `packages/launchql-gen/src/options.ts` |
| `mergeLaunchQLGenOptions` | `mergeConstructiveCodegenOptions` | `packages/launchql-gen/src/options.ts` |

### React Hooks

| Current Name | New Name | Location |
|-------------|----------|----------|
| `useLaunchqlQuery` | `useConstructiveQuery` | `packages/react/src/use-launchql-client.ts` |

The file `packages/react/src/use-launchql-client.ts` should be renamed to `packages/react/src/use-constructive-client.ts`.

## Source File Renames

| Current File | New File |
|-------------|----------|
| `packages/launchql-types/src/launchql.ts` | `packages/graphql-types/src/constructive.ts` |
| `packages/react/src/use-launchql-client.ts` | `packages/react/src/use-constructive-client.ts` |

## Configuration File References

### Config File Names

The workspace configuration file name referenced in documentation:
- `launchql.config.js` should be renamed to `constructive.config.js` (if applicable)

Note: The actual config file resolution is handled by `@pgpmjs/env` which uses `pgpm.json` and `pgpm.config.js`, so this may not require changes.

## String Literals and Comments

### Powered-By Header

In `packages/explorer/src/server.ts`:
```typescript
app.use(poweredBy('launchql'));
```
Should be changed to:
```typescript
app.use(poweredBy('constructive'));
```

### CLI Help Text

Update all CLI help text and usage messages that reference "LaunchQL":

| File | Current Text | New Text |
|------|-------------|----------|
| `packages/cli/src/commands.ts` | `'lql', 'LaunchQL'` | `'constructive', 'Constructive'` |
| `packages/cli/src/commands/codegen.ts` | `LaunchQL Codegen:` | `Constructive GraphQL Codegen:` |
| `packages/cli/src/commands/server.ts` | `LaunchQL Server Command:` | `Constructive GraphQL Server:` |
| `packages/cli/src/commands/explorer.ts` | `LaunchQL Explorer Command:` | `Constructive GraphQL Explorer:` |
| `packages/cli/src/commands/get-graphql-schema.ts` | `LaunchQL Get GraphQL Schema:` | `Constructive Get GraphQL Schema:` |

### Log Messages

Update log messages that reference "LaunchQL":

| File | Current Message | New Message |
|------|----------------|-------------|
| `packages/cli/src/commands/explorer.ts` | `LaunchQL Explorer Configuration` | `Constructive GraphQL Explorer Configuration` |
| `packages/cli/src/commands/server.ts` | `LaunchQL Server Configuration` | `Constructive GraphQL Server Configuration` |
| `packages/core/src/utils/debug.ts` | `LaunchQL Debug Summary` | `Constructive Debug Summary` |
| `packages/core/src/migrate/client.ts` | `LaunchQL migration schema` | `Constructive migration schema` |

### Error Messages

Update error messages in `packages/core/src/workspace/paths.ts`:
- `"You must be in a LaunchQL workspace"` -> `"You must be in a Constructive workspace"`
- `"You must be in a LaunchQL module"` -> `"You must be in a Constructive module"`

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
| `@launchql/react` | `LaunchQL React` | `Constructive React` |
| `launchql-test` | `LaunchQL Testing...` | `Constructive GraphQL Testing...` |

### Keywords Updates

Remove `launchql` keyword and add `constructive` keyword in all package.json files.

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

## Test File Updates

Update test files that reference LaunchQL:
- `packages/launchql-gen/__tests__/options.test.ts`
- `packages/cli/__tests__/codegen.test.ts`
- `packages/core/__tests__/resolution/dependency-resolution-error-handling.test.ts`

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
import { ConstructiveServer } from '@constructive-io/graphql-server';
```

## Summary of Product Names

| Component | New Name |
|-----------|----------|
| CLI Tool | Constructive CLI |
| GraphQL Server | Constructive GraphQL Server |
| GraphQL Explorer | Constructive GraphQL Explorer |
| Code Generator | Constructive GraphQL Codegen |
| React Integration | Constructive React |
| Query Builder | Constructive Query Builder |
| Testing Framework | Constructive GraphQL Test |

## Implementation Order

1. **Phase 1: Package Names and Directories**
   - Rename package directories
   - Update package.json names and descriptions
   - Update workspace references

2. **Phase 2: Class and Type Renames**
   - Rename exported classes
   - Rename TypeScript interfaces and types
   - Rename exported constants and functions

3. **Phase 3: Import Updates**
   - Update all import statements across the codebase
   - Update internal package dependencies

4. **Phase 4: CLI and Binary Updates**
   - Update CLI binary names
   - Update CLI help text and usage messages

5. **Phase 5: String Literals and Comments**
   - Update log messages
   - Update error messages
   - Update powered-by headers

6. **Phase 6: Documentation**
   - Update README files
   - Update AGENTS.md files
   - Update CHANGELOG files
   - Update other documentation

7. **Phase 7: Testing**
   - Run full test suite
   - Verify all packages build correctly
   - Test CLI commands

## Notes

- The `@pgpmjs/*` packages (core, types, env, logger, server-utils) are NOT being renamed as they are part of the PGPM (PostgreSQL Package Manager) branding which is separate from LaunchQL
- The `graphile-*` packages in the `graphile/` directory are NOT being renamed as they are Graphile ecosystem plugins
- Fixture files in `__fixtures__/` may contain LaunchQL references for testing purposes and should be evaluated case-by-case
