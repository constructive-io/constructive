# exclusionConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ExclusionConstraint records via csdk CLI

## Usage

```bash
csdk exclusion-constraint list
csdk exclusion-constraint list --where.<field>.<op> <value> --orderBy <values>
csdk exclusion-constraint list --limit 10 --after <cursor>
csdk exclusion-constraint find-first --where.<field>.<op> <value>
csdk exclusion-constraint get --id <UUID>
csdk exclusion-constraint create --tableId <UUID> [--accessMethod <String>] [--category <ObjectCategory>] [--databaseId <UUID>] [--elementExpr <JSON>] [--fieldIds <UUID>] [--name <String>] [--operators <String>] [--smartTags <JSON>] [--tags <String>] [--type <String>] [--whereClause <JSON>]
csdk exclusion-constraint update --id <UUID> [--accessMethod <String>] [--category <ObjectCategory>] [--databaseId <UUID>] [--elementExpr <JSON>] [--fieldIds <UUID>] [--name <String>] [--operators <String>] [--smartTags <JSON>] [--tableId <UUID>] [--tags <String>] [--type <String>] [--whereClause <JSON>]
csdk exclusion-constraint delete --id <UUID>
```

## Examples

### List exclusionConstraint records

```bash
csdk exclusion-constraint list
```

### List exclusionConstraint records with pagination

```bash
csdk exclusion-constraint list --limit 10 --offset 0
```

### List exclusionConstraint records with cursor pagination

```bash
csdk exclusion-constraint list --limit 10 --after <cursor>
```

### Find first matching exclusionConstraint

```bash
csdk exclusion-constraint find-first --where.id.equalTo <value>
```

### List exclusionConstraint records with field selection

```bash
csdk exclusion-constraint list --select id,id
```

### List exclusionConstraint records with filtering and ordering

```bash
csdk exclusion-constraint list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a exclusionConstraint

```bash
csdk exclusion-constraint create --tableId <UUID> [--accessMethod <String>] [--category <ObjectCategory>] [--databaseId <UUID>] [--elementExpr <JSON>] [--fieldIds <UUID>] [--name <String>] [--operators <String>] [--smartTags <JSON>] [--tags <String>] [--type <String>] [--whereClause <JSON>]
```

### Get a exclusionConstraint by id

```bash
csdk exclusion-constraint get --id <value>
```
