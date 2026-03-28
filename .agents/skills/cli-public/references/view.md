# view

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for View records via csdk CLI

## Usage

```bash
csdk view list
csdk view list --where.<field>.<op> <value> --orderBy <values>
csdk view list --limit 10 --after <cursor>
csdk view find-first --where.<field>.<op> <value>
csdk view get --id <UUID>
csdk view create --schemaId <UUID> --name <String> --viewType <String> [--databaseId <UUID>] [--tableId <UUID>] [--data <JSON>] [--filterType <String>] [--filterData <JSON>] [--securityInvoker <Boolean>] [--isReadOnly <Boolean>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk view update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--name <String>] [--tableId <UUID>] [--viewType <String>] [--data <JSON>] [--filterType <String>] [--filterData <JSON>] [--securityInvoker <Boolean>] [--isReadOnly <Boolean>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk view delete --id <UUID>
```

## Examples

### List view records

```bash
csdk view list
```

### List view records with pagination

```bash
csdk view list --limit 10 --offset 0
```

### List view records with cursor pagination

```bash
csdk view list --limit 10 --after <cursor>
```

### Find first matching view

```bash
csdk view find-first --where.id.equalTo <value>
```

### List view records with field selection

```bash
csdk view list --select id,id
```

### List view records with filtering and ordering

```bash
csdk view list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a view

```bash
csdk view create --schemaId <UUID> --name <String> --viewType <String> [--databaseId <UUID>] [--tableId <UUID>] [--data <JSON>] [--filterType <String>] [--filterData <JSON>] [--securityInvoker <Boolean>] [--isReadOnly <Boolean>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a view by id

```bash
csdk view get --id <value>
```
