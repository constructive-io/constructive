# corsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CorsSetting records via csdk CLI

## Usage

```bash
csdk cors-setting list
csdk cors-setting list --where.<field>.<op> <value> --orderBy <values>
csdk cors-setting list --limit 10 --after <cursor>
csdk cors-setting find-first --where.<field>.<op> <value>
csdk cors-setting get --id <UUID>
csdk cors-setting create --databaseId <UUID> [--allowedOrigins <String>] [--apiId <UUID>]
csdk cors-setting update --id <UUID> [--allowedOrigins <String>] [--apiId <UUID>] [--databaseId <UUID>]
csdk cors-setting delete --id <UUID>
```

## Examples

### List corsSetting records

```bash
csdk cors-setting list
```

### List corsSetting records with pagination

```bash
csdk cors-setting list --limit 10 --offset 0
```

### List corsSetting records with cursor pagination

```bash
csdk cors-setting list --limit 10 --after <cursor>
```

### Find first matching corsSetting

```bash
csdk cors-setting find-first --where.id.equalTo <value>
```

### List corsSetting records with field selection

```bash
csdk cors-setting list --select id,id
```

### List corsSetting records with filtering and ordering

```bash
csdk cors-setting list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a corsSetting

```bash
csdk cors-setting create --databaseId <UUID> [--allowedOrigins <String>] [--apiId <UUID>]
```

### Get a corsSetting by id

```bash
csdk cors-setting get --id <value>
```
