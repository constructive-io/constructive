# viewGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ViewGrant records via csdk CLI

## Usage

```bash
csdk view-grant list
csdk view-grant list --where.<field>.<op> <value> --orderBy <values>
csdk view-grant list --limit 10 --after <cursor>
csdk view-grant find-first --where.<field>.<op> <value>
csdk view-grant get --id <UUID>
csdk view-grant create --viewId <UUID> --granteeName <String> --privilege <String> [--databaseId <UUID>] [--withGrantOption <Boolean>] [--isGrant <Boolean>]
csdk view-grant update --id <UUID> [--databaseId <UUID>] [--viewId <UUID>] [--granteeName <String>] [--privilege <String>] [--withGrantOption <Boolean>] [--isGrant <Boolean>]
csdk view-grant delete --id <UUID>
```

## Examples

### List viewGrant records

```bash
csdk view-grant list
```

### List viewGrant records with pagination

```bash
csdk view-grant list --limit 10 --offset 0
```

### List viewGrant records with cursor pagination

```bash
csdk view-grant list --limit 10 --after <cursor>
```

### Find first matching viewGrant

```bash
csdk view-grant find-first --where.id.equalTo <value>
```

### List viewGrant records with field selection

```bash
csdk view-grant list --select id,id
```

### List viewGrant records with filtering and ordering

```bash
csdk view-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a viewGrant

```bash
csdk view-grant create --viewId <UUID> --granteeName <String> --privilege <String> [--databaseId <UUID>] [--withGrantOption <Boolean>] [--isGrant <Boolean>]
```

### Get a viewGrant by id

```bash
csdk view-grant get --id <value>
```
