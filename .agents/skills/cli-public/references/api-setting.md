# apiSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ApiSetting records via csdk CLI

## Usage

```bash
csdk api-setting list
csdk api-setting list --where.<field>.<op> <value> --orderBy <values>
csdk api-setting list --limit 10 --after <cursor>
csdk api-setting find-first --where.<field>.<op> <value>
csdk api-setting get --id <UUID>
csdk api-setting create --databaseId <UUID> --apiId <UUID> [--enableAggregates <Boolean>] [--enablePostgis <Boolean>] [--enableSearch <Boolean>] [--enableDirectUploads <Boolean>] [--enablePresignedUploads <Boolean>] [--enableManyToMany <Boolean>] [--enableConnectionFilter <Boolean>] [--enableLtree <Boolean>] [--enableLlm <Boolean>] [--enableRealtime <Boolean>] [--enableBulk <Boolean>] [--options <JSON>]
csdk api-setting update --id <UUID> [--databaseId <UUID>] [--apiId <UUID>] [--enableAggregates <Boolean>] [--enablePostgis <Boolean>] [--enableSearch <Boolean>] [--enableDirectUploads <Boolean>] [--enablePresignedUploads <Boolean>] [--enableManyToMany <Boolean>] [--enableConnectionFilter <Boolean>] [--enableLtree <Boolean>] [--enableLlm <Boolean>] [--enableRealtime <Boolean>] [--enableBulk <Boolean>] [--options <JSON>]
csdk api-setting delete --id <UUID>
```

## Examples

### List apiSetting records

```bash
csdk api-setting list
```

### List apiSetting records with pagination

```bash
csdk api-setting list --limit 10 --offset 0
```

### List apiSetting records with cursor pagination

```bash
csdk api-setting list --limit 10 --after <cursor>
```

### Find first matching apiSetting

```bash
csdk api-setting find-first --where.id.equalTo <value>
```

### List apiSetting records with field selection

```bash
csdk api-setting list --select id,id
```

### List apiSetting records with filtering and ordering

```bash
csdk api-setting list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a apiSetting

```bash
csdk api-setting create --databaseId <UUID> --apiId <UUID> [--enableAggregates <Boolean>] [--enablePostgis <Boolean>] [--enableSearch <Boolean>] [--enableDirectUploads <Boolean>] [--enablePresignedUploads <Boolean>] [--enableManyToMany <Boolean>] [--enableConnectionFilter <Boolean>] [--enableLtree <Boolean>] [--enableLlm <Boolean>] [--enableRealtime <Boolean>] [--enableBulk <Boolean>] [--options <JSON>]
```

### Get a apiSetting by id

```bash
csdk api-setting get --id <value>
```
