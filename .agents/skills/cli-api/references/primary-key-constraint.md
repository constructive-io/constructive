# primaryKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PrimaryKeyConstraint records via csdk CLI

## Usage

```bash
csdk primary-key-constraint list
csdk primary-key-constraint list --where.<field>.<op> <value> --orderBy <values>
csdk primary-key-constraint list --limit 10 --after <cursor>
csdk primary-key-constraint find-first --where.<field>.<op> <value>
csdk primary-key-constraint get --id <UUID>
csdk primary-key-constraint create --tableId <UUID> --fieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--type <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk primary-key-constraint update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--type <String>] [--fieldIds <UUID>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk primary-key-constraint delete --id <UUID>
```

## Examples

### List primaryKeyConstraint records

```bash
csdk primary-key-constraint list
```

### List primaryKeyConstraint records with pagination

```bash
csdk primary-key-constraint list --limit 10 --offset 0
```

### List primaryKeyConstraint records with cursor pagination

```bash
csdk primary-key-constraint list --limit 10 --after <cursor>
```

### Find first matching primaryKeyConstraint

```bash
csdk primary-key-constraint find-first --where.id.equalTo <value>
```

### List primaryKeyConstraint records with field selection

```bash
csdk primary-key-constraint list --select id,id
```

### List primaryKeyConstraint records with filtering and ordering

```bash
csdk primary-key-constraint list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a primaryKeyConstraint

```bash
csdk primary-key-constraint create --tableId <UUID> --fieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--type <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a primaryKeyConstraint by id

```bash
csdk primary-key-constraint get --id <value>
```
