# foreignKeyConstraintBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ForeignKeyConstraintBehavior records via csdk CLI

## Usage

```bash
csdk foreign-key-constraint-behavior list
csdk foreign-key-constraint-behavior list --where.<field>.<op> <value> --orderBy <values>
csdk foreign-key-constraint-behavior list --limit 10 --after <cursor>
csdk foreign-key-constraint-behavior find-first --where.<field>.<op> <value>
csdk foreign-key-constraint-behavior get --id <UUID>
csdk foreign-key-constraint-behavior create --foreignKeyConstraintId <UUID> --scope <String> [--databaseId <UUID>] [--modifier <String>] [--sortOrder <Int>]
csdk foreign-key-constraint-behavior update --id <UUID> [--databaseId <UUID>] [--foreignKeyConstraintId <UUID>] [--modifier <String>] [--scope <String>] [--sortOrder <Int>]
csdk foreign-key-constraint-behavior delete --id <UUID>
```

## Examples

### List foreignKeyConstraintBehavior records

```bash
csdk foreign-key-constraint-behavior list
```

### List foreignKeyConstraintBehavior records with pagination

```bash
csdk foreign-key-constraint-behavior list --limit 10 --offset 0
```

### List foreignKeyConstraintBehavior records with cursor pagination

```bash
csdk foreign-key-constraint-behavior list --limit 10 --after <cursor>
```

### Find first matching foreignKeyConstraintBehavior

```bash
csdk foreign-key-constraint-behavior find-first --where.id.equalTo <value>
```

### List foreignKeyConstraintBehavior records with field selection

```bash
csdk foreign-key-constraint-behavior list --select id,id
```

### List foreignKeyConstraintBehavior records with filtering and ordering

```bash
csdk foreign-key-constraint-behavior list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a foreignKeyConstraintBehavior

```bash
csdk foreign-key-constraint-behavior create --foreignKeyConstraintId <UUID> --scope <String> [--databaseId <UUID>] [--modifier <String>] [--sortOrder <Int>]
```

### Get a foreignKeyConstraintBehavior by id

```bash
csdk foreign-key-constraint-behavior get --id <value>
```
