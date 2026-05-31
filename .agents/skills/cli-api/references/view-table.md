# viewTable

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ViewTable records via csdk CLI

## Usage

```bash
csdk view-table list
csdk view-table list --where.<field>.<op> <value> --orderBy <values>
csdk view-table list --limit 10 --after <cursor>
csdk view-table find-first --where.<field>.<op> <value>
csdk view-table get --id <UUID>
csdk view-table create --viewId <UUID> --tableId <UUID> [--joinOrder <Int>]
csdk view-table update --id <UUID> [--viewId <UUID>] [--tableId <UUID>] [--joinOrder <Int>]
csdk view-table delete --id <UUID>
```

## Examples

### List viewTable records

```bash
csdk view-table list
```

### List viewTable records with pagination

```bash
csdk view-table list --limit 10 --offset 0
```

### List viewTable records with cursor pagination

```bash
csdk view-table list --limit 10 --after <cursor>
```

### Find first matching viewTable

```bash
csdk view-table find-first --where.id.equalTo <value>
```

### List viewTable records with field selection

```bash
csdk view-table list --select id,id
```

### List viewTable records with filtering and ordering

```bash
csdk view-table list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a viewTable

```bash
csdk view-table create --viewId <UUID> --tableId <UUID> [--joinOrder <Int>]
```

### Get a viewTable by id

```bash
csdk view-table get --id <value>
```
