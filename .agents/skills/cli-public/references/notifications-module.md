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
csdk notifications-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--notificationsTableId <UUID>] [--eventsTableId <UUID>] [--preferencesTableId <UUID>] [--channelsTableId <UUID>] [--deliveryLogTableId <UUID>] [--ownerTableId <UUID>] [--userSettingsTableId <UUID>] [--organizationSettingsTableId <UUID>]
csdk notifications-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--notificationsTableId <UUID>] [--eventsTableId <UUID>] [--preferencesTableId <UUID>] [--channelsTableId <UUID>] [--deliveryLogTableId <UUID>] [--ownerTableId <UUID>] [--userSettingsTableId <UUID>] [--organizationSettingsTableId <UUID>]
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
csdk notifications-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--notificationsTableId <UUID>] [--eventsTableId <UUID>] [--preferencesTableId <UUID>] [--channelsTableId <UUID>] [--deliveryLogTableId <UUID>] [--ownerTableId <UUID>] [--userSettingsTableId <UUID>] [--organizationSettingsTableId <UUID>]
```

### Get a notificationsModule by id

```bash
csdk notifications-module get --id <value>
```
