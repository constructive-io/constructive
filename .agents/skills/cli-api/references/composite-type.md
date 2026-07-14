# compositeType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CompositeType records via csdk CLI

## Usage

```bash
csdk composite-type list
csdk composite-type list --where.<field>.<op> <value> --orderBy <values>
csdk composite-type list --limit 10 --after <cursor>
csdk composite-type find-first --where.<field>.<op> <value>
csdk composite-type get --id <UUID>
csdk composite-type create --databaseId <UUID> --name <String> --schemaId <UUID> [--attributes <JSON>] [--category <ObjectCategory>] [--description <String>] [--label <String>] [--smartTags <JSON>] [--tags <String>]
csdk composite-type update --id <UUID> [--attributes <JSON>] [--category <ObjectCategory>] [--databaseId <UUID>] [--description <String>] [--label <String>] [--name <String>] [--schemaId <UUID>] [--smartTags <JSON>] [--tags <String>]
csdk composite-type delete --id <UUID>
```

## Examples

### List compositeType records

```bash
csdk composite-type list
```

### List compositeType records with pagination

```bash
csdk composite-type list --limit 10 --offset 0
```

### List compositeType records with cursor pagination

```bash
csdk composite-type list --limit 10 --after <cursor>
```

### Find first matching compositeType

```bash
csdk composite-type find-first --where.id.equalTo <value>
```

### List compositeType records with field selection

```bash
csdk composite-type list --select id,id
```

### List compositeType records with filtering and ordering

```bash
csdk composite-type list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a compositeType

```bash
csdk composite-type create --databaseId <UUID> --name <String> --schemaId <UUID> [--attributes <JSON>] [--category <ObjectCategory>] [--description <String>] [--label <String>] [--smartTags <JSON>] [--tags <String>]
```

### Get a compositeType by id

```bash
csdk composite-type get --id <value>
```
