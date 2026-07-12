# dbPool

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DbPool records via csdk CLI

## Usage

```bash
csdk db-pool list
csdk db-pool list --where.<field>.<op> <value> --orderBy <values>
csdk db-pool list --limit 10 --after <cursor>
csdk db-pool find-first --where.<field>.<op> <value>
csdk db-pool get --id <UUID>
csdk db-pool create --presetSlug <String> [--presetCommitId <UUID>] [--databaseId <UUID>] [--status <String>] [--errorMessage <String>] [--expiresAt <Datetime>] [--claimedBy <UUID>] [--claimedAt <Datetime>] [--bootstrapStatus <String>] [--bootstrapError <String>]
csdk db-pool update --id <UUID> [--presetSlug <String>] [--presetCommitId <UUID>] [--databaseId <UUID>] [--status <String>] [--errorMessage <String>] [--expiresAt <Datetime>] [--claimedBy <UUID>] [--claimedAt <Datetime>] [--bootstrapStatus <String>] [--bootstrapError <String>]
csdk db-pool delete --id <UUID>
```

## Examples

### List dbPool records

```bash
csdk db-pool list
```

### List dbPool records with pagination

```bash
csdk db-pool list --limit 10 --offset 0
```

### List dbPool records with cursor pagination

```bash
csdk db-pool list --limit 10 --after <cursor>
```

### Find first matching dbPool

```bash
csdk db-pool find-first --where.id.equalTo <value>
```

### List dbPool records with field selection

```bash
csdk db-pool list --select id,id
```

### List dbPool records with filtering and ordering

```bash
csdk db-pool list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a dbPool

```bash
csdk db-pool create --presetSlug <String> [--presetCommitId <UUID>] [--databaseId <UUID>] [--status <String>] [--errorMessage <String>] [--expiresAt <Datetime>] [--claimedBy <UUID>] [--claimedAt <Datetime>] [--bootstrapStatus <String>] [--bootstrapError <String>]
```

### Get a dbPool by id

```bash
csdk db-pool get --id <value>
```
