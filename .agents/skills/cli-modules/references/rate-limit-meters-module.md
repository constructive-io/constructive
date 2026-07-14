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
csdk rate-limit-meters-module create --databaseId <UUID> [--apiName <String>] [--checkRateLimitFunction <String>] [--defaultPermissions <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--rateLimitOverridesTableId <UUID>] [--rateLimitOverridesTableName <String>] [--rateLimitStateTableId <UUID>] [--rateLimitStateTableName <String>] [--rateWindowLimitsTableId <UUID>] [--rateWindowLimitsTableName <String>] [--schemaId <UUID>]
csdk rate-limit-meters-module update --id <UUID> [--apiName <String>] [--checkRateLimitFunction <String>] [--databaseId <UUID>] [--defaultPermissions <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--rateLimitOverridesTableId <UUID>] [--rateLimitOverridesTableName <String>] [--rateLimitStateTableId <UUID>] [--rateLimitStateTableName <String>] [--rateWindowLimitsTableId <UUID>] [--rateWindowLimitsTableName <String>] [--schemaId <UUID>]
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
csdk rate-limit-meters-module create --databaseId <UUID> [--apiName <String>] [--checkRateLimitFunction <String>] [--defaultPermissions <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--rateLimitOverridesTableId <UUID>] [--rateLimitOverridesTableName <String>] [--rateLimitStateTableId <UUID>] [--rateLimitStateTableName <String>] [--rateWindowLimitsTableId <UUID>] [--rateWindowLimitsTableName <String>] [--schemaId <UUID>]
```

### Get a rateLimitMetersModule by id

```bash
csdk rate-limit-meters-module get --id <value>
```
