# enum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Enum records via csdk CLI

## Usage

```bash
csdk enum list
csdk enum list --where.<field>.<op> <value> --orderBy <values>
csdk enum list --limit 10 --after <cursor>
csdk enum find-first --where.<field>.<op> <value>
csdk enum get --id <UUID>
csdk enum create --databaseId <UUID> --schemaId <UUID> --name <String> [--label <String>] [--description <String>] [--values <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk enum update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--name <String>] [--label <String>] [--description <String>] [--values <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk enum delete --id <UUID>
```

## Examples

### List enum records

```bash
csdk enum list
```

### List enum records with pagination

```bash
csdk enum list --limit 10 --offset 0
```

### List enum records with cursor pagination

```bash
csdk enum list --limit 10 --after <cursor>
```

### Find first matching enum

```bash
csdk enum find-first --where.id.equalTo <value>
```

### List enum records with field selection

```bash
csdk enum list --select id,id
```

### List enum records with filtering and ordering

```bash
csdk enum list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a enum

```bash
csdk enum create --databaseId <UUID> --schemaId <UUID> --name <String> [--label <String>] [--description <String>] [--values <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a enum by id

```bash
csdk enum get --id <value>
```
