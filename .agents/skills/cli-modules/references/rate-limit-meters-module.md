# rateLimitMetersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RateLimitMetersModule records via csdk CLI

## Usage

```bash
csdk rate-limit-meters-module list
csdk rate-limit-meters-module list --where.<field>.<op> <value> --orderBy <values>
csdk rate-limit-meters-module list --limit 10 --after <cursor>
csdk rate-limit-meters-module find-first --where.<field>.<op> <value>
csdk rate-limit-meters-module get --id <UUID>
csdk rate-limit-meters-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--rateLimitStateTableId <UUID>] [--rateLimitStateTableName <String>] [--rateLimitOverridesTableId <UUID>] [--rateLimitOverridesTableName <String>] [--rateWindowLimitsTableId <UUID>] [--rateWindowLimitsTableName <String>] [--checkRateLimitFunction <String>] [--prefix <String>] [--defaultPermissions <String>] [--apiName <String>] [--privateApiName <String>]
csdk rate-limit-meters-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--rateLimitStateTableId <UUID>] [--rateLimitStateTableName <String>] [--rateLimitOverridesTableId <UUID>] [--rateLimitOverridesTableName <String>] [--rateWindowLimitsTableId <UUID>] [--rateWindowLimitsTableName <String>] [--checkRateLimitFunction <String>] [--prefix <String>] [--defaultPermissions <String>] [--apiName <String>] [--privateApiName <String>]
csdk rate-limit-meters-module delete --id <UUID>
```

## Examples

### List rateLimitMetersModule records

```bash
csdk rate-limit-meters-module list
```

### List rateLimitMetersModule records with pagination

```bash
csdk rate-limit-meters-module list --limit 10 --offset 0
```

### List rateLimitMetersModule records with cursor pagination

```bash
csdk rate-limit-meters-module list --limit 10 --after <cursor>
```

### Find first matching rateLimitMetersModule

```bash
csdk rate-limit-meters-module find-first --where.id.equalTo <value>
```

### List rateLimitMetersModule records with field selection

```bash
csdk rate-limit-meters-module list --select id,id
```

### List rateLimitMetersModule records with filtering and ordering

```bash
csdk rate-limit-meters-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a rateLimitMetersModule

```bash
csdk rate-limit-meters-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--rateLimitStateTableId <UUID>] [--rateLimitStateTableName <String>] [--rateLimitOverridesTableId <UUID>] [--rateLimitOverridesTableName <String>] [--rateWindowLimitsTableId <UUID>] [--rateWindowLimitsTableName <String>] [--checkRateLimitFunction <String>] [--prefix <String>] [--defaultPermissions <String>] [--apiName <String>] [--privateApiName <String>]
```

### Get a rateLimitMetersModule by id

```bash
csdk rate-limit-meters-module get --id <value>
```
