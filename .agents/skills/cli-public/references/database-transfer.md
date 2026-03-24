# databaseTransfer

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseTransfer records via csdk CLI

## Usage

```bash
csdk database-transfer list
csdk database-transfer get --id <UUID>
csdk database-transfer create --databaseId <UUID> --targetOwnerId <UUID> --initiatedBy <UUID> [--sourceApproved <Boolean>] [--targetApproved <Boolean>] [--sourceApprovedAt <Datetime>] [--targetApprovedAt <Datetime>] [--status <String>] [--notes <String>] [--expiresAt <Datetime>] [--completedAt <Datetime>]
csdk database-transfer update --id <UUID> [--databaseId <UUID>] [--targetOwnerId <UUID>] [--sourceApproved <Boolean>] [--targetApproved <Boolean>] [--sourceApprovedAt <Datetime>] [--targetApprovedAt <Datetime>] [--status <String>] [--initiatedBy <UUID>] [--notes <String>] [--expiresAt <Datetime>] [--completedAt <Datetime>]
csdk database-transfer delete --id <UUID>
```

## Examples

### List all databaseTransfer records

```bash
csdk database-transfer list
```

### Create a databaseTransfer

```bash
csdk database-transfer create --databaseId <UUID> --targetOwnerId <UUID> --initiatedBy <UUID> [--sourceApproved <Boolean>] [--targetApproved <Boolean>] [--sourceApprovedAt <Datetime>] [--targetApprovedAt <Datetime>] [--status <String>] [--notes <String>] [--expiresAt <Datetime>] [--completedAt <Datetime>]
```

### Get a databaseTransfer by id

```bash
csdk database-transfer get --id <value>
```
