# policy

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Policy records via csdk CLI

## Usage

```bash
csdk policy list
csdk policy list --where.<field>.<op> <value> --orderBy <values>
csdk policy list --limit 10 --after <cursor>
csdk policy find-first --where.<field>.<op> <value>
csdk policy get --id <UUID>
csdk policy create --tableId <UUID> [--databaseId <UUID>] [--name <String>] [--granteeName <String>] [--privilege <String>] [--permissive <Boolean>] [--disabled <Boolean>] [--policyType <String>] [--data <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk policy update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--granteeName <String>] [--privilege <String>] [--permissive <Boolean>] [--disabled <Boolean>] [--policyType <String>] [--data <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk policy delete --id <UUID>
```

## Examples

### List policy records

```bash
csdk policy list
```

### List policy records with pagination

```bash
csdk policy list --limit 10 --offset 0
```

### List policy records with cursor pagination

```bash
csdk policy list --limit 10 --after <cursor>
```

### Find first matching policy

```bash
csdk policy find-first --where.id.equalTo <value>
```

### List policy records with field selection

```bash
csdk policy list --select id,id
```

### List policy records with filtering and ordering

```bash
csdk policy list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a policy

```bash
csdk policy create --tableId <UUID> [--databaseId <UUID>] [--name <String>] [--granteeName <String>] [--privilege <String>] [--permissive <Boolean>] [--disabled <Boolean>] [--policyType <String>] [--data <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a policy by id

```bash
csdk policy get --id <value>
```
