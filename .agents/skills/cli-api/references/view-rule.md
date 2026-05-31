# viewRule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ViewRule records via csdk CLI

## Usage

```bash
csdk view-rule list
csdk view-rule list --where.<field>.<op> <value> --orderBy <values>
csdk view-rule list --limit 10 --after <cursor>
csdk view-rule find-first --where.<field>.<op> <value>
csdk view-rule get --id <UUID>
csdk view-rule create --viewId <UUID> --name <String> --event <String> [--databaseId <UUID>] [--action <String>]
csdk view-rule update --id <UUID> [--databaseId <UUID>] [--viewId <UUID>] [--name <String>] [--event <String>] [--action <String>]
csdk view-rule delete --id <UUID>
```

## Examples

### List viewRule records

```bash
csdk view-rule list
```

### List viewRule records with pagination

```bash
csdk view-rule list --limit 10 --offset 0
```

### List viewRule records with cursor pagination

```bash
csdk view-rule list --limit 10 --after <cursor>
```

### Find first matching viewRule

```bash
csdk view-rule find-first --where.id.equalTo <value>
```

### List viewRule records with field selection

```bash
csdk view-rule list --select id,id
```

### List viewRule records with filtering and ordering

```bash
csdk view-rule list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a viewRule

```bash
csdk view-rule create --viewId <UUID> --name <String> --event <String> [--databaseId <UUID>] [--action <String>]
```

### Get a viewRule by id

```bash
csdk view-rule get --id <value>
```
