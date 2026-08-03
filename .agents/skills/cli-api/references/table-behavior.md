# tableBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for TableBehavior records via csdk CLI

## Usage

```bash
csdk table-behavior list
csdk table-behavior list --where.<field>.<op> <value> --orderBy <values>
csdk table-behavior list --limit 10 --after <cursor>
csdk table-behavior find-first --where.<field>.<op> <value>
csdk table-behavior get --id <UUID>
csdk table-behavior create --scope <String> --tableId <UUID> [--databaseId <UUID>] [--modifier <String>] [--sortOrder <Int>]
csdk table-behavior update --id <UUID> [--databaseId <UUID>] [--modifier <String>] [--scope <String>] [--sortOrder <Int>] [--tableId <UUID>]
csdk table-behavior delete --id <UUID>
```

## Examples

### List tableBehavior records

```bash
csdk table-behavior list
```

### List tableBehavior records with pagination

```bash
csdk table-behavior list --limit 10 --offset 0
```

### List tableBehavior records with cursor pagination

```bash
csdk table-behavior list --limit 10 --after <cursor>
```

### Find first matching tableBehavior

```bash
csdk table-behavior find-first --where.id.equalTo <value>
```

### List tableBehavior records with field selection

```bash
csdk table-behavior list --select id,id
```

### List tableBehavior records with filtering and ordering

```bash
csdk table-behavior list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a tableBehavior

```bash
csdk table-behavior create --scope <String> --tableId <UUID> [--databaseId <UUID>] [--modifier <String>] [--sortOrder <Int>]
```

### Get a tableBehavior by id

```bash
csdk table-behavior get --id <value>
```
