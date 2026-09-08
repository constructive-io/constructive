# redirect

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Redirect records via csdk CLI

## Usage

```bash
csdk redirect list
csdk redirect list --where.<field>.<op> <value> --orderBy <values>
csdk redirect list --limit 10 --after <cursor>
csdk redirect find-first --where.<field>.<op> <value>
csdk redirect get --id <UUID>
csdk redirect create --databaseId <UUID> --name <String> --toHost <String> [--preservePath <Boolean>] [--preserveQuery <Boolean>] [--statusCode <Int>] [--toPath <String>]
csdk redirect update --id <UUID> [--databaseId <UUID>] [--name <String>] [--preservePath <Boolean>] [--preserveQuery <Boolean>] [--statusCode <Int>] [--toHost <String>] [--toPath <String>]
csdk redirect delete --id <UUID>
```

## Examples

### List redirect records

```bash
csdk redirect list
```

### List redirect records with pagination

```bash
csdk redirect list --limit 10 --offset 0
```

### List redirect records with cursor pagination

```bash
csdk redirect list --limit 10 --after <cursor>
```

### Find first matching redirect

```bash
csdk redirect find-first --where.id.equalTo <value>
```

### List redirect records with field selection

```bash
csdk redirect list --select id,id
```

### List redirect records with filtering and ordering

```bash
csdk redirect list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a redirect

```bash
csdk redirect create --databaseId <UUID> --name <String> --toHost <String> [--preservePath <Boolean>] [--preserveQuery <Boolean>] [--statusCode <Int>] [--toPath <String>]
```

### Get a redirect by id

```bash
csdk redirect get --id <value>
```
