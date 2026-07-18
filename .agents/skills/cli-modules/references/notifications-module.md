# notificationsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for NotificationsModule records via csdk CLI

## Usage

```bash
csdk notifications-module list
csdk notifications-module list --where.<field>.<op> <value> --orderBy <values>
csdk notifications-module list --limit 10 --after <cursor>
csdk notifications-module find-first --where.<field>.<op> <value>
csdk notifications-module get --id <UUID>
csdk notifications-module create --databaseId <UUID> [--apiName <String>] [--channelsTableId <UUID>] [--defaultPermissions <String>] [--deliveryLogTableId <UUID>] [--entityField <String>] [--hasChannels <Boolean>] [--hasDigestMetadata <Boolean>] [--hasPreferences <Boolean>] [--hasSettingsExtension <Boolean>] [--hasSubscriptions <Boolean>] [--notificationsTableId <UUID>] [--organizationSettingsTableId <UUID>] [--ownerTableId <UUID>] [--preferencesTableId <UUID>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--readStateTableId <UUID>] [--schemaId <UUID>] [--suppressionsTableId <UUID>] [--userSettingsTableId <UUID>]
csdk notifications-module update --id <UUID> [--apiName <String>] [--channelsTableId <UUID>] [--databaseId <UUID>] [--defaultPermissions <String>] [--deliveryLogTableId <UUID>] [--entityField <String>] [--hasChannels <Boolean>] [--hasDigestMetadata <Boolean>] [--hasPreferences <Boolean>] [--hasSettingsExtension <Boolean>] [--hasSubscriptions <Boolean>] [--notificationsTableId <UUID>] [--organizationSettingsTableId <UUID>] [--ownerTableId <UUID>] [--preferencesTableId <UUID>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--readStateTableId <UUID>] [--schemaId <UUID>] [--suppressionsTableId <UUID>] [--userSettingsTableId <UUID>]
csdk notifications-module delete --id <UUID>
```

## Examples

### List notificationsModule records

```bash
csdk notifications-module list
```

### List notificationsModule records with pagination

```bash
csdk notifications-module list --limit 10 --offset 0
```

### List notificationsModule records with cursor pagination

```bash
csdk notifications-module list --limit 10 --after <cursor>
```

### Find first matching notificationsModule

```bash
csdk notifications-module find-first --where.id.equalTo <value>
```

### List notificationsModule records with field selection

```bash
csdk notifications-module list --select id,id
```

### List notificationsModule records with filtering and ordering

```bash
csdk notifications-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a notificationsModule

```bash
csdk notifications-module create --databaseId <UUID> [--apiName <String>] [--channelsTableId <UUID>] [--defaultPermissions <String>] [--deliveryLogTableId <UUID>] [--entityField <String>] [--hasChannels <Boolean>] [--hasDigestMetadata <Boolean>] [--hasPreferences <Boolean>] [--hasSettingsExtension <Boolean>] [--hasSubscriptions <Boolean>] [--notificationsTableId <UUID>] [--organizationSettingsTableId <UUID>] [--ownerTableId <UUID>] [--preferencesTableId <UUID>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--readStateTableId <UUID>] [--schemaId <UUID>] [--suppressionsTableId <UUID>] [--userSettingsTableId <UUID>]
```

### Get a notificationsModule by id

```bash
csdk notifications-module get --id <value>
```
