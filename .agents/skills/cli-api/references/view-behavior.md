# viewBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ViewBehavior records via csdk CLI

## Usage

```bash
csdk view-behavior list
csdk view-behavior list --where.<field>.<op> <value> --orderBy <values>
csdk view-behavior list --limit 10 --after <cursor>
csdk view-behavior find-first --where.<field>.<op> <value>
csdk view-behavior get --id <UUID>
csdk view-behavior create --scope <String> --viewId <UUID> [--databaseId <UUID>] [--modifier <String>] [--sortOrder <Int>]
csdk view-behavior update --id <UUID> [--databaseId <UUID>] [--modifier <String>] [--scope <String>] [--sortOrder <Int>] [--viewId <UUID>]
csdk view-behavior delete --id <UUID>
```

## Examples

### List viewBehavior records

```bash
csdk view-behavior list
```

### List viewBehavior records with pagination

```bash
csdk view-behavior list --limit 10 --offset 0
```

### List viewBehavior records with cursor pagination

```bash
csdk view-behavior list --limit 10 --after <cursor>
```

### Find first matching viewBehavior

```bash
csdk view-behavior find-first --where.id.equalTo <value>
```

### List viewBehavior records with field selection

```bash
csdk view-behavior list --select id,id
```

### List viewBehavior records with filtering and ordering

```bash
csdk view-behavior list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a viewBehavior

```bash
csdk view-behavior create --scope <String> --viewId <UUID> [--databaseId <UUID>] [--modifier <String>] [--sortOrder <Int>]
```

### Get a viewBehavior by id

```bash
csdk view-behavior get --id <value>
```
