# dbPreset

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DbPreset records via csdk CLI

## Usage

```bash
csdk db-preset list
csdk db-preset list --where.<field>.<op> <value> --orderBy <values>
csdk db-preset list --limit 10 --after <cursor>
csdk db-preset find-first --where.<field>.<op> <value>
csdk db-preset get --id <UUID>
csdk db-preset create --definition <JSON> --slug <String> [--active <Boolean>] [--commitId <UUID>] [--description <String>] [--label <String>] [--modulesHash <UUID>] [--storeId <UUID>]
csdk db-preset update --id <UUID> [--active <Boolean>] [--commitId <UUID>] [--definition <JSON>] [--description <String>] [--label <String>] [--modulesHash <UUID>] [--slug <String>] [--storeId <UUID>]
csdk db-preset delete --id <UUID>
```

## Examples

### List dbPreset records

```bash
csdk db-preset list
```

### List dbPreset records with pagination

```bash
csdk db-preset list --limit 10 --offset 0
```

### List dbPreset records with cursor pagination

```bash
csdk db-preset list --limit 10 --after <cursor>
```

### Find first matching dbPreset

```bash
csdk db-preset find-first --where.id.equalTo <value>
```

### List dbPreset records with field selection

```bash
csdk db-preset list --select id,id
```

### List dbPreset records with filtering and ordering

```bash
csdk db-preset list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a dbPreset

```bash
csdk db-preset create --definition <JSON> --slug <String> [--active <Boolean>] [--commitId <UUID>] [--description <String>] [--label <String>] [--modulesHash <UUID>] [--storeId <UUID>]
```

### Get a dbPreset by id

```bash
csdk db-preset get --id <value>
```
