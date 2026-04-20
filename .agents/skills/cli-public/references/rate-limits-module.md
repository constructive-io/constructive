# rateLimitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RateLimitsModule records via csdk CLI

## Usage

```bash
csdk rate-limits-module list
csdk rate-limits-module list --where.<field>.<op> <value> --orderBy <values>
csdk rate-limits-module list --limit 10 --after <cursor>
csdk rate-limits-module find-first --where.<field>.<op> <value>
csdk rate-limits-module get --id <UUID>
csdk rate-limits-module create --databaseId <UUID> [--schemaId <UUID>] [--rateLimitSettingsTableId <UUID>] [--ipRateLimitsTableId <UUID>] [--rateLimitsTableId <UUID>] [--rateLimitSettingsTable <String>] [--ipRateLimitsTable <String>] [--rateLimitsTable <String>]
csdk rate-limits-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--rateLimitSettingsTableId <UUID>] [--ipRateLimitsTableId <UUID>] [--rateLimitsTableId <UUID>] [--rateLimitSettingsTable <String>] [--ipRateLimitsTable <String>] [--rateLimitsTable <String>]
csdk rate-limits-module delete --id <UUID>
```

## Examples

### List rateLimitsModule records

```bash
csdk rate-limits-module list
```

### List rateLimitsModule records with pagination

```bash
csdk rate-limits-module list --limit 10 --offset 0
```

### List rateLimitsModule records with cursor pagination

```bash
csdk rate-limits-module list --limit 10 --after <cursor>
```

### Find first matching rateLimitsModule

```bash
csdk rate-limits-module find-first --where.id.equalTo <value>
```

### List rateLimitsModule records with field selection

```bash
csdk rate-limits-module list --select id,id
```

### List rateLimitsModule records with filtering and ordering

```bash
csdk rate-limits-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a rateLimitsModule

```bash
csdk rate-limits-module create --databaseId <UUID> [--schemaId <UUID>] [--rateLimitSettingsTableId <UUID>] [--ipRateLimitsTableId <UUID>] [--rateLimitsTableId <UUID>] [--rateLimitSettingsTable <String>] [--ipRateLimitsTable <String>] [--rateLimitsTable <String>]
```

### Get a rateLimitsModule by id

```bash
csdk rate-limits-module get --id <value>
```
