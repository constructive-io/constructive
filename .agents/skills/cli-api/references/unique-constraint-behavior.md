# uniqueConstraintBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UniqueConstraintBehavior records via csdk CLI

## Usage

```bash
csdk unique-constraint-behavior list
csdk unique-constraint-behavior list --where.<field>.<op> <value> --orderBy <values>
csdk unique-constraint-behavior list --limit 10 --after <cursor>
csdk unique-constraint-behavior find-first --where.<field>.<op> <value>
csdk unique-constraint-behavior get --id <UUID>
csdk unique-constraint-behavior create --scope <String> --uniqueConstraintId <UUID> [--databaseId <UUID>] [--modifier <String>] [--sortOrder <Int>]
csdk unique-constraint-behavior update --id <UUID> [--databaseId <UUID>] [--modifier <String>] [--scope <String>] [--sortOrder <Int>] [--uniqueConstraintId <UUID>]
csdk unique-constraint-behavior delete --id <UUID>
```

## Examples

### List uniqueConstraintBehavior records

```bash
csdk unique-constraint-behavior list
```

### List uniqueConstraintBehavior records with pagination

```bash
csdk unique-constraint-behavior list --limit 10 --offset 0
```

### List uniqueConstraintBehavior records with cursor pagination

```bash
csdk unique-constraint-behavior list --limit 10 --after <cursor>
```

### Find first matching uniqueConstraintBehavior

```bash
csdk unique-constraint-behavior find-first --where.id.equalTo <value>
```

### List uniqueConstraintBehavior records with field selection

```bash
csdk unique-constraint-behavior list --select id,id
```

### List uniqueConstraintBehavior records with filtering and ordering

```bash
csdk unique-constraint-behavior list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a uniqueConstraintBehavior

```bash
csdk unique-constraint-behavior create --scope <String> --uniqueConstraintId <UUID> [--databaseId <UUID>] [--modifier <String>] [--sortOrder <Int>]
```

### Get a uniqueConstraintBehavior by id

```bash
csdk unique-constraint-behavior get --id <value>
```
