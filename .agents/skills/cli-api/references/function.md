# function

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Function records via csdk CLI

## Usage

```bash
csdk function list
csdk function list --where.<field>.<op> <value> --orderBy <values>
csdk function list --limit 10 --after <cursor>
csdk function find-first --where.<field>.<op> <value>
csdk function get --id <UUID>
csdk function create --databaseId <UUID> --schemaId <UUID> --name <String>
csdk function update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--name <String>]
csdk function delete --id <UUID>
```

## Examples

### List function records

```bash
csdk function list
```

### List function records with pagination

```bash
csdk function list --limit 10 --offset 0
```

### List function records with cursor pagination

```bash
csdk function list --limit 10 --after <cursor>
```

### Find first matching function

```bash
csdk function find-first --where.id.equalTo <value>
```

### List function records with field selection

```bash
csdk function list --select id,id
```

### List function records with filtering and ordering

```bash
csdk function list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a function

```bash
csdk function create --databaseId <UUID> --schemaId <UUID> --name <String>
```

### Get a function by id

```bash
csdk function get --id <value>
```
