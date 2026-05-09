# databaseSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseSetting records via csdk CLI

## Usage

```bash
csdk database-setting list
csdk database-setting list --where.<field>.<op> <value> --orderBy <values>
csdk database-setting list --limit 10 --after <cursor>
csdk database-setting find-first --where.<field>.<op> <value>
csdk database-setting get --id <UUID>
csdk database-setting create --databaseId <UUID> [--enableAggregates <Boolean>] [--enablePostgis <Boolean>] [--enableSearch <Boolean>] [--enableDirectUploads <Boolean>] [--enablePresignedUploads <Boolean>] [--enableManyToMany <Boolean>] [--enableConnectionFilter <Boolean>] [--enableLtree <Boolean>] [--enableLlm <Boolean>] [--options <JSON>]
csdk database-setting update --id <UUID> [--databaseId <UUID>] [--enableAggregates <Boolean>] [--enablePostgis <Boolean>] [--enableSearch <Boolean>] [--enableDirectUploads <Boolean>] [--enablePresignedUploads <Boolean>] [--enableManyToMany <Boolean>] [--enableConnectionFilter <Boolean>] [--enableLtree <Boolean>] [--enableLlm <Boolean>] [--options <JSON>]
csdk database-setting delete --id <UUID>
```

## Examples

### List databaseSetting records

```bash
csdk database-setting list
```

### List databaseSetting records with pagination

```bash
csdk database-setting list --limit 10 --offset 0
```

### List databaseSetting records with cursor pagination

```bash
csdk database-setting list --limit 10 --after <cursor>
```

### Find first matching databaseSetting

```bash
csdk database-setting find-first --where.id.equalTo <value>
```

### List databaseSetting records with field selection

```bash
csdk database-setting list --select id,id
```

### List databaseSetting records with filtering and ordering

```bash
csdk database-setting list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseSetting

```bash
csdk database-setting create --databaseId <UUID> [--enableAggregates <Boolean>] [--enablePostgis <Boolean>] [--enableSearch <Boolean>] [--enableDirectUploads <Boolean>] [--enablePresignedUploads <Boolean>] [--enableManyToMany <Boolean>] [--enableConnectionFilter <Boolean>] [--enableLtree <Boolean>] [--enableLlm <Boolean>] [--options <JSON>]
```

### Get a databaseSetting by id

```bash
csdk database-setting get --id <value>
```
