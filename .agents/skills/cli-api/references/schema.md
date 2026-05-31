# schema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Schema records via csdk CLI

## Usage

```bash
csdk schema list
csdk schema list --where.<field>.<op> <value> --orderBy <values>
csdk schema list --limit 10 --after <cursor>
csdk schema find-first --where.<field>.<op> <value>
csdk schema get --id <UUID>
csdk schema create --databaseId <UUID> --name <String> --schemaName <String> [--label <String>] [--description <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>] [--isPublic <Boolean>]
csdk schema update --id <UUID> [--databaseId <UUID>] [--name <String>] [--schemaName <String>] [--label <String>] [--description <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>] [--isPublic <Boolean>]
csdk schema delete --id <UUID>
```

## Examples

### List schema records

```bash
csdk schema list
```

### List schema records with pagination

```bash
csdk schema list --limit 10 --offset 0
```

### List schema records with cursor pagination

```bash
csdk schema list --limit 10 --after <cursor>
```

### Find first matching schema

```bash
csdk schema find-first --where.id.equalTo <value>
```

### List schema records with field selection

```bash
csdk schema list --select id,id
```

### List schema records with filtering and ordering

```bash
csdk schema list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a schema

```bash
csdk schema create --databaseId <UUID> --name <String> --schemaName <String> [--label <String>] [--description <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>] [--isPublic <Boolean>]
```

### Get a schema by id

```bash
csdk schema get --id <value>
```
