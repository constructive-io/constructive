# index

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Index records via csdk CLI

## Usage

```bash
csdk index list
csdk index list --where.<field>.<op> <value> --orderBy <values>
csdk index list --limit 10 --after <cursor>
csdk index find-first --where.<field>.<op> <value>
csdk index get --id <UUID>
csdk index create --databaseId <UUID> --tableId <UUID> [--name <String>] [--fieldIds <UUID>] [--includeFieldIds <UUID>] [--accessMethod <String>] [--indexParams <JSON>] [--whereClause <JSON>] [--isUnique <Boolean>] [--options <JSON>] [--opClasses <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk index update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--fieldIds <UUID>] [--includeFieldIds <UUID>] [--accessMethod <String>] [--indexParams <JSON>] [--whereClause <JSON>] [--isUnique <Boolean>] [--options <JSON>] [--opClasses <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk index delete --id <UUID>
```

## Examples

### List index records

```bash
csdk index list
```

### List index records with pagination

```bash
csdk index list --limit 10 --offset 0
```

### List index records with cursor pagination

```bash
csdk index list --limit 10 --after <cursor>
```

### Find first matching index

```bash
csdk index find-first --where.id.equalTo <value>
```

### List index records with field selection

```bash
csdk index list --select id,id
```

### List index records with filtering and ordering

```bash
csdk index list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a index

```bash
csdk index create --databaseId <UUID> --tableId <UUID> [--name <String>] [--fieldIds <UUID>] [--includeFieldIds <UUID>] [--accessMethod <String>] [--indexParams <JSON>] [--whereClause <JSON>] [--isUnique <Boolean>] [--options <JSON>] [--opClasses <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a index by id

```bash
csdk index get --id <value>
```
