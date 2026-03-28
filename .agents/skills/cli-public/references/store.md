# store

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Store records via csdk CLI

## Usage

```bash
csdk store list
csdk store list --where.<field>.<op> <value> --orderBy <values>
csdk store list --limit 10 --after <cursor>
csdk store find-first --where.<field>.<op> <value>
csdk store get --id <UUID>
csdk store create --name <String> --databaseId <UUID> [--hash <UUID>]
csdk store update --id <UUID> [--name <String>] [--databaseId <UUID>] [--hash <UUID>]
csdk store delete --id <UUID>
```

## Examples

### List store records

```bash
csdk store list
```

### List store records with pagination

```bash
csdk store list --limit 10 --offset 0
```

### List store records with cursor pagination

```bash
csdk store list --limit 10 --after <cursor>
```

### Find first matching store

```bash
csdk store find-first --where.id.equalTo <value>
```

### List store records with field selection

```bash
csdk store list --select id,id
```

### List store records with filtering and ordering

```bash
csdk store list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a store

```bash
csdk store create --name <String> --databaseId <UUID> [--hash <UUID>]
```

### Get a store by id

```bash
csdk store get --id <value>
```
