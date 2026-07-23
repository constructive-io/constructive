# trigger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Trigger records via csdk CLI

## Usage

```bash
csdk trigger list
csdk trigger list --where.<field>.<op> <value> --orderBy <values>
csdk trigger list --limit 10 --after <cursor>
csdk trigger find-first --where.<field>.<op> <value>
csdk trigger get --id <UUID>
csdk trigger create --name <String> --tableId <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--event <String>] [--events <String>] [--forEach <String>] [--functionName <String>] [--smartTags <JSON>] [--tags <String>] [--timing <String>] [--transitionNewName <String>] [--transitionOldName <String>] [--whenClause <JSON>]
csdk trigger update --id <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--event <String>] [--events <String>] [--forEach <String>] [--functionName <String>] [--name <String>] [--smartTags <JSON>] [--tableId <UUID>] [--tags <String>] [--timing <String>] [--transitionNewName <String>] [--transitionOldName <String>] [--whenClause <JSON>]
csdk trigger delete --id <UUID>
```

## Examples

### List trigger records

```bash
csdk trigger list
```

### List trigger records with pagination

```bash
csdk trigger list --limit 10 --offset 0
```

### List trigger records with cursor pagination

```bash
csdk trigger list --limit 10 --after <cursor>
```

### Find first matching trigger

```bash
csdk trigger find-first --where.id.equalTo <value>
```

### List trigger records with field selection

```bash
csdk trigger list --select id,id
```

### List trigger records with filtering and ordering

```bash
csdk trigger list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a trigger

```bash
csdk trigger create --name <String> --tableId <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--event <String>] [--events <String>] [--forEach <String>] [--functionName <String>] [--smartTags <JSON>] [--tags <String>] [--timing <String>] [--transitionNewName <String>] [--transitionOldName <String>] [--whenClause <JSON>]
```

### Get a trigger by id

```bash
csdk trigger get --id <value>
```
