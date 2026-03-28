# checkConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CheckConstraint records via csdk CLI

## Usage

```bash
csdk check-constraint list
csdk check-constraint list --where.<field>.<op> <value> --orderBy <values>
csdk check-constraint list --limit 10 --after <cursor>
csdk check-constraint find-first --where.<field>.<op> <value>
csdk check-constraint get --id <UUID>
csdk check-constraint create --tableId <UUID> --fieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--type <String>] [--expr <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk check-constraint update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--type <String>] [--fieldIds <UUID>] [--expr <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk check-constraint delete --id <UUID>
```

## Examples

### List checkConstraint records

```bash
csdk check-constraint list
```

### List checkConstraint records with pagination

```bash
csdk check-constraint list --limit 10 --offset 0
```

### List checkConstraint records with cursor pagination

```bash
csdk check-constraint list --limit 10 --after <cursor>
```

### Find first matching checkConstraint

```bash
csdk check-constraint find-first --where.id.equalTo <value>
```

### List checkConstraint records with field selection

```bash
csdk check-constraint list --select id,id
```

### List checkConstraint records with filtering and ordering

```bash
csdk check-constraint list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a checkConstraint

```bash
csdk check-constraint create --tableId <UUID> --fieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--type <String>] [--expr <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a checkConstraint by id

```bash
csdk check-constraint get --id <value>
```
