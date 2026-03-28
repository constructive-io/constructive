# database

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Database records via csdk CLI

## Usage

```bash
csdk database list
csdk database list --where.<field>.<op> <value> --orderBy <values>
csdk database list --limit 10 --after <cursor>
csdk database find-first --where.<field>.<op> <value>
csdk database get --id <UUID>
csdk database create [--ownerId <UUID>] [--schemaHash <String>] [--name <String>] [--label <String>] [--hash <UUID>]
csdk database update --id <UUID> [--ownerId <UUID>] [--schemaHash <String>] [--name <String>] [--label <String>] [--hash <UUID>]
csdk database delete --id <UUID>
```

## Examples

### List database records

```bash
csdk database list
```

### List database records with pagination

```bash
csdk database list --limit 10 --offset 0
```

### List database records with cursor pagination

```bash
csdk database list --limit 10 --after <cursor>
```

### Find first matching database

```bash
csdk database find-first --where.id.equalTo <value>
```

### List database records with field selection

```bash
csdk database list --select id,id
```

### List database records with filtering and ordering

```bash
csdk database list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a database

```bash
csdk database create [--ownerId <UUID>] [--schemaHash <String>] [--name <String>] [--label <String>] [--hash <UUID>]
```

### Get a database by id

```bash
csdk database get --id <value>
```
