# membershipsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for MembershipsModule records via csdk CLI

## Usage

```bash
csdk memberships-module list
csdk memberships-module list --where.<field>.<op> <value> --orderBy <values>
csdk memberships-module list --limit 10 --after <cursor>
csdk memberships-module find-first --where.<field>.<op> <value>
csdk memberships-module get --id <UUID>
csdk memberships-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--membershipsTableId <UUID>] [--membershipsTableName <String>] [--membersTableId <UUID>] [--membersTableName <String>] [--membershipDefaultsTableId <UUID>] [--membershipDefaultsTableName <String>] [--grantsTableId <UUID>] [--grantsTableName <String>] [--actorTableId <UUID>] [--limitsTableId <UUID>] [--defaultLimitsTableId <UUID>] [--permissionsTableId <UUID>] [--defaultPermissionsTableId <UUID>] [--sprtTableId <UUID>] [--adminGrantsTableId <UUID>] [--adminGrantsTableName <String>] [--ownerGrantsTableId <UUID>] [--ownerGrantsTableName <String>] [--entityTableId <UUID>] [--entityTableOwnerId <UUID>] [--prefix <String>] [--actorMaskCheck <String>] [--actorPermCheck <String>] [--entityIdsByMask <String>] [--entityIdsByPerm <String>] [--entityIdsFunction <String>]
csdk memberships-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--membershipsTableId <UUID>] [--membershipsTableName <String>] [--membersTableId <UUID>] [--membersTableName <String>] [--membershipDefaultsTableId <UUID>] [--membershipDefaultsTableName <String>] [--grantsTableId <UUID>] [--grantsTableName <String>] [--actorTableId <UUID>] [--limitsTableId <UUID>] [--defaultLimitsTableId <UUID>] [--permissionsTableId <UUID>] [--defaultPermissionsTableId <UUID>] [--sprtTableId <UUID>] [--adminGrantsTableId <UUID>] [--adminGrantsTableName <String>] [--ownerGrantsTableId <UUID>] [--ownerGrantsTableName <String>] [--membershipType <Int>] [--entityTableId <UUID>] [--entityTableOwnerId <UUID>] [--prefix <String>] [--actorMaskCheck <String>] [--actorPermCheck <String>] [--entityIdsByMask <String>] [--entityIdsByPerm <String>] [--entityIdsFunction <String>]
csdk memberships-module delete --id <UUID>
```

## Examples

### List membershipsModule records

```bash
csdk memberships-module list
```

### List membershipsModule records with pagination

```bash
csdk memberships-module list --limit 10 --offset 0
```

### List membershipsModule records with cursor pagination

```bash
csdk memberships-module list --limit 10 --after <cursor>
```

### Find first matching membershipsModule

```bash
csdk memberships-module find-first --where.id.equalTo <value>
```

### List membershipsModule records with field selection

```bash
csdk memberships-module list --select id,id
```

### List membershipsModule records with filtering and ordering

```bash
csdk memberships-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a membershipsModule

```bash
csdk memberships-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--membershipsTableId <UUID>] [--membershipsTableName <String>] [--membersTableId <UUID>] [--membersTableName <String>] [--membershipDefaultsTableId <UUID>] [--membershipDefaultsTableName <String>] [--grantsTableId <UUID>] [--grantsTableName <String>] [--actorTableId <UUID>] [--limitsTableId <UUID>] [--defaultLimitsTableId <UUID>] [--permissionsTableId <UUID>] [--defaultPermissionsTableId <UUID>] [--sprtTableId <UUID>] [--adminGrantsTableId <UUID>] [--adminGrantsTableName <String>] [--ownerGrantsTableId <UUID>] [--ownerGrantsTableName <String>] [--entityTableId <UUID>] [--entityTableOwnerId <UUID>] [--prefix <String>] [--actorMaskCheck <String>] [--actorPermCheck <String>] [--entityIdsByMask <String>] [--entityIdsByPerm <String>] [--entityIdsFunction <String>]
```

### Get a membershipsModule by id

```bash
csdk memberships-module get --id <value>
```
