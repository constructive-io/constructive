# foreignKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ForeignKeyConstraint records via csdk CLI

## Usage

```bash
csdk foreign-key-constraint list
csdk foreign-key-constraint list --where.<field>.<op> <value> --orderBy <values>
csdk foreign-key-constraint list --limit 10 --after <cursor>
csdk foreign-key-constraint find-first --where.<field>.<op> <value>
csdk foreign-key-constraint get --id <UUID>
csdk foreign-key-constraint create --tableId <UUID> --fieldIds <UUID> --refTableId <UUID> --refFieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--description <String>] [--smartTags <JSON>] [--type <String>] [--deleteAction <String>] [--updateAction <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk foreign-key-constraint update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--description <String>] [--smartTags <JSON>] [--type <String>] [--fieldIds <UUID>] [--refTableId <UUID>] [--refFieldIds <UUID>] [--deleteAction <String>] [--updateAction <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk foreign-key-constraint delete --id <UUID>
```

## Examples

### List foreignKeyConstraint records

```bash
csdk foreign-key-constraint list
```

### List foreignKeyConstraint records with pagination

```bash
csdk foreign-key-constraint list --limit 10 --offset 0
```

### List foreignKeyConstraint records with cursor pagination

```bash
csdk foreign-key-constraint list --limit 10 --after <cursor>
```

### Find first matching foreignKeyConstraint

```bash
csdk foreign-key-constraint find-first --where.id.equalTo <value>
```

### List foreignKeyConstraint records with field selection

```bash
csdk foreign-key-constraint list --select id,id
```

### List foreignKeyConstraint records with filtering and ordering

```bash
csdk foreign-key-constraint list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a foreignKeyConstraint

```bash
csdk foreign-key-constraint create --tableId <UUID> --fieldIds <UUID> --refTableId <UUID> --refFieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--description <String>] [--smartTags <JSON>] [--type <String>] [--deleteAction <String>] [--updateAction <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a foreignKeyConstraint by id

```bash
csdk foreign-key-constraint get --id <value>
```
