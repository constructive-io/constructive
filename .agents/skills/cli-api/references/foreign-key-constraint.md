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
csdk foreign-key-constraint create --fieldIds <UUID> --refFieldIds <UUID> --refTableId <UUID> --tableId <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--deleteAction <String>] [--deleteSetFieldIds <UUID>] [--description <String>] [--initiallyDeferred <Boolean>] [--isDeferrable <Boolean>] [--name <String>] [--smartTags <JSON>] [--tags <String>] [--type <String>] [--updateAction <String>] [--withPeriod <Boolean>]
csdk foreign-key-constraint update --id <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--deleteAction <String>] [--deleteSetFieldIds <UUID>] [--description <String>] [--fieldIds <UUID>] [--initiallyDeferred <Boolean>] [--isDeferrable <Boolean>] [--name <String>] [--refFieldIds <UUID>] [--refTableId <UUID>] [--smartTags <JSON>] [--tableId <UUID>] [--tags <String>] [--type <String>] [--updateAction <String>] [--withPeriod <Boolean>]
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
csdk foreign-key-constraint create --fieldIds <UUID> --refFieldIds <UUID> --refTableId <UUID> --tableId <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--deleteAction <String>] [--deleteSetFieldIds <UUID>] [--description <String>] [--initiallyDeferred <Boolean>] [--isDeferrable <Boolean>] [--name <String>] [--smartTags <JSON>] [--tags <String>] [--type <String>] [--updateAction <String>] [--withPeriod <Boolean>]
```

### Get a foreignKeyConstraint by id

```bash
csdk foreign-key-constraint get --id <value>
```
