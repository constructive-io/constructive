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
csdk check-constraint create --fieldIds <UUID> --tableId <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--expr <JSON>] [--name <String>] [--smartTags <JSON>] [--tags <String>] [--type <String>]
csdk check-constraint update --id <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--expr <JSON>] [--fieldIds <UUID>] [--name <String>] [--smartTags <JSON>] [--tableId <UUID>] [--tags <String>] [--type <String>]
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
csdk check-constraint create --fieldIds <UUID> --tableId <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--expr <JSON>] [--name <String>] [--smartTags <JSON>] [--tags <String>] [--type <String>]
```

### Get a checkConstraint by id

```bash
csdk check-constraint get --id <value>
```
