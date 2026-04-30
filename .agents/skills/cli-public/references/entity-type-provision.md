# entityTypeProvision

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for EntityTypeProvision records via csdk CLI

## Usage

```bash
csdk entity-type-provision list
csdk entity-type-provision list --where.<field>.<op> <value> --orderBy <values>
csdk entity-type-provision list --limit 10 --after <cursor>
csdk entity-type-provision find-first --where.<field>.<op> <value>
csdk entity-type-provision get --id <UUID>
csdk entity-type-provision create --databaseId <UUID> --name <String> --prefix <String> [--description <String>] [--parentEntity <String>] [--tableName <String>] [--isVisible <Boolean>] [--hasLimits <Boolean>] [--hasProfiles <Boolean>] [--hasLevels <Boolean>] [--hasStorage <Boolean>] [--hasInvites <Boolean>] [--storageConfig <JSON>] [--skipEntityPolicies <Boolean>] [--tableProvision <JSON>] [--outMembershipType <Int>] [--outEntityTableId <UUID>] [--outEntityTableName <String>] [--outInstalledModules <String>] [--outStorageModuleId <UUID>] [--outBucketsTableId <UUID>] [--outFilesTableId <UUID>] [--outInvitesModuleId <UUID>]
csdk entity-type-provision update --id <UUID> [--databaseId <UUID>] [--name <String>] [--prefix <String>] [--description <String>] [--parentEntity <String>] [--tableName <String>] [--isVisible <Boolean>] [--hasLimits <Boolean>] [--hasProfiles <Boolean>] [--hasLevels <Boolean>] [--hasStorage <Boolean>] [--hasInvites <Boolean>] [--storageConfig <JSON>] [--skipEntityPolicies <Boolean>] [--tableProvision <JSON>] [--outMembershipType <Int>] [--outEntityTableId <UUID>] [--outEntityTableName <String>] [--outInstalledModules <String>] [--outStorageModuleId <UUID>] [--outBucketsTableId <UUID>] [--outFilesTableId <UUID>] [--outInvitesModuleId <UUID>]
csdk entity-type-provision delete --id <UUID>
```

## Examples

### List entityTypeProvision records

```bash
csdk entity-type-provision list
```

### List entityTypeProvision records with pagination

```bash
csdk entity-type-provision list --limit 10 --offset 0
```

### List entityTypeProvision records with cursor pagination

```bash
csdk entity-type-provision list --limit 10 --after <cursor>
```

### Find first matching entityTypeProvision

```bash
csdk entity-type-provision find-first --where.id.equalTo <value>
```

### List entityTypeProvision records with field selection

```bash
csdk entity-type-provision list --select id,id
```

### List entityTypeProvision records with filtering and ordering

```bash
csdk entity-type-provision list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a entityTypeProvision

```bash
csdk entity-type-provision create --databaseId <UUID> --name <String> --prefix <String> [--description <String>] [--parentEntity <String>] [--tableName <String>] [--isVisible <Boolean>] [--hasLimits <Boolean>] [--hasProfiles <Boolean>] [--hasLevels <Boolean>] [--hasStorage <Boolean>] [--hasInvites <Boolean>] [--storageConfig <JSON>] [--skipEntityPolicies <Boolean>] [--tableProvision <JSON>] [--outMembershipType <Int>] [--outEntityTableId <UUID>] [--outEntityTableName <String>] [--outInstalledModules <String>] [--outStorageModuleId <UUID>] [--outBucketsTableId <UUID>] [--outFilesTableId <UUID>] [--outInvitesModuleId <UUID>]
```

### Get a entityTypeProvision by id

```bash
csdk entity-type-provision get --id <value>
```
