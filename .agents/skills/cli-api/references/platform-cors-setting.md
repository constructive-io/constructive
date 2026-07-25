# platformCorsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformCorsSetting records via csdk CLI

## Usage

```bash
csdk platform-cors-setting list
csdk platform-cors-setting list --where.<field>.<op> <value> --orderBy <values>
csdk platform-cors-setting list --limit 10 --after <cursor>
csdk platform-cors-setting find-first --where.<field>.<op> <value>
csdk platform-cors-setting get --id <UUID>
csdk platform-cors-setting create [--allowedOrigins <String>] [--apiId <UUID>]
csdk platform-cors-setting update --id <UUID> [--allowedOrigins <String>] [--apiId <UUID>]
csdk platform-cors-setting delete --id <UUID>
```

## Examples

### List platformCorsSetting records

```bash
csdk platform-cors-setting list
```

### List platformCorsSetting records with pagination

```bash
csdk platform-cors-setting list --limit 10 --offset 0
```

### List platformCorsSetting records with cursor pagination

```bash
csdk platform-cors-setting list --limit 10 --after <cursor>
```

### Find first matching platformCorsSetting

```bash
csdk platform-cors-setting find-first --where.id.equalTo <value>
```

### List platformCorsSetting records with field selection

```bash
csdk platform-cors-setting list --select id,id
```

### List platformCorsSetting records with filtering and ordering

```bash
csdk platform-cors-setting list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformCorsSetting

```bash
csdk platform-cors-setting create [--allowedOrigins <String>] [--apiId <UUID>]
```

### Get a platformCorsSetting by id

```bash
csdk platform-cors-setting get --id <value>
```
