# tableGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for TableGrant records via csdk CLI

## Usage

```bash
csdk table-grant list
csdk table-grant list --where.<field>.<op> <value> --orderBy <values>
csdk table-grant list --limit 10 --after <cursor>
csdk table-grant find-first --where.<field>.<op> <value>
csdk table-grant get --id <UUID>
csdk table-grant create --tableId <UUID> --privilege <String> --granteeName <String> [--databaseId <UUID>] [--fieldIds <UUID>] [--isGrant <Boolean>]
csdk table-grant update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--privilege <String>] [--granteeName <String>] [--fieldIds <UUID>] [--isGrant <Boolean>]
csdk table-grant delete --id <UUID>
```

## Examples

### List tableGrant records

```bash
csdk table-grant list
```

### List tableGrant records with pagination

```bash
csdk table-grant list --limit 10 --offset 0
```

### List tableGrant records with cursor pagination

```bash
csdk table-grant list --limit 10 --after <cursor>
```

### Find first matching tableGrant

```bash
csdk table-grant find-first --where.id.equalTo <value>
```

### List tableGrant records with field selection

```bash
csdk table-grant list --select id,id
```

### List tableGrant records with filtering and ordering

```bash
csdk table-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a tableGrant

```bash
csdk table-grant create --tableId <UUID> --privilege <String> --granteeName <String> [--databaseId <UUID>] [--fieldIds <UUID>] [--isGrant <Boolean>]
```

### Get a tableGrant by id

```bash
csdk table-grant get --id <value>
```
