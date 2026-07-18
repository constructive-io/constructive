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
csdk memberships-module create --databaseId <UUID> [--actorMaskCheck <String>] [--actorPermCheck <String>] [--actorTableId <UUID>] [--adminGrantsTableId <UUID>] [--adminGrantsTableName <String>] [--apiName <String>] [--defaultLimitsTableId <UUID>] [--defaultPermissionsTableId <UUID>] [--entityField <String>] [--entityIdsByMask <String>] [--entityIdsByPerm <String>] [--entityIdsFunction <String>] [--entityTableId <UUID>] [--entityTableOwnerId <UUID>] [--getOrgFn <String>] [--grantsTableId <UUID>] [--grantsTableName <String>] [--limitsTableId <UUID>] [--memberProfilesTableId <UUID>] [--membersTableId <UUID>] [--membersTableName <String>] [--membershipDefaultsTableId <UUID>] [--membershipDefaultsTableName <String>] [--membershipSettingsTableId <UUID>] [--membershipSettingsTableName <String>] [--membershipsTableId <UUID>] [--membershipsTableName <String>] [--ownerGrantsTableId <UUID>] [--ownerGrantsTableName <String>] [--permissionDefaultGrantsTableId <UUID>] [--permissionDefaultPermissionsTableId <UUID>] [--permissionsTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--sprtTableId <UUID>]
csdk memberships-module update --id <UUID> [--actorMaskCheck <String>] [--actorPermCheck <String>] [--actorTableId <UUID>] [--adminGrantsTableId <UUID>] [--adminGrantsTableName <String>] [--apiName <String>] [--databaseId <UUID>] [--defaultLimitsTableId <UUID>] [--defaultPermissionsTableId <UUID>] [--entityField <String>] [--entityIdsByMask <String>] [--entityIdsByPerm <String>] [--entityIdsFunction <String>] [--entityTableId <UUID>] [--entityTableOwnerId <UUID>] [--getOrgFn <String>] [--grantsTableId <UUID>] [--grantsTableName <String>] [--limitsTableId <UUID>] [--memberProfilesTableId <UUID>] [--membersTableId <UUID>] [--membersTableName <String>] [--membershipDefaultsTableId <UUID>] [--membershipDefaultsTableName <String>] [--membershipSettingsTableId <UUID>] [--membershipSettingsTableName <String>] [--membershipsTableId <UUID>] [--membershipsTableName <String>] [--ownerGrantsTableId <UUID>] [--ownerGrantsTableName <String>] [--permissionDefaultGrantsTableId <UUID>] [--permissionDefaultPermissionsTableId <UUID>] [--permissionsTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--sprtTableId <UUID>]
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
csdk memberships-module create --databaseId <UUID> [--actorMaskCheck <String>] [--actorPermCheck <String>] [--actorTableId <UUID>] [--adminGrantsTableId <UUID>] [--adminGrantsTableName <String>] [--apiName <String>] [--defaultLimitsTableId <UUID>] [--defaultPermissionsTableId <UUID>] [--entityField <String>] [--entityIdsByMask <String>] [--entityIdsByPerm <String>] [--entityIdsFunction <String>] [--entityTableId <UUID>] [--entityTableOwnerId <UUID>] [--getOrgFn <String>] [--grantsTableId <UUID>] [--grantsTableName <String>] [--limitsTableId <UUID>] [--memberProfilesTableId <UUID>] [--membersTableId <UUID>] [--membersTableName <String>] [--membershipDefaultsTableId <UUID>] [--membershipDefaultsTableName <String>] [--membershipSettingsTableId <UUID>] [--membershipSettingsTableName <String>] [--membershipsTableId <UUID>] [--membershipsTableName <String>] [--ownerGrantsTableId <UUID>] [--ownerGrantsTableName <String>] [--permissionDefaultGrantsTableId <UUID>] [--permissionDefaultPermissionsTableId <UUID>] [--permissionsTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--sprtTableId <UUID>]
```

### Get a membershipsModule by id

```bash
csdk memberships-module get --id <value>
```
