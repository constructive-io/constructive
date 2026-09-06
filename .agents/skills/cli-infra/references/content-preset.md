# contentPreset

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ContentPreset records via csdk CLI

## Usage

```bash
csdk content-preset list
csdk content-preset list --where.<field>.<op> <value> --orderBy <values>
csdk content-preset list --limit 10 --after <cursor>
csdk content-preset find-first --where.<field>.<op> <value>
csdk content-preset get --id <UUID>
csdk content-preset create --definition <JSON> --kind <String> --slug <String> [--active <Boolean>] [--commitId <UUID>] [--description <String>] [--label <String>] [--storeId <UUID>]
csdk content-preset update --id <UUID> [--active <Boolean>] [--commitId <UUID>] [--definition <JSON>] [--description <String>] [--kind <String>] [--label <String>] [--slug <String>] [--storeId <UUID>]
csdk content-preset delete --id <UUID>
```

## Examples

### List contentPreset records

```bash
csdk content-preset list
```

### List contentPreset records with pagination

```bash
csdk content-preset list --limit 10 --offset 0
```

### List contentPreset records with cursor pagination

```bash
csdk content-preset list --limit 10 --after <cursor>
```

### Find first matching contentPreset

```bash
csdk content-preset find-first --where.id.equalTo <value>
```

### List contentPreset records with field selection

```bash
csdk content-preset list --select id,id
```

### List contentPreset records with filtering and ordering

```bash
csdk content-preset list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a contentPreset

```bash
csdk content-preset create --definition <JSON> --kind <String> --slug <String> [--active <Boolean>] [--commitId <UUID>] [--description <String>] [--label <String>] [--storeId <UUID>]
```

### Get a contentPreset by id

```bash
csdk content-preset get --id <value>
```
