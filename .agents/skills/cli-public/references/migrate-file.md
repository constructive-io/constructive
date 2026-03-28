# migrateFile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for MigrateFile records via csdk CLI

## Usage

```bash
csdk migrate-file list
csdk migrate-file list --where.<field>.<op> <value> --orderBy <values>
csdk migrate-file list --limit 10 --after <cursor>
csdk migrate-file find-first --where.<field>.<op> <value>
csdk migrate-file get --id <UUID>
csdk migrate-file create [--databaseId <UUID>] [--upload <Upload>]
csdk migrate-file update --id <UUID> [--databaseId <UUID>] [--upload <Upload>]
csdk migrate-file delete --id <UUID>
```

## Examples

### List migrateFile records

```bash
csdk migrate-file list
```

### List migrateFile records with pagination

```bash
csdk migrate-file list --limit 10 --offset 0
```

### List migrateFile records with cursor pagination

```bash
csdk migrate-file list --limit 10 --after <cursor>
```

### Find first matching migrateFile

```bash
csdk migrate-file find-first --where.id.equalTo <value>
```

### List migrateFile records with field selection

```bash
csdk migrate-file list --select id,id
```

### List migrateFile records with filtering and ordering

```bash
csdk migrate-file list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a migrateFile

```bash
csdk migrate-file create [--databaseId <UUID>] [--upload <Upload>]
```

### Get a migrateFile by id

```bash
csdk migrate-file get --id <value>
```
