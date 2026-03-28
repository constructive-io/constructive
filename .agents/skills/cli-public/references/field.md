# field

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Field records via csdk CLI

## Usage

```bash
csdk field list
csdk field list --where.<field>.<op> <value> --orderBy <values>
csdk field list --limit 10 --after <cursor>
csdk field find-first --where.<field>.<op> <value>
csdk field get --id <UUID>
csdk field create --tableId <UUID> --name <String> --type <String> [--databaseId <UUID>] [--label <String>] [--description <String>] [--smartTags <JSON>] [--isRequired <Boolean>] [--apiRequired <Boolean>] [--defaultValue <String>] [--defaultValueAst <JSON>] [--fieldOrder <Int>] [--regexp <String>] [--chk <JSON>] [--chkExpr <JSON>] [--min <Float>] [--max <Float>] [--tags <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>]
csdk field update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--label <String>] [--description <String>] [--smartTags <JSON>] [--isRequired <Boolean>] [--apiRequired <Boolean>] [--defaultValue <String>] [--defaultValueAst <JSON>] [--type <String>] [--fieldOrder <Int>] [--regexp <String>] [--chk <JSON>] [--chkExpr <JSON>] [--min <Float>] [--max <Float>] [--tags <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>]
csdk field delete --id <UUID>
```

## Examples

### List field records

```bash
csdk field list
```

### List field records with pagination

```bash
csdk field list --limit 10 --offset 0
```

### List field records with cursor pagination

```bash
csdk field list --limit 10 --after <cursor>
```

### Find first matching field

```bash
csdk field find-first --where.id.equalTo <value>
```

### List field records with field selection

```bash
csdk field list --select id,id
```

### List field records with filtering and ordering

```bash
csdk field list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a field

```bash
csdk field create --tableId <UUID> --name <String> --type <String> [--databaseId <UUID>] [--label <String>] [--description <String>] [--smartTags <JSON>] [--isRequired <Boolean>] [--apiRequired <Boolean>] [--defaultValue <String>] [--defaultValueAst <JSON>] [--fieldOrder <Int>] [--regexp <String>] [--chk <JSON>] [--chkExpr <JSON>] [--min <Float>] [--max <Float>] [--tags <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>]
```

### Get a field by id

```bash
csdk field get --id <value>
```
