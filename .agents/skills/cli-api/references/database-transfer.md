# databaseTransfer

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseTransfer records via csdk CLI

## Usage

```bash
csdk database-transfer list
csdk database-transfer list --where.<field>.<op> <value> --orderBy <values>
csdk database-transfer list --limit 10 --after <cursor>
csdk database-transfer find-first --where.<field>.<op> <value>
csdk database-transfer get --id <UUID>
csdk database-transfer create --databaseId <UUID> --initiatedBy <UUID> --targetOwnerId <UUID> [--completedAt <Datetime>] [--expiresAt <Datetime>] [--notes <String>] [--sourceApproved <Boolean>] [--sourceApprovedAt <Datetime>] [--status <String>] [--targetApproved <Boolean>] [--targetApprovedAt <Datetime>]
csdk database-transfer update --id <UUID> [--completedAt <Datetime>] [--databaseId <UUID>] [--expiresAt <Datetime>] [--initiatedBy <UUID>] [--notes <String>] [--sourceApproved <Boolean>] [--sourceApprovedAt <Datetime>] [--status <String>] [--targetApproved <Boolean>] [--targetApprovedAt <Datetime>] [--targetOwnerId <UUID>]
csdk database-transfer delete --id <UUID>
```

## Examples

### List databaseTransfer records

```bash
csdk database-transfer list
```

### List databaseTransfer records with pagination

```bash
csdk database-transfer list --limit 10 --offset 0
```

### List databaseTransfer records with cursor pagination

```bash
csdk database-transfer list --limit 10 --after <cursor>
```

### Find first matching databaseTransfer

```bash
csdk database-transfer find-first --where.id.equalTo <value>
```

### List databaseTransfer records with field selection

```bash
csdk database-transfer list --select id,id
```

### List databaseTransfer records with filtering and ordering

```bash
csdk database-transfer list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseTransfer

```bash
csdk database-transfer create --databaseId <UUID> --initiatedBy <UUID> --targetOwnerId <UUID> [--completedAt <Datetime>] [--expiresAt <Datetime>] [--notes <String>] [--sourceApproved <Boolean>] [--sourceApprovedAt <Datetime>] [--status <String>] [--targetApproved <Boolean>] [--targetApprovedAt <Datetime>]
```

### Get a databaseTransfer by id

```bash
csdk database-transfer get --id <value>
```
