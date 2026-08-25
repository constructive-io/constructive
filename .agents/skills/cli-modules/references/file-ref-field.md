# fileRefField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FileRefField records via csdk CLI

## Usage

```bash
csdk file-ref-field list
csdk file-ref-field list --where.<field>.<op> <value> --orderBy <values>
csdk file-ref-field list --limit 10 --after <cursor>
csdk file-ref-field find-first --where.<field>.<op> <value>
csdk file-ref-field get --id <UUID>
csdk file-ref-field create --databaseId <UUID> --fieldId <UUID> --storageModuleId <UUID> --tableId <UUID> [--bucketKey <String>] [--bucketTags <String>] [--enforceFk <Boolean>] [--isPublic <Boolean>]
csdk file-ref-field update --id <UUID> [--bucketKey <String>] [--bucketTags <String>] [--databaseId <UUID>] [--enforceFk <Boolean>] [--fieldId <UUID>] [--isPublic <Boolean>] [--storageModuleId <UUID>] [--tableId <UUID>]
csdk file-ref-field delete --id <UUID>
```

## Examples

### List fileRefField records

```bash
csdk file-ref-field list
```

### List fileRefField records with pagination

```bash
csdk file-ref-field list --limit 10 --offset 0
```

### List fileRefField records with cursor pagination

```bash
csdk file-ref-field list --limit 10 --after <cursor>
```

### Find first matching fileRefField

```bash
csdk file-ref-field find-first --where.id.equalTo <value>
```

### List fileRefField records with field selection

```bash
csdk file-ref-field list --select id,id
```

### List fileRefField records with filtering and ordering

```bash
csdk file-ref-field list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a fileRefField

```bash
csdk file-ref-field create --databaseId <UUID> --fieldId <UUID> --storageModuleId <UUID> --tableId <UUID> [--bucketKey <String>] [--bucketTags <String>] [--enforceFk <Boolean>] [--isPublic <Boolean>]
```

### Get a fileRefField by id

```bash
csdk file-ref-field get --id <value>
```
